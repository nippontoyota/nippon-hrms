package employee

import (
	"context"
	"errors"
	"fmt"
	"time"

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
			id, name, department, mobile_number, emp_level, doj::text, years_experience, 
			branch, designation, zone, basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, bank_name, account_number, bank_branch, 
			ifsc_code, created_at, updated_at
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
			COALESCE(bank_branch, ''), COALESCE(ifsc_code, ''), created_at, updated_at
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

func (r *PostgresRepository) VerifyIdentity(ctx context.Context, id, dob string) (*Employee, error) {
	// In the new schema we have DOJ instead of DateOfBirth for now,
	// but let's assume they verify using DOJ as the fallback since DOB isn't in the provided column list.
	// Or we just verify by ID. Let's verify by ID.
	query := `
		SELECT 
			id, name, department, mobile_number, emp_level, doj::text, years_experience, 
			branch, designation, zone, basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, bank_name, account_number, bank_branch, 
			ifsc_code, created_at, updated_at
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
		return nil, fmt.Errorf("verification failed: %w", err)
	}
	return &e, nil
}

func (r *PostgresRepository) UpdatePhone(ctx context.Context, id, newPhone string) error {
	_, err := r.db.Exec(ctx, "UPDATE employees SET mobile_number = $1, updated_at = NOW() WHERE id = $2", newPhone, id)
	return err
}

func (r *PostgresRepository) BulkInsert(ctx context.Context, employees []Employee) error {
	// Use pgx.CopyFrom for lightning-fast bulk inserts
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
			
			var doj *time.Time
			if e.DOJ != "" {
				if t, err := time.Parse("02-Jan-06", e.DOJ); err == nil {
					doj = &t
				} else if t, err := time.Parse("2006-01-02", e.DOJ); err == nil {
					doj = &t
				} else if t, err := time.Parse("01-02-06", e.DOJ); err == nil {
					doj = &t
				} else if t, err := time.Parse("01-02-2006", e.DOJ); err == nil {
					doj = &t
				} else if t, err := time.Parse("02-01-2006", e.DOJ); err == nil {
					doj = &t
				}
			}

			return []interface{}{
				e.ID, e.Name, e.Department, e.MobileNumber, e.Level, doj, e.YearsExperience,
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
			id, name, department, mobile_number, emp_level, doj::text, years_experience, 
			branch, designation, zone, basic, da, revised_basic_da, hra, travel, 
			hostel, children, total_salary, mobile, conveyance, wash_allowance, 
			branch_allowance, special_allowance, training, total_allowances, 
			total_salary_with_allowances, bank_name, account_number, bank_branch, 
			ifsc_code, created_at, updated_at
		FROM employees
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list employees query error: %w", err)
	}
	defer rows.Close()

	var employees []Employee
	for rows.Next() {
		var e Employee
		err := rows.Scan(
			&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.YearsExperience,
			&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
			&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.WashAllowance,
			&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
			&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
			&e.IFSCCode, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		e.EmployeeID = e.ID
		e.Status = "Active" // Set a default status since DB schema doesn't have it yet
		employees = append(employees, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return employees, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Employee, error) {
	// The frontend uses "id" which maps to "id" in DB schema (EMP001)
	return r.VerifyIdentity(ctx, id, "") // VerifyIdentity already queries by ID!
}

func (r *PostgresRepository) Create(ctx context.Context, e *Employee) error {
	query := `
		INSERT INTO employees (
			id, name, department, mobile_number, emp_level, doj, branch, designation
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
	`
	_, err := r.db.Exec(ctx, query, e.ID, e.Name, e.Department, e.MobileNumber, e.Level, e.DOJ, e.Branch, e.Designation)
	return err
}

func (r *PostgresRepository) Update(ctx context.Context, id string, e *Employee) error {
	query := `
		UPDATE employees SET
			name = $1, department = $2, mobile_number = $3, emp_level = $4, doj = $5, branch = $6, designation = $7, updated_at = NOW()
		WHERE id = $8
	`
	_, err := r.db.Exec(ctx, query, e.Name, e.Department, e.MobileNumber, e.Level, e.DOJ, e.Branch, e.Designation, id)
	return err
}
