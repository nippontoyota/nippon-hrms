package whatsapp

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nippon-toyota/hrms/internal/leave"
)

type sessionSnapshot struct {
	State              State           `json:"state"`
	EmployeeID         string          `json:"employeeId,omitempty"`
	LastMenuSentAt     time.Time       `json:"lastMenuSentAt,omitempty"`
	LastPeriodPromptAt    time.Time       `json:"lastPeriodPromptAt,omitempty"`
	LastPayslipSentAt     time.Time       `json:"lastPayslipSentAt,omitempty"`
	LastLeaveTypePromptAt time.Time       `json:"lastLeaveTypePromptAt,omitempty"`
	LastLeaveSubmittedAt  time.Time       `json:"lastLeaveSubmittedAt,omitempty"`
	LastLeaveDateAt          time.Time `json:"lastLeaveDateAt,omitempty"`
	LastAcceptedLeaveInput   string    `json:"lastAcceptedLeaveInput,omitempty"`
	LastLeaveStepAt          time.Time `json:"lastLeaveStepAt,omitempty"`
	LastEndPromptAt          time.Time `json:"lastEndPromptAt,omitempty"`
	HasEndDateAttempt        bool      `json:"hasEndDateAttempt,omitempty"`
	LastStartMessageID       string    `json:"lastStartMessageId,omitempty"`
	LastReasonPromptAt       time.Time `json:"lastReasonPromptAt,omitempty"`
	LastLeaveReminderAt      time.Time `json:"lastLeaveReminderAt,omitempty"`
	LastOutboundAt           time.Time `json:"lastOutboundAt,omitempty"`
	LastOutboundText         string    `json:"lastOutboundText,omitempty"`
	UpdatedAt          time.Time       `json:"updatedAt,omitempty"`
	TempLeaveType      leave.LeaveType `json:"tempLeaveType,omitempty"`
	TempLeaveStart     string          `json:"tempLeaveStart,omitempty"`
	TempLeaveEnd       string          `json:"tempLeaveEnd,omitempty"`
	TempLeaveReason    string          `json:"tempLeaveReason,omitempty"`
	PendingRejectionLeaveID string   `json:"pendingRejectionLeaveId,omitempty"`
	LastRejectionPromptAt   time.Time `json:"lastRejectionPromptAt,omitempty"`
}

func snapshotFromSession(sess *Session) sessionSnapshot {
	return sessionSnapshot{
		State:              sess.State,
		EmployeeID:         sess.EmployeeID,
		LastMenuSentAt:     sess.LastMenuSentAt,
		LastPeriodPromptAt:    sess.LastPeriodPromptAt,
		LastPayslipSentAt:     sess.LastPayslipSentAt,
		LastLeaveTypePromptAt: sess.LastLeaveTypePromptAt,
		LastLeaveSubmittedAt:  sess.LastLeaveSubmittedAt,
		LastLeaveDateAt:         sess.LastLeaveDateAt,
		LastAcceptedLeaveInput:  sess.LastAcceptedLeaveInput,
		LastLeaveStepAt:         sess.LastLeaveStepAt,
		LastEndPromptAt:         sess.LastEndPromptAt,
		HasEndDateAttempt:       sess.HasEndDateAttempt,
		LastStartMessageID:      sess.LastStartMessageID,
		LastReasonPromptAt:      sess.LastReasonPromptAt,
		LastLeaveReminderAt:     sess.LastLeaveReminderAt,
		LastOutboundAt:          sess.LastOutboundAt,
		LastOutboundText:        sess.LastOutboundText,
		UpdatedAt:          sess.UpdatedAt,
		TempLeaveType:      sess.TempLeaveType,
		TempLeaveStart:     sess.TempLeaveStart,
		TempLeaveEnd:       sess.TempLeaveEnd,
		TempLeaveReason:    sess.TempLeaveReason,
		PendingRejectionLeaveID: sess.PendingRejectionLeaveID,
		LastRejectionPromptAt:   sess.LastRejectionPromptAt,
	}
}

func sessionFromSnapshot(phone string, snap sessionSnapshot) *Session {
	return &Session{
		Phone:              phone,
		State:              snap.State,
		EmployeeID:         snap.EmployeeID,
		LastMenuSentAt:     snap.LastMenuSentAt,
		LastPeriodPromptAt:    snap.LastPeriodPromptAt,
		LastPayslipSentAt:     snap.LastPayslipSentAt,
		LastLeaveTypePromptAt: snap.LastLeaveTypePromptAt,
		LastLeaveSubmittedAt:  snap.LastLeaveSubmittedAt,
		LastLeaveDateAt:         snap.LastLeaveDateAt,
		LastAcceptedLeaveInput:  snap.LastAcceptedLeaveInput,
		LastLeaveStepAt:         snap.LastLeaveStepAt,
		LastEndPromptAt:         snap.LastEndPromptAt,
		HasEndDateAttempt:       snap.HasEndDateAttempt,
		LastStartMessageID:      snap.LastStartMessageID,
		LastReasonPromptAt:      snap.LastReasonPromptAt,
		LastLeaveReminderAt:     snap.LastLeaveReminderAt,
		LastOutboundAt:          snap.LastOutboundAt,
		LastOutboundText:        snap.LastOutboundText,
		UpdatedAt:          snap.UpdatedAt,
		TempLeaveType:      snap.TempLeaveType,
		TempLeaveStart:     snap.TempLeaveStart,
		TempLeaveEnd:       snap.TempLeaveEnd,
		TempLeaveReason:    snap.TempLeaveReason,
		PendingRejectionLeaveID: snap.PendingRejectionLeaveID,
		LastRejectionPromptAt:   snap.LastRejectionPromptAt,
	}
}

type PostgresSessionStore struct {
	db  *pgxpool.Pool
	ttl time.Duration
	mu  sync.RWMutex
	cache map[string]*Session
}

func NewPostgresSessionStore(db *pgxpool.Pool, ttl time.Duration) *PostgresSessionStore {
	if ttl == 0 {
		ttl = defaultTTL
	}
	store := &PostgresSessionStore{
		db:    db,
		ttl:   ttl,
		cache: make(map[string]*Session),
	}
	go store.cleanup()
	return store
}

func (s *PostgresSessionStore) Get(phone string) (*Session, bool) {
	phone = normalizeSessionPhone(phone)
	if phone == "" {
		return nil, false
	}

	s.mu.RLock()
	if cached, ok := s.cache[phone]; ok && time.Since(cached.UpdatedAt) <= s.ttl {
		s.mu.RUnlock()
		return cached, true
	}
	s.mu.RUnlock()

	var raw []byte
	err := s.db.QueryRow(context.Background(), `
		SELECT flow_state FROM whatsapp_conversations WHERE phone = $1
	`, phone).Scan(&raw)
	if err != nil || len(raw) == 0 {
		return nil, false
	}

	var snap sessionSnapshot
	if err := json.Unmarshal(raw, &snap); err != nil {
		return nil, false
	}
	if !snap.UpdatedAt.IsZero() && time.Since(snap.UpdatedAt) > s.ttl {
		s.Delete(phone)
		return nil, false
	}

	sess := sessionFromSnapshot(phone, snap)
	s.mu.Lock()
	s.cache[phone] = sess
	s.mu.Unlock()
	return sess, true
}

func (s *PostgresSessionStore) Set(phone string, sess *Session) {
	phone = normalizeSessionPhone(phone)
	if phone == "" || sess == nil {
		return
	}

	sess.Phone = phone
	sess.UpdatedAt = time.Now()
	snap := snapshotFromSession(sess)
	raw, err := json.Marshal(snap)
	if err != nil {
		slog.Error("whatsapp session marshal failed", "phone", phone, "err", err)
		return
	}

	_, err = s.db.Exec(context.Background(), `
		INSERT INTO whatsapp_conversations (phone, flow_state, updated_at)
		VALUES ($1, $2::jsonb, NOW())
		ON CONFLICT (phone) DO UPDATE
		SET flow_state = EXCLUDED.flow_state, updated_at = NOW()
	`, phone, raw)
	if err != nil {
		slog.Error("whatsapp session persist failed, using memory cache", "phone", phone, "state", sess.State, "err", err)
	}

	s.mu.Lock()
	s.cache[phone] = sess
	s.mu.Unlock()
}

func (s *PostgresSessionStore) Delete(phone string) {
	phone = normalizeSessionPhone(phone)
	if phone == "" {
		return
	}

	_, _ = s.db.Exec(context.Background(), `
		UPDATE whatsapp_conversations
		SET flow_state = NULL, updated_at = NOW()
		WHERE phone = $1
	`, phone)

	s.mu.Lock()
	delete(s.cache, phone)
	s.mu.Unlock()
}

func (s *PostgresSessionStore) cleanup() {
	ticker := time.NewTicker(s.ttl / 2)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		for phone, sess := range s.cache {
			if time.Since(sess.UpdatedAt) > s.ttl {
				delete(s.cache, phone)
			}
		}
		s.mu.Unlock()
	}
}

func NewSessionStore(db *pgxpool.Pool) SessionStore {
	if db == nil {
		return NewInMemoryStore(0)
	}
	return NewPostgresSessionStore(db, 0)
}

// Ensure interface compliance at compile time.
var (
	_ SessionStore = (*InMemoryStore)(nil)
	_ SessionStore = (*PostgresSessionStore)(nil)
)
