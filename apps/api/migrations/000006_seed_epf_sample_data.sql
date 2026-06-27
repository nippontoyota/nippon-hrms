-- Sample EPF records aligned with existing employee master data
INSERT INTO epf_records (
    employee_id, name, department, emp_level, doj, years_since_doj,
    doa, years_since_doa, epf_number, uan, esi_number
)
SELECT
    e.id,
    e.name,
    e.department,
    e.emp_level,
    e.doj,
    e.years_experience,
    CASE
        WHEN EXTRACT(MONTH FROM e.doj) <= 3 THEN make_date(EXTRACT(YEAR FROM e.doj)::int, 4, 1)
        ELSE make_date(EXTRACT(YEAR FROM e.doj)::int + 1, 4, 1)
    END AS doa,
    GREATEST(ROUND((e.years_experience - 0.3)::numeric, 1), 0) AS years_since_doa,
    (ROW_NUMBER() OVER (ORDER BY e.id::int) + 8)::text AS epf_number,
    '100171703' || LPAD(ROW_NUMBER() OVER (ORDER BY e.id::int)::text, 3, '0') AS uan,
    CASE
        WHEN e.id::int % 4 = 0 THEN '0'
        ELSE '5402329' || LPAD((300 + ROW_NUMBER() OVER (ORDER BY e.id::int))::text, 3, '0')
    END AS esi_number
FROM employees e
ON CONFLICT (employee_id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    emp_level = EXCLUDED.emp_level,
    doj = EXCLUDED.doj,
    years_since_doj = EXCLUDED.years_since_doj,
    doa = EXCLUDED.doa,
    years_since_doa = EXCLUDED.years_since_doa,
    epf_number = EXCLUDED.epf_number,
    uan = EXCLUDED.uan,
    esi_number = EXCLUDED.esi_number,
    updated_at = CURRENT_TIMESTAMP;
