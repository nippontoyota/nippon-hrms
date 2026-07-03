ALTER TABLE import_staging_employees
    ADD COLUMN IF NOT EXISTS birthday DATE;
