-- Shiva Sajay (manager) + Krishnanand G (reportee) with dummy data on all related tables.
-- Vault demo password (X-Vault-Token header): demo123

-- ─── Employees ───────────────────────────────────────────────────────────────

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, birthday, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code,
    manager_id
) VALUES (
    '9004', 'Shiva Sajay', 'IT', '9995228904', 'M1', '2024-06-01', '1995-11-14', 1.5,
    'Head Office', 'Software Engineer', 'HO',
    15200, 3000, 18200, 3250, 2750, 0, 0, 24200,
    500, 0, 0, 0, 0, 1000, 1500, 25700,
    'HDFC Bank', '50100234567890', 'EDAPPALLY', 'HDFC0005010',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    mobile_number = EXCLUDED.mobile_number,
    emp_level = EXCLUDED.emp_level,
    doj = EXCLUDED.doj,
    birthday = EXCLUDED.birthday,
    years_experience = EXCLUDED.years_experience,
    branch = EXCLUDED.branch,
    designation = EXCLUDED.designation,
    zone = EXCLUDED.zone,
    basic = EXCLUDED.basic,
    da = EXCLUDED.da,
    revised_basic_da = EXCLUDED.revised_basic_da,
    hra = EXCLUDED.hra,
    travel = EXCLUDED.travel,
    hostel = EXCLUDED.hostel,
    children = EXCLUDED.children,
    total_salary = EXCLUDED.total_salary,
    mobile = EXCLUDED.mobile,
    conveyance = EXCLUDED.conveyance,
    wash_allowance = EXCLUDED.wash_allowance,
    branch_allowance = EXCLUDED.branch_allowance,
    special_allowance = EXCLUDED.special_allowance,
    training = EXCLUDED.training,
    total_allowances = EXCLUDED.total_allowances,
    total_salary_with_allowances = EXCLUDED.total_salary_with_allowances,
    bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number,
    bank_branch = EXCLUDED.bank_branch,
    ifsc_code = EXCLUDED.ifsc_code,
    manager_id = EXCLUDED.manager_id,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, birthday, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code,
    manager_id
) VALUES (
    '9001', 'Krishnanand G', 'IT', '8590215315', 'E1', '2025-06-01', '1998-07-03', 0.1,
    'Head Office', 'Software Engineering Intern', 'HO',
    12000, 2000, 14000, 2000, 1500, 0, 0, 17500,
    350, 0, 0, 0, 0, 1000, 1350, 18850,
    'Federal Bank', '10340100900100', 'THRIKKAKKARA', 'FDRL0001034',
    '9004'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    mobile_number = EXCLUDED.mobile_number,
    emp_level = EXCLUDED.emp_level,
    doj = EXCLUDED.doj,
    birthday = EXCLUDED.birthday,
    years_experience = EXCLUDED.years_experience,
    branch = EXCLUDED.branch,
    designation = EXCLUDED.designation,
    zone = EXCLUDED.zone,
    basic = EXCLUDED.basic,
    da = EXCLUDED.da,
    revised_basic_da = EXCLUDED.revised_basic_da,
    hra = EXCLUDED.hra,
    travel = EXCLUDED.travel,
    hostel = EXCLUDED.hostel,
    children = EXCLUDED.children,
    total_salary = EXCLUDED.total_salary,
    mobile = EXCLUDED.mobile,
    conveyance = EXCLUDED.conveyance,
    wash_allowance = EXCLUDED.wash_allowance,
    branch_allowance = EXCLUDED.branch_allowance,
    special_allowance = EXCLUDED.special_allowance,
    training = EXCLUDED.training,
    total_allowances = EXCLUDED.total_allowances,
    total_salary_with_allowances = EXCLUDED.total_salary_with_allowances,
    bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number,
    bank_branch = EXCLUDED.bank_branch,
    ifsc_code = EXCLUDED.ifsc_code,
    manager_id = '9004',
    updated_at = CURRENT_TIMESTAMP;

-- ─── EPF ─────────────────────────────────────────────────────────────────────

INSERT INTO epf_records (
    employee_id, name, department, emp_level, doj, years_since_doj,
    doa, years_since_doa, epf_number, uan, esi_number
) VALUES
('9004', 'Shiva Sajay', 'IT', 'M1', '2024-06-01', 1.5, '2024-07-01', 1.4, '15', '100171703915', '5402329315'),
('9001', 'Krishnanand G', 'IT', 'E1', '2025-06-01', 0.1, '2025-04-01', 0.2, '14', '100171703914', '5402329314')
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

-- ─── Payroll (Jan–Jul 2026) ──────────────────────────────────────────────────

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
('9001', 1, 2026, 'Krishnanand G', 0, 0, 31, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 2, 2026, 'Krishnanand G', 1, 0, 28, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 3, 2026, 'Krishnanand G', 0, 0, 31, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 4, 2026, 'Krishnanand G', 0, 0, 30, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 5, 2026, 'Krishnanand G', 0, 0, 31, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 6, 2026, 'Krishnanand G', 0, 0, 30, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9001', 7, 2026, 'Krishnanand G', 0, 0, 31, 0, 12000, 2000, 14000, 2000, 1500, 0, 0, 350, 0, 0, 0, 0, 1000, 0, 18850, 18850, 18500, 1680, 484, 1100, 141, 612, 0, 0, 0, 0, 0, 0, 1680, 0, 0, 0, 0, 0, 1680, 0, 1821, 17029),
('9004', 1, 2026, 'Shiva Sajay', 0, 0, 31, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 2, 2026, 'Shiva Sajay', 1, 0, 28, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 3, 2026, 'Shiva Sajay', 0, 0, 31, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 4, 2026, 'Shiva Sajay', 0, 0, 30, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 5, 2026, 'Shiva Sajay', 0, 0, 31, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 6, 2026, 'Shiva Sajay', 0, 0, 30, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327),
('9004', 7, 2026, 'Shiva Sajay', 0, 0, 31, 0, 15200, 3000, 18200, 3250, 2750, 0, 0, 500, 0, 0, 0, 0, 1000, 0, 25700, 25700, 25200, 2184, 629, 1430, 189, 819, 0, 0, 0, 0, 0, 0, 2184, 0, 0, 0, 0, 0, 2184, 0, 2373, 23327)
ON CONFLICT (employee_id, month, year) DO UPDATE SET
    emp_name_snapshot = EXCLUDED.emp_name_snapshot,
    leaves = EXCLUDED.leaves,
    lop = EXCLUDED.lop,
    days = EXCLUDED.days,
    absents = EXCLUDED.absents,
    basic = EXCLUDED.basic,
    da = EXCLUDED.da,
    basic_da = EXCLUDED.basic_da,
    hra = EXCLUDED.hra,
    travel = EXCLUDED.travel,
    children_hostel = EXCLUDED.children_hostel,
    children_education = EXCLUDED.children_education,
    mobile = EXCLUDED.mobile,
    conveyance = EXCLUDED.conveyance,
    branch_allowance = EXCLUDED.branch_allowance,
    wash_allowance = EXCLUDED.wash_allowance,
    special_allowance = EXCLUDED.special_allowance,
    training = EXCLUDED.training,
    incentive = EXCLUDED.incentive,
    total_ear_with_incen = EXCLUDED.total_ear_with_incen,
    gross_sal_without_incentives = EXCLUDED.gross_sal_without_incentives,
    gross_for_pt = EXCLUDED.gross_for_pt,
    pf = EXCLUDED.pf,
    pf_3_67 = EXCLUDED.pf_3_67,
    pf_8_33 = EXCLUDED.pf_8_33,
    esi_0_75 = EXCLUDED.esi_0_75,
    esi_3_25 = EXCLUDED.esi_3_25,
    tds = EXCLUDED.tds,
    sal_adv = EXCLUDED.sal_adv,
    additional_deduction = EXCLUDED.additional_deduction,
    loan = EXCLUDED.loan,
    advance = EXCLUDED.advance,
    lop_deduction = EXCLUDED.lop_deduction,
    company_statutory_contribution = EXCLUDED.company_statutory_contribution,
    reimb_medical = EXCLUDED.reimb_medical,
    reimb_lta = EXCLUDED.reimb_lta,
    zeta_meal_voucher = EXCLUDED.zeta_meal_voucher,
    reimb_travel = EXCLUDED.reimb_travel,
    total_reimbursement = EXCLUDED.total_reimbursement,
    epf_er = EXCLUDED.epf_er,
    net_incentive = EXCLUDED.net_incentive,
    total_deductions = EXCLUDED.total_deductions,
    actual_final_amount = EXCLUDED.actual_final_amount;

-- ─── Leaves ──────────────────────────────────────────────────────────────────

INSERT INTO leaves (
    id, employee_id, type, from_date, to_date, days, reason, status,
    reviewed_by, reviewed_at, rejection_reason
) VALUES
(
    'f0000004-0000-4000-8000-000000000001',
    '9001', 'casual', '2026-07-10', '2026-07-11', 2,
    'Family function', 'pending', NULL, NULL, NULL
),
(
    'f0000004-0000-4000-8000-000000000002',
    '9001', 'sick', '2026-06-03', '2026-06-03', 1,
    'Fever', 'approved', '9004', '2026-06-02 10:30:00+05:30', NULL
),
(
    'f0000004-0000-4000-8000-000000000003',
    '9001', 'annual', '2026-08-01', '2026-08-05', 5,
    'Summer break', 'rejected', '9004', '2026-07-01 14:00:00+05:30',
    'Peak project period — please reschedule'
),
(
    'f0000004-0000-4000-8000-000000000004',
    '9004', 'casual', '2026-07-15', '2026-07-15', 1,
    'Personal errand', 'approved', '9004', '2026-07-14 09:00:00+05:30', NULL
)
ON CONFLICT (id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    type = EXCLUDED.type,
    from_date = EXCLUDED.from_date,
    to_date = EXCLUDED.to_date,
    days = EXCLUDED.days,
    reason = EXCLUDED.reason,
    status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    rejection_reason = EXCLUDED.rejection_reason;

-- ─── WhatsApp conversations & messages ───────────────────────────────────────

-- Upsert conversations by phone (preserves existing conversation IDs).
INSERT INTO whatsapp_conversations (
    phone, employee_id, last_message, last_inbound_at, unread, flow_state
) VALUES
(
    '+918590215315', '9001', 'Payslip for Jul 2026 sent.',
    NOW() - INTERVAL '2 hours', 0, '{"step":"menu"}'::jsonb
),
(
    '+919995228904', '9004', 'Leave request from Krishnanand pending.',
    NOW() - INTERVAL '1 day', 1, NULL
)
ON CONFLICT (phone) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    last_message = EXCLUDED.last_message,
    last_inbound_at = EXCLUDED.last_inbound_at,
    unread = EXCLUDED.unread,
    flow_state = EXCLUDED.flow_state,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO whatsapp_messages (
    id, conversation_id, employee_id, direction, body, status, wa_message_id, sent_at
) VALUES
(
    'f0000001-0001-4000-8000-000000000001',
    (SELECT id FROM whatsapp_conversations WHERE phone = '+918590215315'),
    '9001', 'inbound', 'Hi', 'read',
    'wamid.krish.in.001', NOW() - INTERVAL '3 hours'
),
(
    'f0000001-0001-4000-8000-000000000002',
    (SELECT id FROM whatsapp_conversations WHERE phone = '+918590215315'),
    '9001', 'outbound',
    'Welcome to Nippon HR Connect. Reply with a menu option.', 'delivered',
    'wamid.krish.out.001', NOW() - INTERVAL '2 hours 55 minutes'
),
(
    'f0000001-0001-4000-8000-000000000003',
    (SELECT id FROM whatsapp_conversations WHERE phone = '+918590215315'),
    '9001', 'inbound', '1', 'read',
    'wamid.krish.in.002', NOW() - INTERVAL '2 hours 50 minutes'
),
(
    'f0000001-0001-4000-8000-000000000004',
    (SELECT id FROM whatsapp_conversations WHERE phone = '+919995228904'),
    '9004', 'inbound', 'Approve leave', 'read',
    'wamid.shiva.in.001', NOW() - INTERVAL '1 day'
),
(
    'f0000001-0001-4000-8000-000000000005',
    (SELECT id FROM whatsapp_conversations WHERE phone = '+919995228904'),
    '9004', 'outbound',
    'You have 1 pending leave request from Krishnanand G.', 'sent',
    'wamid.shiva.out.001', NOW() - INTERVAL '23 hours'
)
ON CONFLICT (id) DO UPDATE SET
    body = EXCLUDED.body,
    status = EXCLUDED.status,
    sent_at = EXCLUDED.sent_at;

-- ─── Payslip dispatch jobs ───────────────────────────────────────────────────

INSERT INTO dispatch_jobs (
    id, month, year, status, total, sent, failed, skipped, completed_at
) VALUES (
    'f0000003-0000-4000-8000-000000000001',
    7, 2026, 'COMPLETED', 2, 2, 0, 0, NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total = EXCLUDED.total,
    sent = EXCLUDED.sent,
    failed = EXCLUDED.failed,
    skipped = EXCLUDED.skipped,
    completed_at = EXCLUDED.completed_at,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO dispatch_job_items (
    id, job_id, employee_id, employee_name, status, sent_at
) VALUES
(
    'f0000003-0001-4000-8000-000000000001',
    'f0000003-0000-4000-8000-000000000001', '9001', 'Krishnanand G', 'SENT',
    NOW() - INTERVAL '1 day'
),
(
    'f0000003-0001-4000-8000-000000000002',
    'f0000003-0000-4000-8000-000000000001', '9004', 'Shiva Sajay', 'SENT',
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (job_id, employee_id) DO UPDATE SET
    employee_name = EXCLUDED.employee_name,
    status = EXCLUDED.status,
    sent_at = EXCLUDED.sent_at,
    updated_at = CURRENT_TIMESTAMP;

-- ─── Import jobs (completed + sample conflict job) ───────────────────────────

INSERT INTO import_jobs (
    id, entity_type, mode, month, year, status, file_name, file_format, created_by,
    total_rows, inserted, skipped_identical, rejected, conflicts_pending, completed_at
) VALUES
(
    'f0000002-0000-4000-8000-000000000001',
    'employees', 'add', NULL, NULL, 'COMPLETED', 'employees_demo.csv', 'csv', 'hr.demo@nippon.local',
    2, 2, 0, 0, 0, NOW() - INTERVAL '7 days'
),
(
    'f0000002-0000-4000-8000-000000000002',
    'payroll', 'add', 7, 2026, 'COMPLETED', 'payroll_jul_2026.csv', 'csv', 'hr.demo@nippon.local',
    2, 2, 0, 0, 0, NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    total_rows = EXCLUDED.total_rows,
    inserted = EXCLUDED.inserted,
    completed_at = EXCLUDED.completed_at,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO import_staging_employees (
    job_id, row_num, row_hash, id, name, department, mobile_number, emp_level, doj,
    years_experience, branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code, manager_id, birthday
) VALUES
(
    'f0000002-0000-4000-8000-000000000001', 1, 'dummyhash9004', '9004', 'Shiva Sajay', 'IT',
    '9995228904', 'M1', '2024-06-01', 1.5, 'Head Office', 'Software Engineer', 'HO',
    15200, 3000, 18200, 3250, 2750, 25700, 'HDFC Bank', '50100234567890', 'EDAPPALLY',
    'HDFC0005010', NULL, '1995-11-14'
),
(
    'f0000002-0000-4000-8000-000000000001', 2, 'dummyhash9001', '9001', 'Krishnanand G', 'IT',
    '8590215315', 'E1', '2025-06-01', 0.1, 'Head Office', 'Software Engineering Intern', 'HO',
    12000, 2000, 14000, 2000, 1500, 18850, 'Federal Bank', '10340100900100', 'THRIKKAKKARA',
    'FDRL0001034', '9004', '1998-07-03'
)
ON CONFLICT (job_id, id) DO NOTHING;

INSERT INTO import_staging_epf (
    job_id, row_num, row_hash, employee_id, name, department, emp_level, doj,
    years_since_doj, doa, years_since_doa, epf_number, uan, esi_number
) VALUES
(
    'f0000002-0000-4000-8000-000000000001', 1, 'dummyepf9004', '9004', 'Shiva Sajay', 'IT',
    'M1', '2024-06-01', 1.5, '2024-07-01', 1.4, '15', '100171703915', '5402329315'
),
(
    'f0000002-0000-4000-8000-000000000001', 2, 'dummyepf9001', '9001', 'Krishnanand G', 'IT',
    'E1', '2025-06-01', 0.1, '2025-04-01', 0.2, '14', '100171703914', '5402329314'
)
ON CONFLICT (job_id, employee_id) DO NOTHING;

INSERT INTO import_staging_payroll (
    job_id, row_num, row_hash, employee_id, month, year, emp_name_snapshot,
    days, basic, da, basic_da, hra, travel, mobile, training,
    total_ear_with_incen, gross_sal_without_incentives, pf, total_deductions, actual_final_amount
) VALUES
(
    'f0000002-0000-4000-8000-000000000002', 1, 'dummypay9001', '9001', 7, 2026, 'Krishnanand G',
    31, 12000, 2000, 14000, 2000, 1500, 350, 1000, 18850, 18850, 1680, 1821, 17029
),
(
    'f0000002-0000-4000-8000-000000000002', 2, 'dummypay9004', '9004', 7, 2026, 'Shiva Sajay',
    31, 15200, 3000, 18200, 3250, 2750, 500, 1000, 25700, 25700, 2184, 2373, 23327
)
ON CONFLICT (job_id, employee_id, month, year) DO NOTHING;

INSERT INTO import_job_errors (id, job_id, row_num, message) VALUES
(
    'f0000002-0001-4000-8000-000000000001',
    'f0000002-0000-4000-8000-000000000001', 99, 'Skipped row: missing employee ID'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO import_conflicts (
    id, job_id, entity_type, natural_key, field_name, existing_value, imported_value, resolution
) VALUES
(
    'f0000002-0002-4000-8000-000000000001',
    'f0000002-0000-4000-8000-000000000001', 'employees', '9001', 'designation',
    'Software Engineering Intern', 'Junior Developer', 'keep_existing'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Referrals ───────────────────────────────────────────────────────────────

INSERT INTO referral_links (id, employee_id, code, expires_at) VALUES
(
    'f0000005-0000-4000-8000-000000000001', '9004', 'SHIVA-REF-2026',
    NOW() + INTERVAL '90 days'
),
(
    'f0000005-0000-4000-8000-000000000002', '9001', 'KRISH-REF-2026',
    NOW() + INTERVAL '60 days'
)
ON CONFLICT (code) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    expires_at = EXCLUDED.expires_at;

INSERT INTO candidates (
    id, referral_link_id, name, phone, resume_url, designation, status
) VALUES
(
    'f0000006-0000-4000-8000-000000000001',
    'f0000005-0000-4000-8000-000000000001',
    'Anita Nair', '9876543210', 'https://example.com/resumes/anita.pdf',
    'Software Engineer', 'PENDING'
),
(
    'f0000006-0000-4000-8000-000000000002',
    'f0000005-0000-4000-8000-000000000002',
    'Rahul Menon', '9123456780', 'https://example.com/resumes/rahul.pdf',
    'QA Intern', 'SHORTLISTED'
)
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    designation = EXCLUDED.designation,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- ─── App settings & HR profile ───────────────────────────────────────────────

INSERT INTO app_settings (key, value) VALUES
('vault_password_hash', '$2a$10$.Yo7B4KoEnuXcQYwNW/oieKRnZ1WkNo1Q9kBiaeZUgYPPVexRGBX.')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO hr_profiles (user_id, email, role) VALUES
('f0000007-0000-4000-8000-000000000001', 'hr.demo@nippon.local', 'hr_admin')
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role;
