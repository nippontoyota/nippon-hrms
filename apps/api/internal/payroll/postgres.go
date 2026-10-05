package payroll

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetPayslip(ctx context.Context, employeeID string, month, year int) (*Record, error) {
	query := `
		SELECT 
			id, employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
			basic, da, basic_da, hra, travel, children_hostel, children_education,
			mobile, conveyance, branch_allowance, wash_allowance, washing_allowance, fixed_incentive, special_allowance,
			training, incentive, total_ear_with_incen, gross_sal_without_incentives,
			gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
			additional_deduction, loan, advance, lop_deduction,
			company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
			reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
			actual_final_amount, created_at, dispatched_at
		FROM payroll_records
		WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1
	`

	var rec Record
	err := r.db.QueryRow(ctx, query, employeeID, month, year).Scan(
		&rec.ID, &rec.EmployeeID, &rec.Month, &rec.Year, &rec.EmpNameSnapshot, &rec.Leaves,
		&rec.LOP, &rec.Days, &rec.Absents, &rec.Basic, &rec.DA, &rec.BasicDA, &rec.HRA,
		&rec.Travel, &rec.ChildrenHostel, &rec.ChildrenEducation, &rec.Mobile, &rec.Conveyance,
		&rec.BranchAllowance, &rec.PerformanceAllowance, &rec.WashAllowance, &rec.FixedIncentive, &rec.SpecialAllowance, &rec.Training,
		&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
		&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
		&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
		&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
		&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
		&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt, &rec.DispatchedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("payslip not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}

	return &rec, nil
}

func (r *PostgresRepository) ListPeriodsByEmployee(ctx context.Context, employeeID string) ([]Period, error) {
	query := `
		SELECT DISTINCT month, year
		FROM payroll_records
		WHERE employee_id = $1
		ORDER BY year DESC, month DESC
	`
	rows, err := r.db.Query(ctx, query, employeeID)
	if err != nil {
		return nil, fmt.Errorf("list periods: %w", err)
	}
	defer rows.Close()

	var periods []Period
	for rows.Next() {
		var p Period
		if err := rows.Scan(&p.Month, &p.Year); err != nil {
			return nil, fmt.Errorf("scan period: %w", err)
		}
		periods = append(periods, p)
	}
	return periods, rows.Err()
}

func (r *PostgresRepository) ListRecordsByEmployee(ctx context.Context, employeeID string) ([]Record, error) {
	query := `
		SELECT 
			id, employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
			basic, da, basic_da, hra, travel, children_hostel, children_education,
			mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
			training, incentive, total_ear_with_incen, gross_sal_without_incentives,
			gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
			additional_deduction, loan, advance, lop_deduction,
			company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
			reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
			actual_final_amount, created_at, dispatched_at
		FROM payroll_records
		WHERE employee_id = $1
		ORDER BY year DESC, month DESC
	`
	rows, err := r.db.Query(ctx, query, employeeID)
	if err != nil {
		return nil, fmt.Errorf("list employee records: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var rec Record
		if err := rows.Scan(
			&rec.ID, &rec.EmployeeID, &rec.Month, &rec.Year, &rec.EmpNameSnapshot, &rec.Leaves,
			&rec.LOP, &rec.Days, &rec.Absents, &rec.Basic, &rec.DA, &rec.BasicDA, &rec.HRA,
			&rec.Travel, &rec.ChildrenHostel, &rec.ChildrenEducation, &rec.Mobile, &rec.Conveyance,
			&rec.BranchAllowance, &rec.PerformanceAllowance, &rec.SpecialAllowance, &rec.Training,
			&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
			&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
			&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
			&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
			&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
			&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt, &rec.DispatchedAt,
		); err != nil {
			return nil, fmt.Errorf("scan record: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *PostgresRepository) ListByPeriod(ctx context.Context, month, year int) ([]Record, error) {
	query := `
		SELECT 
			id, employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
			basic, da, basic_da, hra, travel, children_hostel, children_education,
			mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
			training, incentive, total_ear_with_incen, gross_sal_without_incentives,
			gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
			additional_deduction, loan, advance, lop_deduction,
			company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
			reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
			actual_final_amount, created_at, dispatched_at
		FROM payroll_records
		WHERE month = $1 AND year = $2
		ORDER BY employee_id
	`

	rows, err := r.db.Query(ctx, query, month, year)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var rec Record
		if err := rows.Scan(
			&rec.ID, &rec.EmployeeID, &rec.Month, &rec.Year, &rec.EmpNameSnapshot, &rec.Leaves,
			&rec.LOP, &rec.Days, &rec.Absents, &rec.Basic, &rec.DA, &rec.BasicDA, &rec.HRA,
			&rec.Travel, &rec.ChildrenHostel, &rec.ChildrenEducation, &rec.Mobile, &rec.Conveyance,
			&rec.BranchAllowance, &rec.PerformanceAllowance, &rec.SpecialAllowance, &rec.Training,
			&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
			&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
			&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
			&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
			&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
			&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt, &rec.DispatchedAt,
		); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		records = append(records, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return records, nil
}

func (r *PostgresRepository) ListByPeriodPaginated(ctx context.Context, month, year, page, limit int, search string) (*ListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	baseWhere := ` WHERE month = $1 AND year = $2`
	args := []interface{}{month, year}
	if search != "" {
		baseWhere += ` AND (employee_id ILIKE $3 OR emp_name_snapshot ILIKE $3)`
		args = append(args, "%"+search+"%")
	}

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM payroll_records`+baseWhere, args...).Scan(&total); err != nil {
		return nil, err
	}

	listQ := `
		SELECT 
			id, employee_id, month, year, emp_name_snapshot, leaves, lop, days, absents,
			basic, da, basic_da, hra, travel, children_hostel, children_education,
			mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
			training, incentive, total_ear_with_incen, gross_sal_without_incentives,
			gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
			additional_deduction, loan, advance, lop_deduction,
			company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
			reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
			actual_final_amount, created_at, dispatched_at
		FROM payroll_records` + baseWhere + fmt.Sprintf(` ORDER BY created_at DESC, id ASC LIMIT $%d OFFSET $%d`, len(args)+1, len(args)+2)
	listArgs := append(args, limit, offset)

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var rec Record
		if err := rows.Scan(
			&rec.ID, &rec.EmployeeID, &rec.Month, &rec.Year, &rec.EmpNameSnapshot, &rec.Leaves,
			&rec.LOP, &rec.Days, &rec.Absents, &rec.Basic, &rec.DA, &rec.BasicDA, &rec.HRA,
			&rec.Travel, &rec.ChildrenHostel, &rec.ChildrenEducation, &rec.Mobile, &rec.Conveyance,
			&rec.BranchAllowance, &rec.PerformanceAllowance, &rec.SpecialAllowance, &rec.Training,
			&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
			&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
			&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
			&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
			&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
			&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt, &rec.DispatchedAt,
		); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	if records == nil {
		records = []Record{}
	}
	return &ListResult{Items: records, Total: total, Page: page, Limit: limit}, rows.Err()
}

func (r *PostgresRepository) BulkInsert(ctx context.Context, records []Record) error {
	if len(records) == 0 {
		return nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		CREATE TEMP TABLE tmp_payroll_bulk (
			employee_id VARCHAR(50) NOT NULL,
			month INT NOT NULL,
			year INT NOT NULL,
			emp_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
			leaves FLOAT DEFAULT 0, lop FLOAT DEFAULT 0, days FLOAT DEFAULT 0, absents FLOAT DEFAULT 0,
			basic FLOAT DEFAULT 0, da FLOAT DEFAULT 0, basic_da FLOAT DEFAULT 0, hra FLOAT DEFAULT 0,
			travel FLOAT DEFAULT 0, children_hostel FLOAT DEFAULT 0, children_education FLOAT DEFAULT 0,
			mobile FLOAT DEFAULT 0, conveyance FLOAT DEFAULT 0, branch_allowance FLOAT DEFAULT 0,
			wash_allowance FLOAT DEFAULT 0, special_allowance FLOAT DEFAULT 0, training FLOAT DEFAULT 0,
			incentive FLOAT DEFAULT 0, total_ear_with_incen FLOAT DEFAULT 0,
			gross_sal_without_incentives FLOAT DEFAULT 0, gross_for_pt FLOAT DEFAULT 0,
			pf FLOAT DEFAULT 0, pf_3_67 FLOAT DEFAULT 0, pf_8_33 FLOAT DEFAULT 0,
			esi_0_75 FLOAT DEFAULT 0, esi_3_25 FLOAT DEFAULT 0, tds FLOAT DEFAULT 0, sal_adv FLOAT DEFAULT 0,
			additional_deduction FLOAT DEFAULT 0, loan FLOAT DEFAULT 0, advance FLOAT DEFAULT 0,
			lop_deduction FLOAT DEFAULT 0, company_statutory_contribution FLOAT DEFAULT 0,
			reimb_medical FLOAT DEFAULT 0, reimb_lta FLOAT DEFAULT 0, zeta_meal_voucher FLOAT DEFAULT 0,
			reimb_travel FLOAT DEFAULT 0, total_reimbursement FLOAT DEFAULT 0, epf_er FLOAT DEFAULT 0,
			net_incentive FLOAT DEFAULT 0, total_deductions FLOAT DEFAULT 0, actual_final_amount FLOAT DEFAULT 0
		) ON COMMIT DROP`); err != nil {
		return fmt.Errorf("create temp table: %w", err)
	}

	_, err = tx.CopyFrom(ctx, pgx.Identifier{"tmp_payroll_bulk"},
		[]string{
			"employee_id", "month", "year", "emp_name_snapshot", "leaves", "lop", "days", "absents",
			"basic", "da", "basic_da", "hra", "travel", "children_hostel", "children_education",
			"mobile", "conveyance", "branch_allowance", "wash_allowance", "special_allowance",
			"training", "incentive", "total_ear_with_incen", "gross_sal_without_incentives",
			"gross_for_pt", "pf", "pf_3_67", "pf_8_33", "esi_0_75", "esi_3_25", "tds", "sal_adv",
			"additional_deduction", "loan", "advance", "lop_deduction",
			"company_statutory_contribution", "reimb_medical", "reimb_lta", "zeta_meal_voucher",
			"reimb_travel", "total_reimbursement", "epf_er", "net_incentive", "total_deductions",
			"actual_final_amount",
		},
		pgx.CopyFromSlice(len(records), func(i int) ([]interface{}, error) {
			rec := records[i]
			return []interface{}{
				rec.EmployeeID, rec.Month, rec.Year, rec.EmpNameSnapshot, rec.Leaves, rec.LOP, rec.Days, rec.Absents,
				rec.Basic, rec.DA, rec.BasicDA, rec.HRA, rec.Travel, rec.ChildrenHostel, rec.ChildrenEducation,
				rec.Mobile, rec.Conveyance, rec.BranchAllowance, rec.PerformanceAllowance, rec.SpecialAllowance,
				rec.Training, rec.Incentive, rec.TotalEarWithIncen, rec.GrossSalWithoutIncentives,
				rec.GrossForPT, rec.PF, rec.PF367, rec.PF833, rec.ESI075, rec.ESI325, rec.TDS, rec.SalAdv,
				rec.AdditionalDeduction, rec.Loan, rec.Advance, rec.LOPDeduction,
				rec.CompanyStatutoryContribution, rec.ReimbMedical, rec.ReimbLTA, rec.ZetaMealVoucher,
				rec.ReimbTravel, rec.TotalReimbursement, rec.EPFER, rec.NetIncentive, rec.TotalDeductions,
				rec.ActualFinalAmount,
			}, nil
		}),
	)
	if err != nil {
		return fmt.Errorf("copy payroll records: %w", err)
	}

	_, err = tx.Exec(ctx, `
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
		SELECT * FROM tmp_payroll_bulk
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
			actual_final_amount = EXCLUDED.actual_final_amount`)
	if err != nil {
		return fmt.Errorf("upsert payroll records: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.Exec(ctx, "DELETE FROM payroll_records WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete payroll record: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("payroll record not found")
	}
	return nil
}

func (r *PostgresRepository) MarkAsDispatched(ctx context.Context, month, year int) error {
	_, err := r.db.Exec(ctx, "UPDATE payroll_records SET dispatched_at = CURRENT_TIMESTAMP WHERE month = $1 AND year = $2", month, year)
	return err
}

func (r *PostgresRepository) ClearDispatched(ctx context.Context, month, year int) error {
	_, err := r.db.Exec(ctx, "UPDATE payroll_records SET dispatched_at = NULL WHERE month = $1 AND year = $2", month, year)
	return err
}

func (r *PostgresRepository) DeleteByPeriod(ctx context.Context, month, year int) error {
	_, err := r.db.Exec(ctx, "DELETE FROM payroll_records WHERE month = $1 AND year = $2", month, year)
	return err
}
