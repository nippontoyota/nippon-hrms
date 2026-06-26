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
			mobile, conveyance, branch_allowance, wash_allowance, special_allowance,
			training, incentive, total_ear_with_incen, gross_sal_without_incentives,
			gross_for_pt, pf, pf_3_67, pf_8_33, esi_0_75, esi_3_25, tds, sal_adv,
			additional_deduction, loan, advance, lop_deduction,
			company_statutory_contribution, reimb_medical, reimb_lta, zeta_meal_voucher,
			reimb_travel, total_reimbursement, epf_er, net_incentive, total_deductions,
			actual_final_amount, created_at
		FROM payroll_records
		WHERE employee_id = $1 AND month = $2 AND year = $3 LIMIT 1
	`

	var rec Record
	err := r.db.QueryRow(ctx, query, employeeID, month, year).Scan(
		&rec.ID, &rec.EmployeeID, &rec.Month, &rec.Year, &rec.EmpNameSnapshot, &rec.Leaves,
		&rec.LOP, &rec.Days, &rec.Absents, &rec.Basic, &rec.DA, &rec.BasicDA, &rec.HRA,
		&rec.Travel, &rec.ChildrenHostel, &rec.ChildrenEducation, &rec.Mobile, &rec.Conveyance,
		&rec.BranchAllowance, &rec.WashAllowance, &rec.SpecialAllowance, &rec.Training,
		&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
		&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
		&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
		&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
		&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
		&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("payslip not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}

	return &rec, nil
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
			actual_final_amount, created_at
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
			&rec.BranchAllowance, &rec.WashAllowance, &rec.SpecialAllowance, &rec.Training,
			&rec.Incentive, &rec.TotalEarWithIncen, &rec.GrossSalWithoutIncentives, &rec.GrossForPT,
			&rec.PF, &rec.PF367, &rec.PF833, &rec.ESI075, &rec.ESI325, &rec.TDS, &rec.SalAdv,
			&rec.AdditionalDeduction, &rec.Loan, &rec.Advance, &rec.LOPDeduction,
			&rec.CompanyStatutoryContribution, &rec.ReimbMedical, &rec.ReimbLTA, &rec.ZetaMealVoucher,
			&rec.ReimbTravel, &rec.TotalReimbursement, &rec.EPFER, &rec.NetIncentive,
			&rec.TotalDeductions, &rec.ActualFinalAmount, &rec.CreatedAt,
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

func (r *PostgresRepository) BulkInsert(ctx context.Context, records []Record) error {
	// Use pgx.CopyFrom for lightning-fast bulk inserts
	_, err := r.db.CopyFrom(
		ctx,
		pgx.Identifier{"payroll_records"},
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
				rec.Mobile, rec.Conveyance, rec.BranchAllowance, rec.WashAllowance, rec.SpecialAllowance,
				rec.Training, rec.Incentive, rec.TotalEarWithIncen, rec.GrossSalWithoutIncentives,
				rec.GrossForPT, rec.PF, rec.PF367, rec.PF833, rec.ESI075, rec.ESI325, rec.TDS, rec.SalAdv,
				rec.AdditionalDeduction, rec.Loan, rec.Advance, rec.LOPDeduction,
				rec.CompanyStatutoryContribution, rec.ReimbMedical, rec.ReimbLTA, rec.ZetaMealVoucher,
				rec.ReimbTravel, rec.TotalReimbursement, rec.EPFER, rec.NetIncentive, rec.TotalDeductions,
				rec.ActualFinalAmount,
			}, nil
		}),
	)
	return err
}
