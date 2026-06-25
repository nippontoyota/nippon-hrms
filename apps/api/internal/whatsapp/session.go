package whatsapp

import (
	"sync"
	"time"
)

// SessionStore is the interface for conversation session persistence.
// The in-memory implementation lives here; swap to a Redis-backed one
// by implementing the same interface without changing the service.
type SessionStore interface {
	Get(phone string) (*Session, bool)
	Set(phone string, s *Session)
	Delete(phone string)
}

// ─── InMemoryStore ────────────────────────────────────────────────────────────

const defaultTTL = 30 * time.Minute

// InMemoryStore is a goroutine-safe session store with TTL eviction.
type InMemoryStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	ttl      time.Duration
}

// NewInMemoryStore creates an InMemoryStore and starts a background
// cleanup goroutine that evicts stale sessions every ttl/2.
// Pass 0 for ttl to use the 30-minute default.
func NewInMemoryStore(ttl time.Duration) *InMemoryStore {
	if ttl == 0 {
		ttl = defaultTTL
	}
	store := &InMemoryStore{
		sessions: make(map[string]*Session),
		ttl:      ttl,
	}
	go store.cleanup()
	return store
}

// Get returns the session for phone, or (nil, false) if not found / expired.
func (s *InMemoryStore) Get(phone string) (*Session, bool) {
	s.mu.RLock()
	sess, ok := s.sessions[phone]
	s.mu.RUnlock()

	if !ok {
		return nil, false
	}
	if time.Since(sess.UpdatedAt) > s.ttl {
		s.Delete(phone)
		return nil, false
	}
	return sess, true
}

// Set upserts the session for phone and stamps it with the current time.
func (s *InMemoryStore) Set(phone string, sess *Session) {
	sess.UpdatedAt = time.Now()
	s.mu.Lock()
	s.sessions[phone] = sess
	s.mu.Unlock()
}

// Delete removes the session for phone.
func (s *InMemoryStore) Delete(phone string) {
	s.mu.Lock()
	delete(s.sessions, phone)
	s.mu.Unlock()
}

// cleanup runs in the background and evicts sessions that have exceeded TTL.
func (s *InMemoryStore) cleanup() {
	ticker := time.NewTicker(s.ttl / 2)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		for phone, sess := range s.sessions {
			if time.Since(sess.UpdatedAt) > s.ttl {
				delete(s.sessions, phone)
			}
		}
		s.mu.Unlock()
	}
}
