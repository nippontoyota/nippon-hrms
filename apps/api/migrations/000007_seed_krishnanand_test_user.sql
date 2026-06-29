-- Test user for WhatsApp Generate Pay flow: Krishnanand G (+91 8590215315)

INSERT INTO employees (
    id, name, department, mobile_number, emp_level, doj, years_experience,
    branch, designation, zone, basic, da, revised_basic_da, hra, travel,
    hostel, children, total_salary, mobile, conveyance, wash_allowance,
    branch_allowance, special_allowance, training, total_allowances,
    total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code
)
VALUES (
    '9001', 'Krishnanand G', 'IT', '8590215315', 'M1', '2020-01-15', 6.4,
    'Head Office', 'Software Engineer', 'HO',
    15200, 3000, 18200, 3250, 2750, 2500, 1850, 28550,
    500, 0, 0, 0, 0, 0, 500, 29050,
    'Federal', '10340100900100', 'THRIKKAKKARA', 'FDRL0001034'
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
    '9001', 'Krishnanand G', 'IT', 'M1', '2020-01-15', 6.4,
    '2020-04-01', 6.1, '25', '100171703900', '5402329900'
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
)
SELECT
    '9001', month, year, 'Krishnanand G', leaves, lop, days, absents,
    basic, da, basic_da, hra, travel, children_hostel, children_education,
    mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
    training, incentive, total_ear_with_incen, gross_sal_without_incentives,
    gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
    additional_deduction, loan, advance, lop_deduction,
    company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
    reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
    actual_final_amount
FROM payroll_records
WHERE employee_id = '1277' AND year = 2026
ON CONFLICT (employee_id, month, year) DO UPDATE SET
    emp_name_snapshot = EXCLUDED.emp_name_snapshot,
    actual_final_amount = EXCLUDED.actual_final_amount;
