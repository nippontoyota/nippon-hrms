-- Test Manager (+91 7591986364) — Sales Manager, reports manager for Bharath Chandra

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code,
    manager_id
)
VALUES (
    '9006', 'Test Manager', 'Sales', '7591986364', 'M1', '2019-03-15', 7.2,
    'Head Office', 'Sales Manager', 'HO',
    16800, 3500, 20300, 4200, 3200, 0, 0, 27700,
    500, 0, 0, 0, 2800, 800, 4100, 31800,
    'HDFC Bank', '50100987654321', 'KAKKANAD', 'HDFC0005010',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    mobile_number = EXCLUDED.mobile_number,
    emp_level = EXCLUDED.emp_level,
    doj = EXCLUDED.doj,
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

UPDATE employees
SET manager_id = '9006', updated_at = CURRENT_TIMESTAMP
WHERE id = '9005';

INSERT INTO epf_records (
    employee_id, name, department, emp_level, doj, years_since_doj,
    doa, years_since_doa, epf_number, uan, esi_number
)
VALUES (
    '9006', 'Test Manager', 'Sales', 'M1', '2019-03-15', 7.2,
    '2019-06-01', 7.0, '17', '100171703917', '5402329317'
)
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
('9006', 1, 2026, 'Test Manager', 0, 0, 31, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 12000, 43800, 31800, 31200, 2436, 702, 1600, 210, 910, 2800, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 12000, 5346, 38454),
('9006', 2, 2026, 'Test Manager', 1, 0, 28, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 11500, 43300, 31800, 31200, 2436, 702, 1600, 210, 910, 2700, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 11500, 5246, 38054),
('9006', 3, 2026, 'Test Manager', 0, 0, 31, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 12500, 44300, 31800, 31200, 2436, 702, 1600, 210, 910, 2900, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 12500, 5446, 38854),
('9006', 4, 2026, 'Test Manager', 0, 0, 30, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 11800, 43600, 31800, 31200, 2436, 702, 1600, 210, 910, 2750, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 11800, 5296, 38304),
('9006', 5, 2026, 'Test Manager', 1, 0, 31, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 12200, 44000, 31800, 31200, 2436, 702, 1600, 210, 910, 2850, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 12200, 5396, 38604),
('9006', 6, 2026, 'Test Manager', 0, 0, 30, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 12500, 44300, 31800, 31200, 2436, 702, 1600, 210, 910, 2900, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 12500, 5446, 38854),
('9006', 7, 2026, 'Test Manager', 0, 0, 31, 0, 16800, 3500, 20300, 4200, 3200, 0, 0, 500, 0, 0, 0, 2800, 800, 12800, 44600, 31800, 31200, 2436, 702, 1600, 210, 910, 2950, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 12800, 5496, 39104)
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
