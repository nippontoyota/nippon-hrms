package importjob

func employeeCols() string {
	return `id, name, department, mobile_number, emp_level, doj, years_experience,
		branch, designation, zone, basic, da, revised_basic_da, hra, travel,
		hostel, children, total_salary, mobile, conveyance, wash_allowance,
		branch_allowance, special_allowance, training, total_allowances,
		total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code`
}

func employeeStagingCols(alias string) string {
	return alias + `.id, ` + alias + `.name, ` + alias + `.department, ` + alias + `.mobile_number, ` + alias + `.emp_level, ` + alias + `.doj, ` + alias + `.years_experience,
		` + alias + `.branch, ` + alias + `.designation, ` + alias + `.zone, ` + alias + `.basic, ` + alias + `.da, ` + alias + `.revised_basic_da, ` + alias + `.hra, ` + alias + `.travel,
		` + alias + `.hostel, ` + alias + `.children, ` + alias + `.total_salary, ` + alias + `.mobile, ` + alias + `.conveyance, ` + alias + `.wash_allowance,
		` + alias + `.branch_allowance, ` + alias + `.special_allowance, ` + alias + `.training, ` + alias + `.total_allowances,
		` + alias + `.total_salary_with_allowances, ` + alias + `.bank_name, ` + alias + `.account_number, ` + alias + `.bank_branch, ` + alias + `.ifsc_code`
}

func employeeInsertFromStagingSQL() string {
	return `INSERT INTO employees (` + employeeCols() + `)
		SELECT ` + employeeStagingCols("s") + `
		FROM import_staging_employees s WHERE s.job_id = $1`
}

func payrollCols() string {
	return `employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
		basic, da, basic_da, hra, travel, children_hostel, children_education,
		mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
		training, incentive, total_ear_with_incen, gross_sal_without_incentives,
		gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
		additional_deduction, loan, advance, lop_deduction,
		company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
		reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
		actual_final_amount`
}

func payrollStagingCols(alias string) string {
	return alias + `.employee_id, ` + alias + `.month, ` + alias + `.year, ` + alias + `.emp_name_snapshot,
		` + alias + `.leaves, ` + alias + `.lop, ` + alias + `.days, ` + alias + `.absents,
		` + alias + `.basic, ` + alias + `.da, ` + alias + `.basic_da, ` + alias + `.hra, ` + alias + `.travel,
		` + alias + `.children_hostel, ` + alias + `.children_education, ` + alias + `.mobile, ` + alias + `.conveyance,
		` + alias + `.branch_allowance, ` + alias + `.wash_allowance, ` + alias + `.special_allowance,
		` + alias + `.training, ` + alias + `.incentive, ` + alias + `.total_ear_with_incen,
		` + alias + `.gross_sal_without_incentives, ` + alias + `.gross_for_pt, ` + alias + `.pf,
		` + alias + `.pf_3_67, ` + alias + `.pf_8_33, ` + alias + `.esi_0_75, ` + alias + `.esi_3_25,
		` + alias + `.tds, ` + alias + `.sal_adv, ` + alias + `.additional_deduction, ` + alias + `.loan,
		` + alias + `.advance, ` + alias + `.lop_deduction, ` + alias + `.company_statutory_contribution,
		` + alias + `.reimb_medical, ` + alias + `.reimb_lta, ` + alias + `.zeta_meal_voucher,
		` + alias + `.reimb_travel, ` + alias + `.total_reimbursement, ` + alias + `.epf_er,
		` + alias + `.net_incentive, ` + alias + `.total_deductions, ` + alias + `.actual_final_amount`
}

func payrollUpsertFromStagingSQL() string {
	return `INSERT INTO payroll_records (` + payrollCols() + `)
		SELECT ` + payrollStagingCols("s") + `
		FROM import_staging_payroll s WHERE s.job_id = $1
		ON CONFLICT (employee_id, month, year) DO UPDATE SET
			emp_name_snapshot = EXCLUDED.emp_name_snapshot,
			leaves = EXCLUDED.leaves, lop = EXCLUDED.lop, days = EXCLUDED.days, absents = EXCLUDED.absents,
			basic = EXCLUDED.basic, da = EXCLUDED.da, basic_da = EXCLUDED.basic_da,
			hra = EXCLUDED.hra, travel = EXCLUDED.travel,
			children_hostel = EXCLUDED.children_hostel, children_education = EXCLUDED.children_education,
			mobile = EXCLUDED.mobile, conveyance = EXCLUDED.conveyance,
			branch_allowance = EXCLUDED.branch_allowance, wash_allowance = EXCLUDED.wash_allowance,
			special_allowance = EXCLUDED.special_allowance, training = EXCLUDED.training,
			incentive = EXCLUDED.incentive, total_ear_with_incen = EXCLUDED.total_ear_with_incen,
			gross_sal_without_incentives = EXCLUDED.gross_sal_without_incentives,
			gross_for_pt = EXCLUDED.gross_for_pt, pf = EXCLUDED.pf,
			pf_3_67 = EXCLUDED.pf_3_67, pf_8_33 = EXCLUDED.pf_8_33,
			esi_0_75 = EXCLUDED.esi_0_75, esi_3_25 = EXCLUDED.esi_3_25,
			tds = EXCLUDED.tds, sal_adv = EXCLUDED.sal_adv,
			additional_deduction = EXCLUDED.additional_deduction, loan = EXCLUDED.loan,
			advance = EXCLUDED.advance, lop_deduction = EXCLUDED.lop_deduction,
			company_statutory_contribution = EXCLUDED.company_statutory_contribution,
			reimb_medical = EXCLUDED.reimb_medical, reimb_lta = EXCLUDED.reimb_lta,
			zeta_meal_voucher = EXCLUDED.zeta_meal_voucher, reimb_travel = EXCLUDED.reimb_travel,
			total_reimbursement = EXCLUDED.total_reimbursement, epf_er = EXCLUDED.epf_er,
			net_incentive = EXCLUDED.net_incentive, total_deductions = EXCLUDED.total_deductions,
			actual_final_amount = EXCLUDED.actual_final_amount`
}

func epfInsertFromStagingSQL() string {
	return `INSERT INTO epf_records (employee_id, name, department, emp_level, doj, years_since_doj, doa, years_since_doa, epf_number, uan, esi_number)
		SELECT employee_id, name, department, emp_level, doj, years_since_doj, doa, years_since_doa, epf_number, uan, esi_number
		FROM import_staging_epf s WHERE s.job_id = $1`
}

func employeeConflictFields() []conflictField {
	return []conflictField{
		{"name", "name", "name"},
		{"department", "department", "department"},
		{"mobileNo", "mobile_number", "mobile_number"},
		{"level", "emp_level", "emp_level"},
		{"branch", "branch", "branch"},
		{"designation", "designation", "designation"},
		{"zone", "zone", "zone"},
		{"basic", "basic", "basic"},
		{"da", "da", "da"},
		{"revisedBasicDa", "revised_basic_da", "revised_basic_da"},
		{"hra", "hra", "hra"},
		{"bankName", "bank_name", "bank_name"},
		{"accountNumber", "account_number", "account_number"},
		{"ifscCode", "ifsc_code", "ifsc_code"},
	}
}

func epfConflictFields() []conflictField {
	return []conflictField{
		{"name", "name", "name"},
		{"department", "department", "department"},
		{"level", "emp_level", "emp_level"},
		{"epfNumber", "epf_number", "epf_number"},
		{"uan", "uan", "uan"},
		{"esiNumber", "esi_number", "esi_number"},
	}
}

func payrollConflictFields() []conflictField {
	return []conflictField{
		{"empNameSnapshot", "emp_name_snapshot", "emp_name_snapshot"},
		{"basic", "basic", "basic"},
		{"da", "da", "da"},
		{"hra", "hra", "hra"},
		{"actualFinalAmount", "actual_final_amount", "actual_final_amount"},
		{"totalDeductions", "total_deductions", "total_deductions"},
		{"pf", "pf", "pf"},
		{"tds", "tds", "tds"},
	}
}
