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

		CREATE TABLE IF NOT EXISTS vehicle_referrals (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			customer_name VARCHAR(100) NOT NULL,
			employee_id VARCHAR(50) NOT NULL,
			referred_name VARCHAR(100) NOT NULL,
			referred_phone VARCHAR(15) NOT NULL,
			model VARCHAR(20) NOT NULL CHECK (model IN ('glanza', 'hyryder')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		DO $$ BEGIN
			ALTER TABLE vehicle_referrals RENAME COLUMN customer_phone TO employee_id;
		EXCEPTION WHEN undefined_column THEN NULL;
		END $$;
		ALTER TABLE vehicle_referrals ALTER COLUMN employee_id TYPE VARCHAR(50);
		DROP INDEX IF EXISTS idx_vehicle_referrals_referred_phone;
		CREATE UNIQUE INDEX IF NOT EXISTS vehicle_referrals_referred_phone_key
			ON vehicle_referrals (referred_phone);
		CREATE INDEX IF NOT EXISTS idx_vehicle_referrals_created_at ON vehicle_referrals(created_at DESC);
		DROP TRIGGER IF EXISTS trg_prevent_vehicle_referral_self ON vehicle_referrals;
		DROP FUNCTION IF EXISTS prevent_vehicle_referral_self();

		ALTER TABLE "Ticket"
			ADD COLUMN IF NOT EXISTS image_url TEXT,
			ADD COLUMN IF NOT EXISTS image_caption TEXT,
			ADD COLUMN IF NOT EXISTS source_phone TEXT,
			ADD COLUMN IF NOT EXISTS employee_id TEXT,
			ADD COLUMN IF NOT EXISTS source_message_id TEXT;
		CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_source_message_id_key"
			ON "Ticket" (source_message_id) WHERE source_message_id IS NOT NULL;
		CREATE INDEX IF NOT EXISTS "Ticket_status_created_at_idx"
			ON "Ticket" (status, created_at DESC);

		CREATE TABLE IF NOT EXISTS employee_benefits (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
			benefit_type VARCHAR(32) NOT NULL CHECK (benefit_type IN ('APPROVED_BONUS', 'LEAVE_ENCASHMENT')),
			period VARCHAR(20) NOT NULL,
			amount NUMERIC(14, 2),
			source_file VARCHAR(255) NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (employee_id, benefit_type, period)
		);
		CREATE INDEX IF NOT EXISTS idx_employee_benefits_lookup
			ON employee_benefits (employee_id, benefit_type, period);
	`)
	if err != nil {
		return err
	}
	slog.Info("database schema patches applied")
	return nil
}
