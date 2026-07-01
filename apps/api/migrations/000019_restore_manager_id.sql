ALTER TABLE employees DROP COLUMN IF EXISTS reporting_manager_name;
ALTER TABLE employees DROP COLUMN IF EXISTS reporting_manager_phone;
ALTER TABLE employees DROP COLUMN IF EXISTS manager_id;
ALTER TABLE employees ADD COLUMN manager_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL;
