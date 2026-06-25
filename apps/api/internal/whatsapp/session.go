package whatsapp

import (
	"sync"
	"time"
)

type SessionStore interface {
	Get(phone string) (*Session, bool)
	Set(phone string, s *Session)
	Delete(phone string)
}

const defaultTTL = 30 * time.Minute

type InMemoryStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	ttl      time.Duration
}

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

func (s *InMemoryStore) Set(phone string, sess *Session) {
	sess.UpdatedAt = time.Now()
	s.mu.Lock()
	s.sessions[phone] = sess
	s.mu.Unlock()
}

func (s *InMemoryStore) Delete(phone string) {
	s.mu.Lock()
	delete(s.sessions, phone)
	s.mu.Unlock()
}

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
