-- Reset database to two test employees. Shiva Sajay is Krishnanand G's reporting manager.

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_job_errors') THEN
        DELETE FROM import_job_errors;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_conflicts') THEN
        DELETE FROM import_conflicts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_staging_payroll') THEN
        DELETE FROM import_staging_payroll;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_staging_epf') THEN
        DELETE FROM import_staging_epf;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_staging_employees') THEN
        DELETE FROM import_staging_employees;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_jobs') THEN
        DELETE FROM import_jobs;
    END IF;
END $$;

DELETE FROM dispatch_job_items;
DELETE FROM dispatch_jobs;
DELETE FROM payroll_records;
DELETE FROM epf_records;
DELETE FROM leaves;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_messages') THEN
        DELETE FROM whatsapp_messages;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations') THEN
        DELETE FROM whatsapp_conversations;
    END IF;
END $$;
DELETE FROM employees;

-- Shiva Sajay (manager) — insert first so Krishnanand can reference manager_id
INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code,
    manager_id
) VALUES (
    '9004', 'Shiva Sajay', 'IT', '9995228904', 'M1', '2024-06-01', 1.5,
    'Head Office', 'Software Engineer', 'HO',
    15200, 3000, 18200, 3250, 2750, 0, 0, 24200,
    500, 0, 0, 0, 0, 1000, 1500, 25700,
    'HDFC Bank', '50100234567890', 'EDAPPALLY', 'HDFC0005010',
    NULL
);

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code,
    manager_id
) VALUES (
    '9001', 'Krishnanand G', 'IT', '8590215315', 'E1', '2025-06-01', 0.1,
    'Head Office', 'Software Engineering Intern', 'HO',
    12000, 2000, 14000, 2000, 1500, 0, 0, 17500,
    350, 0, 0, 0, 0, 1000, 1350, 18850,
    'Federal Bank', '10340100900100', 'THRIKKAKKARA', 'FDRL0001034',
    '9004'
);

INSERT INTO epf_records (
    employee_id, name, department, emp_level, doj, years_since_doj,
    doa, years_since_doa, epf_number, uan, esi_number
) VALUES
('9004', 'Shiva Sajay', 'IT', 'M1', '2024-06-01', 1.5, '2024-07-01', 1.4, '15', '100171703915', '5402329315'),
('9001', 'Krishnanand G', 'IT', 'E1', '2025-06-01', 0.1, '2025-04-01', 0.2, '14', '100171703914', '5402329314');

INSERT INTO payroll_records (
    employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
    basic, da, basic_da, hra, travel, children_hostel, children_education,
    mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
    training, incentive, total_ear_with_incen, gross_sal_without_incentives,
    gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
    additional_deduction, loan, advance, lop_deduction,
    company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
    reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
    actual_final_amount
) VALUES
('9001', 6, 2026, 'Krishnanand G', 0, 0, 30, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9004', 6, 2026, 'Shiva Sajay', 0, 0, 30, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327);
