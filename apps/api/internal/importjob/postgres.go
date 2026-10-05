package importjob

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) HasRunningJob(ctx context.Context, entity EntityType) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM import_jobs
			WHERE entity_type = $1 AND status IN ('PENDING', 'PARSING', 'LOADING')
		)`, string(entity)).Scan(&exists)
	return exists, err
}

func (r *Repository) CreateJob(ctx context.Context, entity EntityType, mode Mode, month, year *int, fileName string, format FileFormat, createdBy string) (*Job, error) {
	var j Job
	var monthVal, yearVal *int
	err := r.db.QueryRow(ctx, `
		INSERT INTO import_jobs (entity_type, mode, month, year, file_name, file_format, created_by, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
		RETURNING id, entity_type, mode, month, year, status, file_name, file_format, created_by,
		          total_rows, inserted, skipped_identical, rejected, conflicts_pending,
		          COALESCE(error_message, ''), created_at, updated_at, completed_at`,
		string(entity), string(mode), month, year, fileName, string(format), createdBy,
	).Scan(
		&j.ID, &j.EntityType, &j.Mode, &monthVal, &yearVal, &j.Status, &j.FileName, &j.FileFormat,
		&j.CreatedBy, &j.TotalRows, &j.Inserted, &j.SkippedIdentical, &j.Rejected, &j.ConflictsPending,
		&j.ErrorMessage, &j.CreatedAt, &j.UpdatedAt, &j.CompletedAt,
	)
	j.Month = monthVal
	j.Year = yearVal
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *Repository) GetJob(ctx context.Context, jobID string) (*Job, error) {
	var j Job
	var monthVal, yearVal *int
	err := r.db.QueryRow(ctx, `
		SELECT id, entity_type, mode, month, year, status, file_name, file_format, created_by,
		       total_rows, inserted, skipped_identical, rejected, conflicts_pending,
		       COALESCE(error_message, ''), created_at, updated_at, completed_at
		FROM import_jobs WHERE id = $1`, jobID,
	).Scan(
		&j.ID, &j.EntityType, &j.Mode, &monthVal, &yearVal, &j.Status, &j.FileName, &j.FileFormat,
		&j.CreatedBy, &j.TotalRows, &j.Inserted, &j.SkippedIdentical, &j.Rejected, &j.ConflictsPending,
		&j.ErrorMessage, &j.CreatedAt, &j.UpdatedAt, &j.CompletedAt,
	)
	j.Month = monthVal
	j.Year = yearVal
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("import job not found")
		}
		return nil, err
	}
	return &j, nil
}

func (r *Repository) GetLatestCompletedJob(ctx context.Context, entity EntityType, mode Mode) (*Job, error) {
	var j Job
	var monthVal, yearVal *int
	err := r.db.QueryRow(ctx, `
		SELECT id, entity_type, mode, month, year, status, file_name, file_format, created_by,
		       total_rows, inserted, skipped_identical, rejected, conflicts_pending,
		       COALESCE(error_message, ''), created_at, updated_at, completed_at
		FROM import_jobs
		WHERE entity_type = $1 AND mode = $2 AND status = 'COMPLETED' AND conflicts_pending > 0
		ORDER BY completed_at DESC NULLS LAST
		LIMIT 1`, string(entity), string(mode),
	).Scan(
		&j.ID, &j.EntityType, &j.Mode, &monthVal, &yearVal, &j.Status, &j.FileName, &j.FileFormat,
		&j.CreatedBy, &j.TotalRows, &j.Inserted, &j.SkippedIdentical, &j.Rejected, &j.ConflictsPending,
		&j.ErrorMessage, &j.CreatedAt, &j.UpdatedAt, &j.CompletedAt,
	)
	j.Month = monthVal
	j.Year = yearVal
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &j, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, jobID string, status Status) error {
	_, err := r.db.Exec(ctx, `UPDATE import_jobs SET status = $2, updated_at = NOW() WHERE id = $1`, jobID, string(status))
	return err
}

func (r *Repository) CompleteJob(ctx context.Context, jobID string, total, inserted, skipped, rejected, conflicts int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE import_jobs SET
			status = 'COMPLETED', total_rows = $2, inserted = $3, skipped_identical = $4,
			rejected = $5, conflicts_pending = $6, updated_at = NOW(), completed_at = NOW()
		WHERE id = $1`, jobID, total, inserted, skipped, rejected, conflicts)
	return err
}

func (r *Repository) FailJob(ctx context.Context, jobID string, errMsg string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE import_jobs SET status = 'FAILED', error_message = $2, updated_at = NOW(), completed_at = NOW()
		WHERE id = $1`, jobID, errMsg)
	return err
}

func (r *Repository) InsertErrors(ctx context.Context, jobID string, errs []JobError) error {
	if len(errs) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, e := range errs {
		batch.Queue(`INSERT INTO import_job_errors (job_id, row_num, message) VALUES ($1, $2, $3)`, jobID, e.RowNum, e.Message)
	}
	br := r.db.SendBatch(ctx, batch)
	defer br.Close()
	for range errs {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListErrors(ctx context.Context, jobID string, page, limit int) (*PaginatedErrors, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM import_job_errors WHERE job_id = $1`, jobID).Scan(&total); err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, row_num, message FROM import_job_errors
		WHERE job_id = $1 ORDER BY row_num LIMIT $2 OFFSET $3`, jobID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []JobError
	for rows.Next() {
		var e JobError
		if err := rows.Scan(&e.ID, &e.RowNum, &e.Message); err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	if items == nil {
		items = []JobError{}
	}
	return &PaginatedErrors{Items: items, Total: total, Page: page, Limit: limit}, rows.Err()
}

func (r *Repository) ListConflicts(ctx context.Context, jobID string, page, limit int, search string) (*PaginatedConflicts, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit
	search = strings.TrimSpace(search)

	var total int
	countQ := `SELECT COUNT(*) FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`
	countArgs := []interface{}{jobID}
	if search != "" {
		countQ += ` AND (natural_key ILIKE $2 OR field_name ILIKE $2)`
		countArgs = append(countArgs, "%"+search+"%")
	}
	if err := r.db.QueryRow(ctx, countQ, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	listQ := `
		SELECT id, natural_key, field_name, COALESCE(existing_value, ''), COALESCE(imported_value, ''), resolution
		FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`
	listArgs := []interface{}{jobID}
	if search != "" {
		listQ += ` AND (natural_key ILIKE $2 OR field_name ILIKE $2)`
		listArgs = append(listArgs, "%"+search+"%")
		listQ += fmt.Sprintf(` ORDER BY natural_key, field_name LIMIT $%d OFFSET $%d`, len(listArgs)+1, len(listArgs)+2)
		listArgs = append(listArgs, limit, offset)
	} else {
		listQ += ` ORDER BY natural_key, field_name LIMIT $2 OFFSET $3`
		listArgs = append(listArgs, limit, offset)
	}

	rows, err := r.db.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Conflict
	for rows.Next() {
		var c Conflict
		if err := rows.Scan(&c.ID, &c.NaturalKey, &c.FieldName, &c.ExistingValue, &c.ImportedValue, &c.Resolution); err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	if items == nil {
		items = []Conflict{}
	}
	return &PaginatedConflicts{Items: items, Total: total, Page: page, Limit: limit}, rows.Err()
}

func (r *Repository) CopyStagingEmployees(ctx context.Context, jobID string, rows []*StagingEmployee) error {
	if len(rows) == 0 {
		return nil
	}
	_, err := r.db.CopyFrom(ctx, pgx.Identifier{"import_staging_employees"},
		[]string{
			"job_id", "row_num", "row_hash", "id", "name", "department", "mobile_number", "emp_level",
			"doj", "birthday", "years_experience", "branch", "designation", "zone", "basic", "da", "revised_basic_da",
			"hra", "travel", "hostel", "children", "total_salary", "mobile", "conveyance", "wash_allowance",
			"branch_allowance", "washing_allowance", "fixed_incentive", "special_allowance", "training", "total_allowances", "total_salary_with_allowances",
			"bank_name", "account_number", "bank_branch", "ifsc_code",
		},
		pgx.CopyFromSlice(len(rows), func(i int) ([]interface{}, error) {
			e := rows[i]
			return []interface{}{
				jobID, e.RowNum, e.RowHash, e.ID, e.Name, e.Department, e.MobileNumber, e.Level,
				e.DOJDate, e.BirthdayDate, e.YearsExperience, e.Branch, e.Designation, e.Zone,
				e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel, e.Hostel, e.Children, e.TotalSalary,
				e.Mobile, e.Conveyance, e.PerformanceAllowance, e.BranchAllowance, e.WashAllowance, e.FixedIncentive, e.SpecialAllowance, e.Training,
				e.TotalAllowances, e.TotalSalaryWithAllowances,
				e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
			}, nil
		}),
	)
	return err
}

func (r *Repository) CopyStagingEPF(ctx context.Context, jobID string, rows []*StagingEPF) error {
	if len(rows) == 0 {
		return nil
	}
	_, err := r.db.CopyFrom(ctx, pgx.Identifier{"import_staging_epf"},
		[]string{
			"job_id", "row_num", "row_hash", "employee_id", "name", "department", "emp_level",
			"doj", "years_since_doj", "doa", "years_since_doa", "epf_number", "uan", "esi_number",
		},
		pgx.CopyFromSlice(len(rows), func(i int) ([]interface{}, error) {
			e := rows[i]
			return []interface{}{
				jobID, e.RowNum, e.RowHash, e.EmployeeID, e.Name, e.Department, e.Level,
				e.DOJDate, e.YearsSinceDOJ, e.DOADate, e.YearsSinceDOA,
				e.EPFNumber, e.UAN, e.ESINumber,
			}, nil
		}),
	)
	return err
}

func (r *Repository) CopyStagingPayroll(ctx context.Context, jobID string, rows []*StagingPayroll) error {
	if len(rows) == 0 {
		return nil
	}
	_, err := r.db.CopyFrom(ctx, pgx.Identifier{"import_staging_payroll"},
		[]string{
			"job_id", "row_num", "row_hash", "employee_id", "month", "year", "emp_name_snapshot",
			"leaves", "lop", "days", "absents", "basic", "da", "basic_da", "hra", "travel",
			"children_hostel", "children_education", "mobile", "conveyance", "branch_allowance",
			"wash_allowance", "washing_allowance", "fixed_incentive", "special_allowance", "training", "incentive", "total_ear_with_incen",
			"gross_sal_without_incentives", "gross_for_pt", "pf", "pf_3_67", "pf_8_33", "esi_0_75",
			"esi_3_25", "tds", "sal_adv", "additional_deduction", "loan", "advance", "lop_deduction",
			"company_statutory_contribution", "reimb_medical", "reimb_lta", "zeta_meal_voucher",
			"reimb_travel", "total_reimbursement", "epf_er", "net_incentive", "total_deductions",
			"actual_final_amount",
		},
		pgx.CopyFromSlice(len(rows), func(i int) ([]interface{}, error) {
			p := rows[i]
			return []interface{}{
				jobID, p.RowNum, p.RowHash, p.EmployeeID, p.Month, p.Year, p.EmpNameSnapshot,
				p.Leaves, p.LOP, p.Days, p.Absents, p.Basic, p.DA, p.BasicDA, p.HRA, p.Travel,
				p.ChildrenHostel, p.ChildrenEducation, p.Mobile, p.Conveyance, p.BranchAllowance,
				p.PerformanceAllowance, p.WashAllowance, p.FixedIncentive, p.SpecialAllowance, p.Training, p.Incentive, p.TotalEarWithIncen,
				p.GrossSalWithoutIncentives, p.GrossForPT, p.PF, p.PF367, p.PF833, p.ESI075, p.ESI325,
				p.TDS, p.SalAdv, p.AdditionalDeduction, p.Loan, p.Advance, p.LOPDeduction,
				p.CompanyStatutoryContribution, p.ReimbMedical, p.ReimbLTA, p.ZetaMealVoucher,
				p.ReimbTravel, p.TotalReimbursement, p.EPFER, p.NetIncentive, p.TotalDeductions,
				p.ActualFinalAmount,
			}, nil
		}),
	)
	return err
}

type mergeStats struct {
	Inserted         int
	SkippedIdentical int
	Conflicts        int
}

func (r *Repository) Merge(ctx context.Context, job *Job) (*mergeStats, error) {
	switch job.EntityType {
	case EntityEmployees:
		return r.mergeEmployees(ctx, job.ID, job.Mode)
	case EntityEPF:
		return r.mergeEPF(ctx, job.ID, job.Mode)
	case EntityPayroll:
		return r.mergePayroll(ctx, job.ID, job.Mode, *job.Month, *job.Year)
	default:
		return nil, fmt.Errorf("unknown entity type: %s", job.EntityType)
	}
}

func (r *Repository) mergeEmployees(ctx context.Context, jobID string, mode Mode) (*mergeStats, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	stats := &mergeStats{}

	if mode == ModeReplace {
		if _, err := tx.Exec(ctx, `DELETE FROM employees`); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, employeeInsertFromStagingSQL(), jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
	} else {
		if err := detectConflicts(ctx, tx, jobID, "employees", employeeConflictFields()); err != nil {
			return nil, err
		}
		if err := tx.QueryRow(ctx, `SELECT COUNT(DISTINCT natural_key) FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`, jobID).Scan(&stats.Conflicts); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO employees (`+employeeCols()+`)
			SELECT `+employeeStagingCols("s")+`
			FROM import_staging_employees s
			WHERE s.job_id = $1 AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = s.id)`, jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*) FROM import_staging_employees s
			INNER JOIN employees e ON e.id = s.id
			WHERE s.job_id = $1
			AND NOT EXISTS (SELECT 1 FROM import_conflicts c WHERE c.job_id = $1 AND c.natural_key = s.id)`, jobID).Scan(&stats.SkippedIdentical); err != nil {
			return nil, err
		}
		stats.SkippedIdentical -= stats.Conflicts
		if stats.SkippedIdentical < 0 {
			stats.SkippedIdentical = 0
		}
	}

	return stats, tx.Commit(ctx)
}

func (r *Repository) mergeEPF(ctx context.Context, jobID string, mode Mode) (*mergeStats, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	stats := &mergeStats{}
	if mode == ModeReplace {
		if _, err := tx.Exec(ctx, `DELETE FROM epf_records`); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, epfInsertFromStagingSQL(), jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
	} else {
		if err := detectConflicts(ctx, tx, jobID, "epf", epfConflictFields()); err != nil {
			return nil, err
		}
		if err := tx.QueryRow(ctx, `SELECT COUNT(DISTINCT natural_key) FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`, jobID).Scan(&stats.Conflicts); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO epf_records (employee_id, name, department, emp_level, doj, years_since_doj, doa, years_since_doa, epf_number, uan, esi_number)
			SELECT s.employee_id, e.name, e.department, e.emp_level, e.doj, s.years_since_doj, s.doa, s.years_since_doa, s.epf_number, s.uan, s.esi_number
			FROM import_staging_epf s
			JOIN employees e ON s.employee_id = e.id
			WHERE s.job_id = $1 AND NOT EXISTS (SELECT 1 FROM epf_records er WHERE er.employee_id = s.employee_id)`, jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*) FROM import_staging_epf s
			INNER JOIN epf_records e ON e.employee_id = s.employee_id
			WHERE s.job_id = $1
			AND NOT EXISTS (SELECT 1 FROM import_conflicts c WHERE c.job_id = $1 AND c.natural_key = s.employee_id)`, jobID).Scan(&stats.SkippedIdentical); err != nil {
			return nil, err
		}
		stats.SkippedIdentical -= stats.Conflicts
		if stats.SkippedIdentical < 0 {
			stats.SkippedIdentical = 0
		}
	}
	return stats, tx.Commit(ctx)
}

func (r *Repository) mergePayroll(ctx context.Context, jobID string, mode Mode, month, year int) (*mergeStats, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	stats := &mergeStats{}
	if mode == ModeReplace {
		if _, err := tx.Exec(ctx, `DELETE FROM payroll_records WHERE month = $1 AND year = $2`, month, year); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, payrollUpsertFromStagingSQL(), jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
	} else {
		if err := detectPayrollConflicts(ctx, tx, jobID); err != nil {
			return nil, err
		}
		if err := tx.QueryRow(ctx, `SELECT COUNT(DISTINCT natural_key) FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`, jobID).Scan(&stats.Conflicts); err != nil {
			return nil, err
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO payroll_records (`+payrollCols()+`)
			SELECT `+payrollStagingCols("s")+`
			FROM import_staging_payroll s
			WHERE s.job_id = $1
			AND NOT EXISTS (
				SELECT 1 FROM payroll_records p
				WHERE p.employee_id = s.employee_id AND p.month = s.month AND p.year = s.year
			)`, jobID)
		if err != nil {
			return nil, err
		}
		stats.Inserted = int(tag.RowsAffected())
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*) FROM import_staging_payroll s
			INNER JOIN payroll_records p ON p.employee_id = s.employee_id AND p.month = s.month AND p.year = s.year
			WHERE s.job_id = $1
			AND NOT EXISTS (SELECT 1 FROM import_conflicts c WHERE c.job_id = $1 AND c.natural_key = (s.employee_id || '|' || s.month || '|' || s.year))`, jobID).Scan(&stats.SkippedIdentical); err != nil {
			return nil, err
		}
		stats.SkippedIdentical -= stats.Conflicts
		if stats.SkippedIdentical < 0 {
			stats.SkippedIdentical = 0
		}
	}
	return stats, tx.Commit(ctx)
}

type conflictField struct {
	name string
	sCol string
	eCol string
}

func detectConflicts(ctx context.Context, tx pgx.Tx, jobID, entityType string, fields []conflictField) error {
	var stagingTable, joinKey, naturalKeyExpr string
	switch entityType {
	case "employees":
		stagingTable = "import_staging_employees"
		joinKey = "e.id = s.id"
		naturalKeyExpr = "s.id"
	case "epf":
		stagingTable = "import_staging_epf"
		joinKey = "e.employee_id = s.employee_id"
		naturalKeyExpr = "s.employee_id"
	default:
		return fmt.Errorf("unsupported entity for conflicts: %s", entityType)
	}

	target := targetTable(entityType)
	for _, f := range fields {
		q := fmt.Sprintf(`
			INSERT INTO import_conflicts (job_id, entity_type, natural_key, field_name, existing_value, imported_value)
			SELECT $1, $2, %s, $3,
				COALESCE(e.%s::text, ''),
				COALESCE(s.%s::text, '')
			FROM %s s
			INNER JOIN %s e ON %s
			WHERE s.job_id = $1
			AND COALESCE(e.%s::text, '') IS DISTINCT FROM COALESCE(s.%s::text, '')`,
			naturalKeyExpr, f.eCol, f.sCol, stagingTable, target, joinKey, f.eCol, f.sCol)
		if _, err := tx.Exec(ctx, q, jobID, entityType, f.name); err != nil {
			return fmt.Errorf("conflict %s: %w", f.name, err)
		}
	}
	return nil
}

func targetTable(entityType string) string {
	switch entityType {
	case "employees":
		return "employees"
	case "epf":
		return "epf_records"
	default:
		return entityType
	}
}

func detectPayrollConflicts(ctx context.Context, tx pgx.Tx, jobID string) error {
	fields := payrollConflictFields()
	for _, f := range fields {
		q := fmt.Sprintf(`
			INSERT INTO import_conflicts (job_id, entity_type, natural_key, field_name, existing_value, imported_value)
			SELECT $1, 'payroll',
				s.employee_id || '|' || s.month || '|' || s.year,
				$2,
				COALESCE(p.%s::text, ''),
				COALESCE(s.%s::text, '')
			FROM import_staging_payroll s
			INNER JOIN payroll_records p ON p.employee_id = s.employee_id AND p.month = s.month AND p.year = s.year
			WHERE s.job_id = $1
			AND COALESCE(p.%s::text, '') IS DISTINCT FROM COALESCE(s.%s::text, '')`,
			f.eCol, f.sCol, f.eCol, f.sCol)
		if _, err := tx.Exec(ctx, q, jobID, f.name); err != nil {
			return fmt.Errorf("payroll conflict %s: %w", f.name, err)
		}
	}
	return nil
}

func (r *Repository) ResolveConflicts(ctx context.Context, jobID string, conflictIDs []string, resolution Resolution) (int, error) {
	if len(conflictIDs) == 0 {
		return 0, nil
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	job, err := r.GetJob(ctx, jobID)
	if err != nil {
		return 0, err
	}

	for _, cid := range conflictIDs {
		var naturalKey, fieldName string
		err := tx.QueryRow(ctx, `
			SELECT natural_key, field_name FROM import_conflicts
			WHERE id = $1 AND job_id = $2 AND resolution = 'pending'`, cid, jobID).Scan(&naturalKey, &fieldName)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return 0, err
		}

		if resolution == ResolutionUseImported {
			if err := applyImportedValue(ctx, tx, job, naturalKey, fieldName, jobID); err != nil {
				return 0, err
			}
		}

		if _, err := tx.Exec(ctx, `UPDATE import_conflicts SET resolution = $2 WHERE id = $1`, cid, string(resolution)); err != nil {
			return 0, err
		}
	}

	var pending int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`, jobID).Scan(&pending); err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `UPDATE import_jobs SET conflicts_pending = $2, updated_at = NOW() WHERE id = $1`, jobID, pending); err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return len(conflictIDs), nil
}

func (r *Repository) ResolveAllConflicts(ctx context.Context, jobID string, resolution Resolution) (int, error) {
	rows, err := r.db.Query(ctx, `SELECT id FROM import_conflicts WHERE job_id = $1 AND resolution = 'pending'`, jobID)
	if err != nil {
		return 0, err
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
	return r.ResolveConflicts(ctx, jobID, ids, resolution)
}

func applyImportedValue(ctx context.Context, tx pgx.Tx, job *Job, naturalKey, fieldName, jobID string) error {
	col := fieldToColumn(fieldName, job.EntityType)
	if col == "" {
		return nil
	}

	switch job.EntityType {
	case EntityEmployees:
		_, err := tx.Exec(ctx, fmt.Sprintf(`
			UPDATE employees e SET %s = s.%s, updated_at = NOW()
			FROM import_staging_employees s
			WHERE s.job_id = $1 AND s.id = $2 AND e.id = s.id`, col, col), jobID, naturalKey)
		return err
	case EntityEPF:
		_, err := tx.Exec(ctx, fmt.Sprintf(`
			UPDATE epf_records e SET %s = s.%s, updated_at = NOW()
			FROM import_staging_epf s
			WHERE s.job_id = $1 AND s.employee_id = $2 AND e.employee_id = s.employee_id`, col, col), jobID, naturalKey)
		return err
	case EntityPayroll:
		empID, month, year, ok := ParsePayrollNaturalKey(naturalKey)
		if !ok {
			return fmt.Errorf("invalid payroll natural key: %s", naturalKey)
		}
		_, err := tx.Exec(ctx, fmt.Sprintf(`
			UPDATE payroll_records p SET %s = s.%s
			FROM import_staging_payroll s
			WHERE s.job_id = $1 AND s.employee_id = $2 AND s.month = $3 AND s.year = $4
			AND p.employee_id = s.employee_id AND p.month = s.month AND p.year = s.year`, col, col),
			jobID, empID, month, year)
		return err
	}
	return nil
}

func fieldToColumn(fieldName string, entity EntityType) string {
	maps := map[EntityType]map[string]string{
		EntityEmployees: {
			"name": "name", "department": "department", "mobileNo": "mobile_number",
			"level": "emp_level", "birthday": "birthday", "branch": "branch", "designation": "designation", "zone": "zone",
			"basic": "basic", "da": "da", "revisedBasicDa": "revised_basic_da", "hra": "hra",
			"bankName": "bank_name", "accountNumber": "account_number", "ifscCode": "ifsc_code",
		},
		EntityEPF: {
			"name": "name", "department": "department", "level": "emp_level",
			"epfNumber": "epf_number", "uan": "uan", "esiNumber": "esi_number",
		},
		EntityPayroll: {
			"empNameSnapshot": "emp_name_snapshot", "basic": "basic", "da": "da", "hra": "hra",
			"actualFinalAmount": "actual_final_amount", "totalDeductions": "total_deductions",
			"pf": "pf", "tds": "tds",
		},
	}
	if m, ok := maps[entity]; ok {
		if col, ok := m[fieldName]; ok {
			return col
		}
	}
	// fallback: snake_case field names from SQL conflict detection
	return strings.ReplaceAll(fieldName, "-", "_")
}

// SQL helpers in merge_sql.go
