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

		CREATE TABLE IF NOT EXISTS holidays (
			id VARCHAR(50) PRIMARY KEY,
			date DATE NOT NULL UNIQUE,
			name VARCHAR(255) NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

		ALTER TABLE import_staging_employees
		ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);

		CREATE TABLE IF NOT EXISTS greetings_log (
			employee_id VARCHAR(50) NOT NULL,
			greeting_type VARCHAR(50) NOT NULL,
			year INT NOT NULL,
			sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			PRIMARY KEY (employee_id, greeting_type, year)
		);
	`)
	if err != nil {
		return err
	}
	slog.Info("database schema patches applied")
	return nil
}
