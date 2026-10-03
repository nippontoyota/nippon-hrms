BEGIN;
-- Delete the old mn9999
DELETE FROM payroll_records WHERE employee_id = 'mn9999';
DELETE FROM employees WHERE id = 'mn9999';

-- Create the new imr9999
INSERT INTO employees (id, name, mobile_number) 
VALUES ('imr9999', 'Shiva Sajay', '9995228904') 
ON CONFLICT (id) DO UPDATE SET mobile_number = '9995228904', name = 'Shiva Sajay';

INSERT INTO payroll_records (employee_id, month, year, emp_name_snapshot, actual_final_amount, total_ear_with_incen)
VALUES ('imr9999', 9, 2026, 'Shiva Sajay', 50000, 50000)
ON CONFLICT (employee_id, month, year) DO NOTHING;
COMMIT;
