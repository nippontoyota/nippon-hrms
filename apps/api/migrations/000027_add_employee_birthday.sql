-- Birthday for employee greeting automation (DOJ already exists as doj).
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE INDEX IF NOT EXISTS idx_employees_birthday_month_day
    ON employees ((EXTRACT(MONTH FROM birthday)), (EXTRACT(DAY FROM birthday)))
    WHERE birthday IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_doj_month_day
    ON employees ((EXTRACT(MONTH FROM doj)), (EXTRACT(DAY FROM doj)))
    WHERE doj IS NOT NULL;
