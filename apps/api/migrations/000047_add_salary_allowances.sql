ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS washing_allowance FLOAT DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS fixed_incentive FLOAT DEFAULT 0;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS washing_allowance FLOAT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fixed_incentive FLOAT DEFAULT 0;

ALTER TABLE import_staging_employees ADD COLUMN IF NOT EXISTS washing_allowance FLOAT DEFAULT 0;
ALTER TABLE import_staging_employees ADD COLUMN IF NOT EXISTS fixed_incentive FLOAT DEFAULT 0;

ALTER TABLE import_staging_payroll ADD COLUMN IF NOT EXISTS washing_allowance FLOAT DEFAULT 0;
ALTER TABLE import_staging_payroll ADD COLUMN IF NOT EXISTS fixed_incentive FLOAT DEFAULT 0;
