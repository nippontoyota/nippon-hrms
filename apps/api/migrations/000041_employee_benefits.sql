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
