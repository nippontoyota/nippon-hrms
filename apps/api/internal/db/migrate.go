package db

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EnsureSchema applies idempotent schema patches required by the running API version.
func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_type_check;
		ALTER TABLE leaves ADD CONSTRAINT leaves_type_check
		  CHECK (type IN ('casual','sick','annual','maternity','paternity','unpaid'));

		ALTER TABLE employees
		ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL;
	`)
	if err != nil {
		return err
	}
	slog.Info("database schema patches applied")
	return nil
}
