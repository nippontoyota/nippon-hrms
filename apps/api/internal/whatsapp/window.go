package whatsapp

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nippon-toyota/hrms/pkg/phone"
)

const sessionWindowDuration = 24 * time.Hour

type SessionWindowStore interface {
	RecordInbound(ctx context.Context, phone string) error
	IsSessionWindowOpen(ctx context.Context, phone string) bool
}

type PostgresSessionWindowStore struct {
	db *pgxpool.Pool
}

func NewPostgresSessionWindowStore(db *pgxpool.Pool) *PostgresSessionWindowStore {
	return &PostgresSessionWindowStore{db: db}
}

func normalizeSessionPhone(raw string) string {
	if e164 := phone.FormatWhatsAppE164(raw); e164 != "" {
		return e164
	}
	return raw
}

func (s *PostgresSessionWindowStore) RecordInbound(ctx context.Context, phone string) error {
	phone = normalizeSessionPhone(phone)
	if phone == "" {
		return nil
	}
	query := `
		INSERT INTO whatsapp_conversations (phone, last_inbound_at, updated_at)
		VALUES ($1, NOW(), NOW())
		ON CONFLICT (phone) DO UPDATE
		SET last_inbound_at = NOW(), updated_at = NOW()
	`
	_, err := s.db.Exec(ctx, query, phone)
	if err != nil {
		return fmt.Errorf("record inbound session window: %w", err)
	}
	return nil
}

func (s *PostgresSessionWindowStore) IsSessionWindowOpen(ctx context.Context, phone string) bool {
	phone = normalizeSessionPhone(phone)
	if phone == "" {
		return false
	}
	var lastInbound *time.Time
	err := s.db.QueryRow(ctx, `
		SELECT last_inbound_at FROM whatsapp_conversations WHERE phone = $1
	`, phone).Scan(&lastInbound)
	if err != nil || lastInbound == nil {
		return false
	}
	return time.Since(*lastInbound) < sessionWindowDuration
}
