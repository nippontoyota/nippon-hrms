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
	LoadOpenSessions(ctx context.Context, phones []string) map[string]bool
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

func (s *PostgresSessionWindowStore) LoadOpenSessions(ctx context.Context, phones []string) map[string]bool {
	result := make(map[string]bool, len(phones))
	if len(phones) == 0 {
		return result
	}

	normalized := make([]string, 0, len(phones))
	seen := make(map[string]struct{}, len(phones))
	for _, p := range phones {
		p = normalizeSessionPhone(p)
		if p == "" {
			continue
		}
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		normalized = append(normalized, p)
	}
	for _, p := range normalized {
		result[p] = false
	}
	if len(normalized) == 0 {
		return result
	}

	cutoff := time.Now().Add(-sessionWindowDuration)
	rows, err := s.db.Query(ctx, `
		SELECT phone, last_inbound_at FROM whatsapp_conversations
		WHERE phone = ANY($1) AND last_inbound_at > $2
	`, normalized, cutoff)
	if err != nil {
		return result
	}
	defer rows.Close()

	for rows.Next() {
		var phone string
		var lastInbound time.Time
		if err := rows.Scan(&phone, &lastInbound); err != nil {
			continue
		}
		result[phone] = true
	}
	return result
}
