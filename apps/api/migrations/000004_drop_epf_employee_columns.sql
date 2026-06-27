-- Revert employees table to master-data columns only (remove EPF directory fields)
DROP INDEX IF EXISTS idx_employees_epf;
DROP INDEX IF EXISTS idx_employees_uan;
DROP INDEX IF EXISTS idx_employees_esi;

ALTER TABLE employees DROP COLUMN IF EXISTS doa;
ALTER TABLE employees DROP COLUMN IF EXISTS epf_number;
ALTER TABLE employees DROP COLUMN IF EXISTS uan;
ALTER TABLE employees DROP COLUMN IF EXISTS esi_number;
