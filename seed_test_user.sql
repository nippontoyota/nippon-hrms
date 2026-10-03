BEGIN;
INSERT INTO employees (id, name, mobile_number) 
VALUES ('mn9999', 'Shiva Sajay', '9995228904') 
ON CONFLICT (id) DO UPDATE SET mobile_number = '9995228904', name = 'Shiva Sajay';

INSERT INTO payroll_records (employee_id, month, year, emp_name_snapshot, actual_final_amount, total_ear_with_incen)
VALUES ('mn9999', 9, 2026, 'Shiva Sajay', 50000, 50000)
ON CONFLICT (employee_id, month, year) DO NOTHING;
COMMIT;
