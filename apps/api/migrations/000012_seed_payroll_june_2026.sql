-- June 2026 payroll (extends Jan–May seed for payslip testing)
INSERT INTO payroll_records (employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents, basic, da, basic_da, hra, travel, children_hostel, children_education, mobile, conveyance, branch_allowance, wash_allowance, special_allowance, training, incentive, total_ear_with_incen, gross_sal_without_incentives, gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv, additional_deduction, loan, advance, lop_deduction, company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher, reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions, actual_final_amount)
SELECT
    employee_id, 6, year, emp_name_snapshot, leaves, lop, 30, absents,
    basic, da, basic_da, hra, travel, children_hostel, children_education,
    mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
    training, incentive, total_ear_with_incen, gross_sal_without_incentives,
    gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
    additional_deduction, loan, advance, lop_deduction,
    company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
    reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
    actual_final_amount
FROM payroll_records
WHERE year = 2026 AND month = 5
ON CONFLICT (employee_id, month, year) DO UPDATE SET
    emp_name_snapshot = EXCLUDED.emp_name_snapshot,
    actual_final_amount = EXCLUDED.actual_final_amount;
