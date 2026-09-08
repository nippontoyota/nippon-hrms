package maintenance

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/pkg/phone"
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
		WHERE is_active = true AND (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
		ORDER BY CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END, length(name)
		LIMIT 1`,
		"%"+name+"%", strings.TrimSpace(name)).Scan(&id, &locName)
	if err != nil {
		err = s.db.QueryRow(ctx, `INSERT INTO "Location" (id, name, is_active, updated_at) VALUES (gen_random_uuid()::text, $1, true, CURRENT_TIMESTAMP) RETURNING id`, strings.TrimSpace(name)).Scan(&id)
		if err != nil {
			return "", "", fmt.Errorf("location %q not found and could not be created: %w", name, err)
		}
		return id, strings.TrimSpace(name), nil
	}
	return id, locName, nil
}

// MatchCategory attempts to find a category by partial name match.
func (s *Store) MatchCategory(ctx context.Context, name string) (string, string, error) {
	name = strings.TrimSpace(name)
	var id, catName string
	err := s.db.QueryRow(ctx, `
		SELECT id, name FROM "Category" 
		WHERE is_active = true AND (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
		ORDER BY CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END, length(name)
		LIMIT 1`,
		"%"+name+"%", name).Scan(&id, &catName)
	if err == pgx.ErrNoRows && name != "" {
		err = s.db.QueryRow(ctx, `
			INSERT INTO "Category" (id, name, type, is_active, created_at, updated_at)
			VALUES (gen_random_uuid()::text, $1, 'TICKET', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT (name) DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP
			RETURNING id, name`, name).Scan(&id, &catName)
	}
	if err != nil {
		return "", "", fmt.Errorf("category %q not found", name)
	}
	return id, catName, nil
}

type TicketData struct {
	BranchID        string
	ReporterName    string
	EmployeeID      string
	LocationID      string
	CategoryID      string
	Description     string
	Timestamp       int64
	ImageURL        string
	ImageCaption    string
	SourcePhone     string
	SourceMessageID string
}

type Branch struct {
	ID   string
	Name string
}

func (s *Store) ListActiveBranches(ctx context.Context) ([]Branch, error) {
	rows, err := s.db.Query(ctx, `SELECT id, name FROM "MaintenanceBranch" WHERE is_active = true ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list maintenance branches: %w", err)
	}
	defer rows.Close()
	branches := make([]Branch, 0, len(canonicalBranchNames))
	for rows.Next() {
		var branch Branch
		if err := rows.Scan(&branch.ID, &branch.Name); err != nil {
			return nil, err
		}
		if !IsCanonicalBranchName(branch.Name) {
			continue
		}
		branch.Name = CanonicalBranchName(branch.Name)
		branches = append(branches, branch)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	order := make(map[string]int, len(canonicalBranchNames))
	for index, name := range canonicalBranchNames {
		order[name] = index
	}
	sort.SliceStable(branches, func(i, j int) bool { return order[branches[i].Name] < order[branches[j].Name] })
	return branches, nil
}

func (s *Store) GetActiveBranch(ctx context.Context, id string) (Branch, error) {
	var branch Branch
	err := s.db.QueryRow(ctx, `SELECT id, name FROM "MaintenanceBranch" WHERE id = $1 AND is_active = true`, id).Scan(&branch.ID, &branch.Name)
	if err != nil {
		return Branch{}, fmt.Errorf("active maintenance branch not found: %w", err)
	}
	if !IsCanonicalBranchName(branch.Name) {
		return Branch{}, fmt.Errorf("maintenance branch is not configured: %s", branch.ID)
	}
	branch.Name = CanonicalBranchName(branch.Name)
	return branch, nil
}

// CreateTicket inserts a new ticket based on WhatsApp payload.
func (s *Store) CreateTicket(ctx context.Context, data TicketData) (string, error) {
	data.SourcePhone = phone.NormalizeIndian(data.SourcePhone)
	if data.SourcePhone == "" {
		return "", fmt.Errorf("maintenance ticket requires valid source phone")
	}
	data.ReporterName = strings.TrimSpace(data.ReporterName)
	if data.ReporterName == "" {
		data.ReporterName = "WhatsApp User"
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin ticket transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if data.SourceMessageID != "" {
		var existing string
		err = tx.QueryRow(ctx, `SELECT ticket_number FROM "Ticket" WHERE source_message_id = $1`, data.SourceMessageID).Scan(&existing)
		if err == nil {
			return existing, nil
		}
	}

	// Generate ticket number: MT-YYYY-XXXX
	year := time.Now().Year()
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, fmt.Sprintf("maintenance-ticket-%d", year)); err != nil {
		return "", fmt.Errorf("lock ticket sequence: %w", err)
	}
	if data.SourceMessageID != "" {
		var existing string
		if err = tx.QueryRow(ctx, `SELECT ticket_number FROM "Ticket" WHERE source_message_id = $1`, data.SourceMessageID).Scan(&existing); err == nil {
			return existing, nil
		}
	}

	var sequence int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(
			MAX(CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)), 
			0
		) + 1 
		FROM "Ticket" 
		WHERE ticket_number LIKE $1`,
		fmt.Sprintf("MT-%d-%%", year)).Scan(&sequence)
	if err != nil {
		return "", fmt.Errorf("generate ticket sequence: %w", err)
	}

	ticketNumber := fmt.Sprintf("MT-%d-%04d", year, sequence)

	var createdAt time.Time
	if data.Timestamp > 0 {
		createdAt = time.Unix(data.Timestamp, 0)
	} else {
		createdAt = time.Now()
	}

	var ticketID string
	err = tx.QueryRow(ctx, `
		INSERT INTO "Ticket" (
			id, ticket_number, status, priority, 
			reporter_name, reporter_type, 
			location_id, category_id, description, branch_id,
			created_at, updated_at, image_url, image_caption, source_phone, employee_id, source_message_id
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'MEDIUM', 
			$2, 'EMPLOYEE', 
			$3, $4, $5, $6,
			$7, $7, NULLIF($8, ''), NULLIF($9, ''), $10, NULLIF($11, ''), NULLIF($12, '')
		) RETURNING id`,
		ticketNumber, data.ReporterName,
		data.LocationID, data.CategoryID, data.Description, data.BranchID,
		createdAt, data.ImageURL, data.ImageCaption, data.SourcePhone, data.EmployeeID, data.SourceMessageID).Scan(&ticketID)

	if err != nil {
		return "", fmt.Errorf("insert ticket: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO "TicketStatusHistory" (
			id, ticket_id, status, notes, created_at
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'Ticket created via WhatsApp Bot', $2
		)`, ticketID, createdAt)

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit ticket: %w", err)
	}
	return ticketNumber, nil
}
