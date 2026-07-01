ALTER TABLE employees DROP COLUMN IF EXISTS manager_id;
ALTER TABLE employees ADD COLUMN reporting_manager_name VARCHAR(255);
ALTER TABLE employees ADD COLUMN reporting_manager_phone VARCHAR(20);
