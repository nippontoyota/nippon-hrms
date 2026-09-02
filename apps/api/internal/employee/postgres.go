package employee

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/pkg/phone"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) FindByPhone(ctx context.Context, rawPhone string) (*Employee, error) {
	normalized := phone.NormalizeIndian(rawPhone)
	if normalized == "" {
		return nil, fmt.Errorf("employee not found")
	}
	query := `
		SELECT 
			e.id, e.name, COALESCE(e.department, ''), e.mobile_number, COALESCE(e.emp_level, ''),
			COALESCE(e.doj::text, ''), COALESCE(e.birthday::text, ''), COALESCE(e.years_experience, 0),
			COALESCE(e.branch, ''), COALESCE(e.designation, ''), COALESCE(e.zone, ''),
			e.basic, e.da, e.revised_basic_da, e.hra, e.travel, 
			e.hostel, e.children, e.total_salary, e.mobile, e.conveyance, e.wash_allowance, 
			e.branch_allowance, e.special_allowance, e.training, e.total_allowances, 
			e.total_salary_with_allowances, COALESCE(e.bank_name, ''), COALESCE(e.account_number, ''),
			COALESCE(e.bank_branch, ''), COALESCE(e.ifsc_code, ''), e.manager_id, COALESCE(m.name, ''), 
			e.is_health_card_eligible, COALESCE(e.health_card_no, ''), COALESCE(e.health_policy_no, ''), COALESCE(e.health_card_valid_upto, ''), 
			e.created_at, e.updated_at
		FROM employees e
		LEFT JOIN employees m ON e.manager_id = m.id
		WHERE RIGHT(REGEXP_REPLACE(e.mobile_number, '[^0-9]', '', 'g'), 10) = $1
		LIMIT 1
	`
	var e Employee
	err := r.db.QueryRow(ctx, query, normalized).Scan(
		&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.Birthday, &e.YearsExperience,
		&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
		&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.PerformanceAllowance,
		&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
		&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
		&e.IFSCCode, &e.ManagerID, &e.ManagerName, &e.IsHealthCardEligible,
		&e.HealthCardNo, &e.HealthPolicyNo, &e.HealthCardValidUpto,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("employee not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}
	e.EmployeeID = e.ID
	e.Status = "Active"
	return &e, nil
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*Employee, error) {
	query := `
		SELECT 
			e.id, e.name, COALESCE(e.department, ''), e.mobile_number, COALESCE(e.emp_level, ''),
			COALESCE(e.doj::text, ''), COALESCE(e.birthday::text, ''), COALESCE(e.years_experience, 0),
			COALESCE(e.branch, ''), COALESCE(e.designation, ''), COALESCE(e.zone, ''),
			e.basic, e.da, e.revised_basic_da, e.hra, e.travel, 
			e.hostel, e.children, e.total_salary, e.mobile, e.conveyance, e.wash_allowance, 
			e.branch_allowance, e.special_allowance, e.training, e.total_allowances, 
			e.total_salary_with_allowances, COALESCE(e.bank_name, ''), COALESCE(e.account_number, ''),
			COALESCE(e.bank_branch, ''), COALESCE(e.ifsc_code, ''), 
			e.manager_id, COALESCE(m.name, ''), 
			e.is_health_card_eligible, COALESCE(e.health_card_no, ''), COALESCE(e.health_policy_no, ''), COALESCE(e.health_card_valid_upto, ''),
			e.created_at, e.updated_at
		FROM employees e
		LEFT JOIN employees m ON e.manager_id = m.id
		WHERE e.id = $1 LIMIT 1
	`
	var e Employee
	err := r.db.QueryRow(ctx, query, id).Scan(
		&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.Birthday, &e.YearsExperience,
		&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
		&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.PerformanceAllowance,
		&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
		&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
		&e.IFSCCode, &e.ManagerID, &e.ManagerName, &e.IsHealthCardEligible,
		&e.HealthCardNo, &e.HealthPolicyNo, &e.HealthCardValidUpto,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("employee not found")
		}
		return nil, fmt.Errorf("query error: %w", err)
	}
	e.EmployeeID = e.ID
	e.Status = "Active"
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
			"id", "name", "department", "mobile_number", "emp_level", "doj", "birthday", "years_experience",
			"branch", "designation", "zone", "basic", "da", "revised_basic_da", "hra", "travel",
			"hostel", "children", "total_salary", "mobile", "conveyance", "wash_allowance",
			"branch_allowance", "special_allowance", "training", "total_allowances",
			"total_salary_with_allowances", "bank_name", "account_number", "bank_branch", "ifsc_code", "manager_id", "is_health_card_eligible",
		},
		pgx.CopyFromSlice(len(employees), func(i int) ([]interface{}, error) {
			e := employees[i]
			return []interface{}{
				e.ID, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), ParseDOJ(e.Birthday), e.YearsExperience,
				e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
				e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.PerformanceAllowance,
				e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
				e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode, e.ManagerID, e.IsHealthCardEligible,
			}, nil
		}),
	)
	return err
}

func (r *PostgresRepository) List(ctx context.Context) ([]Employee, error) {
	query := `
		SELECT 
			e.id, e.name, COALESCE(e.department, ''), e.mobile_number, COALESCE(e.emp_level, ''),
			COALESCE(e.doj::text, ''), COALESCE(e.birthday::text, ''), COALESCE(e.years_experience, 0),
			COALESCE(e.branch, ''), COALESCE(e.designation, ''), COALESCE(e.zone, ''),
			e.basic, e.da, e.revised_basic_da, e.hra, e.travel, 
			e.hostel, e.children, e.total_salary, e.mobile, e.conveyance, e.wash_allowance, 
			e.branch_allowance, e.special_allowance, e.training, e.total_allowances, 
			e.total_salary_with_allowances, COALESCE(e.bank_name, ''), COALESCE(e.account_number, ''),
			COALESCE(e.bank_branch, ''), COALESCE(e.ifsc_code, ''),
			e.manager_id, COALESCE(m.name, ''), e.is_health_card_eligible, COALESCE(e.health_card_no, ''), COALESCE(e.health_policy_no, ''), COALESCE(e.health_card_valid_upto, ''), e.created_at, e.updated_at
		FROM employees e
		LEFT JOIN employees m ON e.manager_id = m.id
		ORDER BY e.created_at DESC
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
			&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.Birthday, &e.YearsExperience,
			&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
			&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.PerformanceAllowance,
			&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
			&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
			&e.IFSCCode, &e.ManagerID, &e.ManagerName, &e.IsHealthCardEligible, &e.HealthCardNo, &e.HealthPolicyNo, &e.HealthCardValidUpto, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		e.EmployeeID = e.ID
		e.Status = "Active"
		employees = append(employees, e)
	}
	return employees, rows.Err()
}

func (r *PostgresRepository) ListPaginated(ctx context.Context, page, limit int, search string) (*ListResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	baseWhere := ""
	args := []interface{}{}
	if search != "" {
		baseWhere, args = employeeSearchClause(search)
	}

	countQ := `SELECT COUNT(*) FROM employees e` + baseWhere
	var total int
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, err
	}

	listQ := `
		SELECT 
			e.id, e.name, COALESCE(e.department, ''), e.mobile_number, COALESCE(e.emp_level, ''),
			COALESCE(e.doj::text, ''), COALESCE(e.birthday::text, ''), COALESCE(e.years_experience, 0),
			COALESCE(e.branch, ''), COALESCE(e.designation, ''), COALESCE(e.zone, ''),
			e.basic, e.da, e.revised_basic_da, e.hra, e.travel, 
			e.hostel, e.children, e.total_salary, e.mobile, e.conveyance, e.wash_allowance, 
			e.branch_allowance, e.special_allowance, e.training, e.total_allowances, 
			e.total_salary_with_allowances, COALESCE(e.bank_name, ''), COALESCE(e.account_number, ''),
			COALESCE(e.bank_branch, ''), COALESCE(e.ifsc_code, ''),
			e.manager_id, COALESCE(m.name, ''), e.is_health_card_eligible, COALESCE(e.health_card_no, ''), COALESCE(e.health_policy_no, ''), COALESCE(e.health_card_valid_upto, ''), e.created_at, e.updated_at
		FROM employees e
		LEFT JOIN employees m ON e.manager_id = m.id` + baseWhere + ` ORDER BY e.created_at DESC, e.id ASC LIMIT $` + fmt.Sprintf("%d", len(args)+1) + ` OFFSET $` + fmt.Sprintf("%d", len(args)+2)
	listArgs := append(args, limit, offset)

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var employees []Employee
	for rows.Next() {
		var e Employee
		if err := rows.Scan(
			&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.Birthday, &e.YearsExperience,
			&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
			&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.PerformanceAllowance,
			&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
			&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
			&e.IFSCCode, &e.ManagerID, &e.ManagerName, &e.IsHealthCardEligible, &e.HealthCardNo, &e.HealthPolicyNo, &e.HealthCardValidUpto, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		e.EmployeeID = e.ID
		e.Status = "Active"
		employees = append(employees, e)
	}
	if employees == nil {
		employees = []Employee{}
	}
	return &ListResult{Items: employees, Total: total, Page: page, Limit: limit}, rows.Err()
}

func (r *PostgresRepository) Create(ctx context.Context, e *Employee) error {
	if e.MobileNumber != "" {
		existing, _ := r.FindByPhone(ctx, e.MobileNumber)
		if existing != nil {
			return fmt.Errorf("duplicate mobile number: %s is already used by %s (%s)", e.MobileNumber, existing.Name, existing.ID)
		}
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO employees (
			id, name, department, mobile_number, emp_level, doj, birthday, years_experience,
			branch, designation, zone, basic, da, revised_basic_da, hra, travel,
			hostel, children, total_salary, mobile, conveyance, wash_allowance,
			branch_allowance, special_allowance, training, total_allowances,
			total_salary_with_allowances, bank_name, account_number, bank_branch, ifsc_code, manager_id, is_health_card_eligible
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
			$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
		)`,
		e.ID, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), ParseDOJ(e.Birthday), e.YearsExperience,
		e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
		e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.PerformanceAllowance,
		e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
		e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode, e.ManagerID, e.IsHealthCardEligible,
	)
	return err
}

func (r *PostgresRepository) Update(ctx context.Context, id string, e *Employee) error {
	if e.MobileNumber != "" {
		existing, _ := r.FindByPhone(ctx, e.MobileNumber)
		if existing != nil && existing.ID != id {
			return fmt.Errorf("duplicate mobile number: %s is already used by %s (%s)", e.MobileNumber, existing.Name, existing.ID)
		}
	}

	_, err := r.db.Exec(ctx, `
		UPDATE employees SET
			name=$2, department=$3, mobile_number=$4, emp_level=$5, doj=$6, birthday=$7, years_experience=$8,
			branch=$9, designation=$10, zone=$11, basic=$12, da=$13, revised_basic_da=$14, hra=$15, travel=$16,
			hostel=$17, children=$18, total_salary=$19, mobile=$20, conveyance=$21, wash_allowance=$22,
			branch_allowance=$23, special_allowance=$24, training=$25, total_allowances=$26,
			total_salary_with_allowances=$27, bank_name=$28, account_number=$29, bank_branch=$30, ifsc_code=$31,
			manager_id=$32, is_health_card_eligible=$33, updated_at=NOW()
		WHERE id=$1`,
		id, e.Name, e.Department, e.MobileNumber, e.Level, ParseDOJ(e.DOJ), ParseDOJ(e.Birthday), e.YearsExperience,
		e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel,
		e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance, e.PerformanceAllowance,
		e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
		e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode, e.ManagerID, e.IsHealthCardEligible,
	)
	return err
}

func employeeSearchClause(search string) (where string, args []interface{}) {
	if search == "" {
		return "", nil
	}
	return ` WHERE (e.id ILIKE $1 OR e.name ILIKE $1 OR COALESCE(e.department,'') ILIKE $1 OR e.mobile_number ILIKE $1)`,
		[]interface{}{"%" + search + "%"}
}

func (r *PostgresRepository) deleteEmployeesByIDs(ctx context.Context, ids []string) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE leaves SET reviewed_by = NULL WHERE reviewed_by = ANY($1)`, ids); err != nil {
		return 0, fmt.Errorf("clear leave reviewers: %w", err)
	}
	// Payroll is historical retention data. Employee removal must never delete
	// payslips; payroll_records intentionally keeps the employee ID and name
	// snapshot so former employees can still request their salary history.
	if _, err := tx.Exec(ctx, `DELETE FROM epf_records WHERE employee_id = ANY($1)`, ids); err != nil {
		return 0, fmt.Errorf("delete epf records: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM dispatch_job_items WHERE employee_id = ANY($1)`, ids); err != nil {
		return 0, fmt.Errorf("delete dispatch items: %w", err)
	}

	tag, err := tx.Exec(ctx, `DELETE FROM employees WHERE id = ANY($1)`, ids)
	if err != nil {
		return 0, fmt.Errorf("delete employees: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.deleteEmployeesByIDs(ctx, []string{id})
	return err
}

func (r *PostgresRepository) DeleteMany(ctx context.Context, ids []string) (int64, error) {
	return r.deleteEmployeesByIDs(ctx, ids)
}

func (r *PostgresRepository) DeleteManyByFilter(ctx context.Context, search string) (int64, error) {
	where, args := employeeSearchClause(search)
	query := `SELECT e.id FROM employees e` + where

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return 0, fmt.Errorf("list employees for delete: %w", err)
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return 0, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	return r.deleteEmployeesByIDs(ctx, ids)
}

func (r *PostgresRepository) DeleteAll(ctx context.Context) error {
	_, err := r.db.Exec(ctx, "DELETE FROM employees")
	return err
}

func (r *PostgresRepository) GetByEmployeeIDs(ctx context.Context, ids []string) ([]Employee, error) {
	if len(ids) == 0 {
		return []Employee{}, nil
	}

	query := `
		SELECT 
			e.id, e.name, COALESCE(e.department, ''), e.mobile_number, COALESCE(e.emp_level, ''),
			COALESCE(e.doj::text, ''), COALESCE(e.birthday::text, ''), COALESCE(e.years_experience, 0),
			COALESCE(e.branch, ''), COALESCE(e.designation, ''), COALESCE(e.zone, ''),
			e.basic, e.da, e.revised_basic_da, e.hra, e.travel, 
			e.hostel, e.children, e.total_salary, e.mobile, e.conveyance, e.wash_allowance, 
			e.branch_allowance, e.special_allowance, e.training, e.total_allowances, 
			e.total_salary_with_allowances, COALESCE(e.bank_name, ''), COALESCE(e.account_number, ''),
			COALESCE(e.bank_branch, ''), COALESCE(e.ifsc_code, ''), e.manager_id, COALESCE(m.name, ''), e.is_health_card_eligible, COALESCE(e.health_card_no, ''), COALESCE(e.health_policy_no, ''), COALESCE(e.health_card_valid_upto, ''), e.created_at, e.updated_at
		FROM employees e
		LEFT JOIN employees m ON e.manager_id = m.id
		WHERE e.id = ANY($1)
	`
	rows, err := r.db.Query(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("list employees by ids error: %w", err)
	}
	defer rows.Close()

	var employees []Employee
	for rows.Next() {
		var e Employee
		if err := rows.Scan(
			&e.ID, &e.Name, &e.Department, &e.MobileNumber, &e.Level, &e.DOJ, &e.Birthday, &e.YearsExperience,
			&e.Branch, &e.Designation, &e.Zone, &e.Basic, &e.DA, &e.RevisedBasicDA, &e.HRA, &e.Travel,
			&e.Hostel, &e.Children, &e.TotalSalary, &e.Mobile, &e.Conveyance, &e.PerformanceAllowance,
			&e.BranchAllowance, &e.SpecialAllowance, &e.Training, &e.TotalAllowances,
			&e.TotalSalaryWithAllowances, &e.BankName, &e.AccountNumber, &e.BankBranch,
			&e.IFSCCode, &e.ManagerID, &e.ManagerName, &e.IsHealthCardEligible, &e.HealthCardNo, &e.HealthPolicyNo, &e.HealthCardValidUpto, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		e.EmployeeID = e.ID
		e.Status = "Active"
		employees = append(employees, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return employees, nil
}
