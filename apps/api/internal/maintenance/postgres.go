package maintenance

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

// MatchLocation attempts to find a location by partial name match.
func (s *Store) MatchLocation(ctx context.Context, name string) (string, string, error) {
	var id, locName string
	err := s.db.QueryRow(ctx, `
		SELECT id, name FROM "Location" 
		WHERE name ILIKE $1 OR $1 ILIKE '%' || name || '%'
		LIMIT 1`,
		"%"+name+"%").Scan(&id, &locName)
	if err != nil {
		// fallback to Main Office or first location
		err = s.db.QueryRow(ctx, `SELECT id, name FROM "Location" LIMIT 1`).Scan(&id, &locName)
		if err != nil {
			return "", "", err
		}
	}
	return id, locName, nil
}

// MatchCategory attempts to find a category by partial name match.
func (s *Store) MatchCategory(ctx context.Context, name string) (string, string, error) {
	var id, catName string
	err := s.db.QueryRow(ctx, `
		SELECT id, name FROM "Category" 
		WHERE name ILIKE $1 OR $1 ILIKE '%' || name || '%'
		LIMIT 1`,
		"%"+name+"%").Scan(&id, &catName)
	if err != nil {
		// fallback to first category
		err = s.db.QueryRow(ctx, `SELECT id, name FROM "Category" LIMIT 1`).Scan(&id, &catName)
		if err != nil {
			return "", "", err
		}
	}
	return id, catName, nil
}

type TicketData struct {
	ReporterName string
	LocationID   string
	CategoryID   string
	Description  string
	Timestamp    int64
}

// CreateTicket inserts a new ticket based on WhatsApp payload.
func (s *Store) CreateTicket(ctx context.Context, data TicketData) (string, error) {
	// Generate ticket number: MT-YYYY-XXXX
	year := time.Now().Year()

	var sequence int
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(
			MAX(CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)), 
			0
		) + 1 
		FROM "Ticket" 
		WHERE ticket_number LIKE $1`,
		fmt.Sprintf("MT-%d-%%", year)).Scan(&sequence)
	if err != nil {
		sequence = 1
	}

	ticketNumber := fmt.Sprintf("MT-%d-%04d", year, sequence)

	var createdAt time.Time
	if data.Timestamp > 0 {
		createdAt = time.Unix(data.Timestamp, 0)
	} else {
		createdAt = time.Now()
	}

	var ticketID string
	err = s.db.QueryRow(ctx, `
		INSERT INTO "Ticket" (
			id, ticket_number, status, priority, 
			reporter_name, reporter_type, 
			location_id, category_id, description, 
			created_at, updated_at
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'MEDIUM', 
			$2, 'EMPLOYEE', 
			$3, $4, $5, 
			$6, $6
		) RETURNING id`,
		ticketNumber, data.ReporterName,
		data.LocationID, data.CategoryID, data.Description,
		createdAt).Scan(&ticketID)

	if err != nil {
		return "", fmt.Errorf("insert ticket: %w", err)
	}

	_, err = s.db.Exec(ctx, `
		INSERT INTO "TicketStatusHistory" (
			id, ticket_id, status, notes, created_at
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'Ticket created via WhatsApp Bot', $2
		)`, ticketID, createdAt)

	return ticketNumber, nil
}
