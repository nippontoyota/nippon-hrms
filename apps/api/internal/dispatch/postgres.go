package dispatch

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	HasRunningJobForPeriod(ctx context.Context, month, year int) (bool, error)
	CreateJob(ctx context.Context, month, year int, items []Item) (*Job, error)
	GetJob(ctx context.Context, jobID string) (*Job, error)
	ListItems(ctx context.Context, jobID string, status ItemStatus, page, limit int) ([]Item, int, error)
	ClaimNextPendingItem(ctx context.Context, jobID string) (*Item, error)
	MarkItemSent(ctx context.Context, jobID, itemID string) error
	MarkItemFailed(ctx context.Context, jobID, itemID, reason string) error
	MarkItemSkipped(ctx context.Context, jobID, itemID, reason string) error
	SetJobRunning(ctx context.Context, jobID string) error
	FinalizeJob(ctx context.Context, jobID string) error
	ResetFailedItems(ctx context.Context, jobID string) (int, error)
}

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) HasRunningJobForPeriod(ctx context.Context, month, year int) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM dispatch_jobs
			WHERE month = $1 AND year = $2 AND status IN ('PENDING', 'RUNNING')
		)`, month, year).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) CreateJob(ctx context.Context, month, year int, items []Item) (*Job, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var job Job
	err = tx.QueryRow(ctx, `
		INSERT INTO dispatch_jobs (month, year, status, total)
		VALUES ($1, $2, 'PENDING', $3)
		RETURNING id, month, year, status, total, sent, failed, skipped, created_at, updated_at, completed_at`,
		month, year, len(items),
	).Scan(
		&job.ID, &job.Month, &job.Year, &job.Status, &job.Total,
		&job.Sent, &job.Failed, &job.Skipped,
		&job.CreatedAt, &job.UpdatedAt, &job.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert job: %w", err)
	}

	if len(items) > 0 {
		rows := make([][]interface{}, len(items))
		for i, item := range items {
			rows[i] = []interface{}{job.ID, item.EmployeeID, item.EmployeeName, string(ItemPending)}
		}
		_, err = tx.CopyFrom(
			ctx,
			pgx.Identifier{"dispatch_job_items"},
			[]string{"job_id", "employee_id", "employee_name", "status"},
			pgx.CopyFromRows(rows),
		)
		if err != nil {
			return nil, fmt.Errorf("insert job items: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *PostgresRepository) GetJob(ctx context.Context, jobID string) (*Job, error) {
	var job Job
	err := r.db.QueryRow(ctx, `
		SELECT id, month, year, status, total, sent, failed, skipped, created_at, updated_at, completed_at
		FROM dispatch_jobs WHERE id = $1`, jobID,
	).Scan(
		&job.ID, &job.Month, &job.Year, &job.Status, &job.Total,
		&job.Sent, &job.Failed, &job.Skipped,
		&job.CreatedAt, &job.UpdatedAt, &job.CompletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("job not found")
	}
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *PostgresRepository) ListItems(ctx context.Context, jobID string, status ItemStatus, page, limit int) ([]Item, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	countQuery := `SELECT COUNT(*) FROM dispatch_job_items WHERE job_id = $1`
	args := []interface{}{jobID}
	if status != "" {
		countQuery += ` AND status = $2`
		args = append(args, string(status))
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := `
		SELECT id, employee_id, employee_name, status, error_reason, sent_at
		FROM dispatch_job_items WHERE job_id = $1`
	listArgs := []interface{}{jobID}
	if status != "" {
		listQuery += ` AND status = $2`
		listArgs = append(listArgs, string(status))
	}
	listQuery += fmt.Sprintf(` ORDER BY employee_id LIMIT $%d OFFSET $%d`, len(listArgs)+1, len(listArgs)+2)
	listArgs = append(listArgs, limit, offset)

	rows, err := r.db.Query(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var item Item
		if err := rows.Scan(&item.ID, &item.EmployeeID, &item.EmployeeName, &item.Status, &item.ErrorReason, &item.SentAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []Item{}
	}
	return items, total, rows.Err()
}

func (r *PostgresRepository) ClaimNextPendingItem(ctx context.Context, jobID string) (*Item, error) {
	var item Item
	err := r.db.QueryRow(ctx, `
		UPDATE dispatch_job_items
		SET status = 'RUNNING', updated_at = NOW()
		WHERE id = (
			SELECT id FROM dispatch_job_items
			WHERE job_id = $1 AND status = 'PENDING'
			ORDER BY employee_id
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		RETURNING id, employee_id, employee_name, status`, jobID,
	).Scan(&item.ID, &item.EmployeeID, &item.EmployeeName, &item.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *PostgresRepository) MarkItemSent(ctx context.Context, jobID, itemID string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE dispatch_job_items
		SET status = 'SENT', sent_at = NOW(), updated_at = NOW(), error_reason = NULL
		WHERE id = $1 AND job_id = $2`, itemID, jobID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("item not found")
	}
	_, err = r.db.Exec(ctx, `
		UPDATE dispatch_jobs SET sent = sent + 1, updated_at = NOW() WHERE id = $1`, jobID)
	return err
}

func (r *PostgresRepository) MarkItemFailed(ctx context.Context, jobID, itemID, reason string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE dispatch_job_items
		SET status = 'FAILED', error_reason = $3, updated_at = NOW()
		WHERE id = $1 AND job_id = $2`, itemID, jobID, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("item not found")
	}
	_, err = r.db.Exec(ctx, `
		UPDATE dispatch_jobs SET failed = failed + 1, updated_at = NOW() WHERE id = $1`, jobID)
	return err
}

func (r *PostgresRepository) MarkItemSkipped(ctx context.Context, jobID, itemID, reason string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE dispatch_job_items
		SET status = 'SKIPPED', error_reason = $3, updated_at = NOW()
		WHERE id = $1 AND job_id = $2`, itemID, jobID, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("item not found")
	}
	_, err = r.db.Exec(ctx, `
		UPDATE dispatch_jobs SET skipped = skipped + 1, updated_at = NOW() WHERE id = $1`, jobID)
	return err
}

func (r *PostgresRepository) SetJobRunning(ctx context.Context, jobID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE dispatch_jobs SET status = 'RUNNING', updated_at = NOW()
		WHERE id = $1 AND status = 'PENDING'`, jobID)
	return err
}

func (r *PostgresRepository) FinalizeJob(ctx context.Context, jobID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE dispatch_jobs
		SET status = CASE WHEN failed > 0 AND sent = 0 THEN 'FAILED' ELSE 'COMPLETED' END,
		    completed_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1`, jobID)
	return err
}

func (r *PostgresRepository) ResetFailedItems(ctx context.Context, jobID string) (int, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE dispatch_job_items
		SET status = 'PENDING', error_reason = NULL, updated_at = NOW()
		WHERE job_id = $1 AND status = 'FAILED'`, jobID)
	if err != nil {
		return 0, err
	}
	n := int(tag.RowsAffected())
	if n > 0 {
		_, err = r.db.Exec(ctx, `
			UPDATE dispatch_jobs
			SET status = 'PENDING', failed = GREATEST(failed - $2, 0), completed_at = NULL, updated_at = NOW()
			WHERE id = $1`, jobID, n)
	}
	return n, err
}
