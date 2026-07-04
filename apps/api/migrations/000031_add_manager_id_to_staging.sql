-- Add manager_id to import staging employees
ALTER TABLE import_staging_employees
ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
