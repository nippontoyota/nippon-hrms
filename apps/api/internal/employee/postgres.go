package employee

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// parseDOJ converts any common date string or Excel serial number to *time.Time.
//
// Handles:
//   - Excel float serials: "38628" or "38628.5"  (excelize returns these for date cells)
//   - Named months: "02-Jan-2006", "2-Jan-06", etc.
//   - Numeric with any separator (/ - .): DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD,
//     single-digit day/month (3/9/2004), 2-digit years (03/09/04)
//
// Prefers DD-MM-YYYY (Indian standard) over MM-DD-YYYY when ambiguous.
func parseDOJ(raw string) *time.Time {
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil
	}

	// ── 1. Excel numeric serial (float handles both "38628" and "38628.5") ────
	if f, err := strconv.ParseFloat(s, 64); err == nil && f > 100 {
		epoch := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)
		t := epoch.AddDate(0, 0, int(f))
		return &t
	}

	// ── 2. Named-month text formats ───────────────────────────────────────────
	norm := strings.NewReplacer("/", "-", ".", "-").Replace(s)
	namedFormats := []string{
		"02-Jan-2006", "2-Jan-2006",
		"02-Jan-06", "2-Jan-06",
		"02-January-2006", "2-January-2006",
	}
	for _, f := range namedFormats {
		if t, err := time.Parse(f, norm); err == nil {
			return &t
		}
	}

	// ── 3. Numeric: detect separator and split into 3 integer parts ───────────
	var sep string
	for _, c := range []string{"-", "/", "."} {
		if strings.Contains(s, c) {
			sep = c
			break
		}
	}
	if sep == "" {
		return nil
	}
	parts := strings.SplitN(s, sep, 3)
	if len(parts) != 3 {
		return nil
	}
	a, errA := strconv.Atoi(strings.TrimSpace(parts[0]))
	b, errB := strconv.Atoi(strings.TrimSpace(parts[1]))
	c, errC := strconv.Atoi(strings.TrimSpace(parts[2]))
	if errA != nil || errB != nil || errC != nil {
		return nil
	}

	// validate and build: rejects out-of-range months/days and roll-over dates
	makeDate := func(year, month, day int) *time.Time {
		if month < 1 || month > 12 || day < 1 || day > 31 {
			return nil
		}
		t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		if t.Month() != time.Month(month) || t.Day() != day {
			return nil // Go rolled-over an invalid date (e.g. Feb 30)
		}
		return &t
	}

	twoDigitYear := func(y int) int {
		if y < 100 {
			if y < 50 {
				return 2000 + y
			}
			return 1900 + y
		}
		return y
	}

	// 4-digit year first → YYYY-MM-DD
	if a > 999 {
		if t := makeDate(a, b, c); t != nil {
			return t
		}
		// YYYY-DD-MM fallback
		return makeDate(a, c, b)
	}

	// 4-digit year last → DD-MM-YYYY (preferred) then MM-DD-YYYY
	if c > 999 {
		if t := makeDate(c, b, a); t != nil {
			return t
		}
		return makeDate(c, a, b)
	}

	// 2-digit year last → DD-MM-YY (preferred) then MM-DD-YY
	if t := makeDate(twoDigitYear(c), b, a); t != nil {
		return t
	}
	return makeDate(twoDigitYear(c), a, b)
}

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
				e.ID, e.Name, e.Department, e.MobileNumber, e.Level, parseDOJ(e.DOJ), e.YearsExperience,
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
			COALESCE(bank_branch, ''), COALESCE(ifsc_code, ''), created_at, updated_at
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
		e.ID, e.Name, e.Department, e.MobileNumber, e.Level, parseDOJ(e.DOJ), e.YearsExperience,
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
			name=$1, department=$2, mobile_number=$3, emp_level=$4, doj=$5, years_experience=$6,
			branch=$7, designation=$8, zone=$9, basic=$10, da=$11, revised_basic_da=$12, hra=$13,
			travel=$14, hostel=$15, children=$16, total_salary=$17, mobile=$18, conveyance=$19,
			wash_allowance=$20, branch_allowance=$21, special_allowance=$22, training=$23,
			total_allowances=$24, total_salary_with_allowances=$25, bank_name=$26,
			account_number=$27, bank_branch=$28, ifsc_code=$29, updated_at=NOW()
		WHERE id=$30`,
		e.Name, e.Department, e.MobileNumber, e.Level, parseDOJ(e.DOJ), e.YearsExperience,
		e.Branch, e.Designation, e.Zone, e.Basic, e.DA, e.RevisedBasicDA, e.HRA,
		e.Travel, e.Hostel, e.Children, e.TotalSalary, e.Mobile, e.Conveyance,
		e.WashAllowance, e.BranchAllowance, e.SpecialAllowance, e.Training, e.TotalAllowances,
		e.TotalSalaryWithAllowances, e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
		id,
	)
	return err
}

func (r *PostgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM employees WHERE id = $1", id)
	return err
}
