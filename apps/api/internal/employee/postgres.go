package employee

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

func (r *PostgresRepository) FindByPhone(ctx context.Context, phone string) (*Employee, error) {
	query := `
		SELECT 
			id, name, COALESCE(department, ''), mobile_number, COALESCE(emp_level, ''),
			COALESCE(doj::text, ''), COALESCE(years_experience, 0),
			COALESCE(branch, ''), COALESCE(designation, ''), COALESCE(zone, ''),
			basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, COALESCE(bank_name, ''), COALESCE(account_number, ''),
			COALESCE(bank_branch, ''), COALESCE(ifsc_code, ''), created_at, updated_at
		FROM employees
		WHERE mobile_number = $1 LIMIT 1
	`
	var e Employee
	err := r.db.QueryRow(ctx, query, phone).Scan(
		&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.YearsExperience,
		&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
		&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.WashAllowance,
		&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
		&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
		&e.IFSCCode, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("employee not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}
	return &e, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Employee, error) {
	query := `
		SELECT 
			id, name, COALESCE(department, ''), mobile_number, COALESCE(emp_level, ''),
			COALESCE(doj::text, ''), COALESCE(years_experience, 0),
			COALESCE(branch, ''), COALESCE(designation, ''), COALESCE(zone, ''),
			basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, COALESCE(bank_name, ''), COALESCE(account_number, ''),
			COALESCE(bank_branch, ''), COALESCE(ifsc_code, ''), 
			created_at, updated_at
		FROM employees
		WHERE id = $1 LIMIT 1
	`
	var e Employee
	err := r.db.QueryRow(ctx, query, id).Scan(
		&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.YearsExperience,
		&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
		&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.WashAllowance,
		&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
		&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
		&e.IFSCCode, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("employee not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}
	return &e, nil
}

func (r *PostgresRepository) VerifyIdentity(ctx context.Context, id, _ string) (*Employee, error) {
	return r.GetByID(ctx, id)
}

func (r *PostgresRepository) UpdatePhone(ctx context.Context, id, newPhone string) error {
	_, err := r.db.Exec(ctx, "UPDATE employees SET mobile_number = $1, updated_at = NOW() WHERE id = $2", newPhone, id)
	return err
}

func (r *PostgresRepository) BulkInsert(ctx context.Context, employees []Employee) error {
	_, err := r.db.CopyFrom(
		ctx,
		pgx.Identifier{"employees"},
		[]string{
			"id", "name", "department", "mobile_number", "emp_level", "doj", "years_experience",
			"branch", "designation", "zone", "basic", "da", "revised_basic_da", "hra", "travel",
			"hostel", "children", "total_salary", "mobile", "conveyance", "wash_allowance",
			"branch_allowance", "special_allowance", "training", "total_allowances",
			"total_salary_with_allowances", "bank_name", "account_number", "bank_branch", "ifsc_code",
		},
		pgx.CopyFromSlice(len(employees), func(i int) ([]interface{}, error) {
			e := employees[i]
			return []interface{}{
				e.ID, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), e.YearsExperience,
				e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
				e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.WashAllowance,
				e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
				e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
			}, nil
		}),
	)
	return err
}

func (r *PostgresRepository) List(ctx context.Context) ([]Employee, error) {
	query := `
		SELECT 
			id, name, COALESCE(department, ''), mobile_number, COALESCE(emp_level, ''),
			COALESCE(doj::text, ''), COALESCE(years_experience, 0),
			COALESCE(branch, ''), COALESCE(designation, ''), COALESCE(zone, ''),
			basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, COALESCE(bank_name, ''), COALESCE(account_number, ''),
			COALESCE(bank_branch, ''), COALESCE(ifsc_code, ''),
			created_at, updated_at
		FROM employees
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list employees: %w", err)
	}
	defer rows.Close()

	var employees []Employee
	for rows.Next() {
		var e Employee
		if err := rows.Scan(
			&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.YearsExperience,
			&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
			&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.WashAllowance,
			&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
			&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
			&e.IFSCCode, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		e.EmployeeID = e.ID
		e.Status = "Active"
		employees = append(employees, e)
	}
	return employees, rows.Err()
}

func (r *PostgresRepository) Create(ctx context.Context, e *Employee) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO employees (
			id, name, department, mobile_number, emp_level, doj, years_experience,
			branch, designation, zone, basic, da, revised_basic_da, hra, travel,
			hostel, children, total_salary, mobile, conveyance, wash_allowance,
			branch_allowance, special_allowance, training, total_allowances,
			total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
			$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
		)`,
		e.ID, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), e.YearsExperience,
		e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
		e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.WashAllowance,
		e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
		e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
	)
	return err
}

func (r *PostgresRepository) Update(ctx context.Context, id string, e *Employee) error {
	_, err := r.db.Exec(ctx, `
		UPDATE employees SET
			name=$2, department=$3, mobile_number=$4, emp_level=$5, doj=$6, years_experience=$7,
			branch=$8, designation=$9, zone=$10, basic=$11, da=$12, revised_basic_da=$13, hra=$14, travel=$15,
			hostel=$16, children=$17, total_salary=$18, mobile=$19, conveyance=$20, wash_allowance=$21,
			branch_allowance=$22, special_allowance=$23, training=$24, total_allowances=$25,
			total_salary_with_allowances=$26, bank_name=$27, account_number=$28, bank_branch=$29, ifsc_code=$30,
			updated_at=NOW()
		WHERE id=$1`,
		id, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), e.YearsExperience,
		e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
		e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.WashAllowance,
		e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
		e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
	)
	return err
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM employees WHERE id = $1", id)
	return err
}

func (r *PostgresRepository) DeleteAll(ctx context.Context) error {
	_, err := r.db.Exec(ctx, "DELETE FROM employees")
	return err
}
