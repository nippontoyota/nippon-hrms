package holiday

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/matoous/go-nanoid/v2"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, h *Holiday) error {
	id, _ := gonanoid.New()
	h.ID = id
	h.CreatedAt = time.Now()

	parsedDate, err := time.Parse("2006-01-02", h.Date)
	if err != nil {
		return fmt.Errorf("invalid date format: %w", err)
	}

	query := `INSERT INTO holidays (id, date, name, created_at) VALUES ($1, $2, $3, $4)`
	_, err = r.db.Exec(ctx, query, h.ID, parsedDate, h.Name, h.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert holiday: %w", err)
	}
	return nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM holidays WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete holiday: %w", err)
	}
	return nil
}

func (r *PostgresRepository) List(ctx context.Context, year, month *int) ([]Holiday, error) {
	query := `SELECT id, date, name, created_at FROM holidays WHERE 1=1`
	var args []interface{}
	argId := 1

	if year != nil {
		query += fmt.Sprintf(" AND EXTRACT(YEAR FROM date) = $%d", argId)
		args = append(args, *year)
		argId++
	}
	if month != nil {
		query += fmt.Sprintf(" AND EXTRACT(MONTH FROM date) = $%d", argId)
		args = append(args, *month)
		argId++
	}

	query += ` ORDER BY date ASC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list holidays: %w", err)
	}
	defer rows.Close()

	var res []Holiday
	for rows.Next() {
		var h Holiday
		var d time.Time
		if err := rows.Scan(&h.ID, &d, &h.Name, &h.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan holiday: %w", err)
		}
		h.Date = d.Format("2006-01-02")
		res = append(res, h)
	}
	if res == nil {
		res = []Holiday{}
	}
	return res, nil
}

func (r *PostgresRepository) BulkCreate(ctx context.Context, holidays []Holiday) error {
	if len(holidays) == 0 {
		return nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, h := range holidays {
		id, _ := gonanoid.New()
		parsedDate, err := time.Parse("2006-01-02", h.Date)
		if err != nil {
			return fmt.Errorf("invalid date format %s: %w", h.Date, err)
		}

		query := `INSERT INTO holidays (id, date, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (date) DO UPDATE SET name = $3`
		_, err = tx.Exec(ctx, query, id, parsedDate, h.Name, time.Now())
		if err != nil {
			return fmt.Errorf("failed to insert holiday %s: %w", h.Date, err)
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) GetUpcoming(ctx context.Context, limit int) ([]Holiday, error) {
	query := `SELECT id, date, name, created_at FROM holidays WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT $1`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query upcoming holidays: %w", err)
	}
	defer rows.Close()

	var res []Holiday
	for rows.Next() {
		var h Holiday
		var d time.Time
		if err := rows.Scan(&h.ID, &d, &h.Name, &h.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan holiday: %w", err)
		}
		h.Date = d.Format("2006-01-02")
		res = append(res, h)
	}
	if res == nil {
		res = []Holiday{}
	}
	return res, nil
}
