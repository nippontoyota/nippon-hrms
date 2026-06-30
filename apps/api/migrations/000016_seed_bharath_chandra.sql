-- Test user: Bharath Chandra (+91 7591986822) — Technical Development Manager

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code
)
VALUES (
    '9005', 'Bharath Chandra', 'IT', '7591986822', 'M2', '2017-05-01', 9.1,
    'Head Office', 'Technical Development Manager', 'HO',
    18500, 4000, 22500, 4800, 3000, 0, 1800, 32100,
    500, 0, 0, 0, 3500, 500, 4500, 36600,
    'ICICI Bank', '603801234567', 'KAKKANAD', 'ICIC0006038'
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
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO epf_records (
    employee_id, name, department, emp_level, doj, years_since_doj,
    doa, years_since_doa, epf_number, uan, esi_number
)
VALUES (
    '9005', 'Bharath Chandra', 'IT', 'M2', '2017-05-01', 9.1,
    '2017-08-01', 8.9, '16', '100171703916', '5402329316'
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
('9005', 1, 2026, 'Bharath Chandra', 0, 0, 31, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9500, 46100, 36600, 36000, 2700, 550, 1250, 0, 0, 3200, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9500, 5900, 40200),
('9005', 2, 2026, 'Bharath Chandra', 1, 0, 28, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9000, 45600, 36600, 36000, 2700, 550, 1250, 0, 0, 3000, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9000, 5700, 39900),
('9005', 3, 2026, 'Bharath Chandra', 0, 0, 31, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9800, 46400, 36600, 36000, 2700, 550, 1250, 0, 0, 3300, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9800, 6000, 40400),
('9005', 4, 2026, 'Bharath Chandra', 1, 0, 30, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9000, 45600, 36600, 36000, 2700, 550, 1250, 0, 0, 3000, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9000, 5700, 39900),
('9005', 5, 2026, 'Bharath Chandra', 0, 0, 31, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9800, 46400, 36600, 36000, 2700, 550, 1250, 0, 0, 3300, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9800, 6000, 40400),
('9005', 6, 2026, 'Bharath Chandra', 0, 0, 30, 0, 18500, 4000, 22500, 4800, 3000, 0, 1800, 500, 0, 0, 0, 3500, 500, 9800, 46400, 36600, 36000, 2700, 550, 1250, 0, 0, 3300, 0, 0, 0, 0, 0, 1800, 0, 0, 0, 0, 0, 1800, 9800, 6000, 40400)
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
