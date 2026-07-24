package leave

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, req *LeaveRequest) error {
	query := `
		INSERT INTO leaves (employee_id, type, from_date, to_date, days, reason, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	err := r.db.QueryRow(ctx, query,
		req.EmployeeID,
		req.Type,
		req.FromDate,
		req.ToDate,
		req.Days,
		req.Reason,
		req.Status,
	).Scan(&req.ID, &req.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create leave request: %w", err)
	}
	return nil
}

func (r *PostgresRepository) ListAll(ctx context.Context) ([]LeaveRequest, error) {
	query := `
		SELECT 
			l.id, l.employee_id, l.type, l.from_date, l.to_date, l.days, l.reason, l.status, l.rejection_reason, l.reviewed_by, l.reviewed_at, l.created_at,
			e.name, COALESCE(e.department, ''), e.mobile_number, e.manager_id, COALESCE(m.name, '')
		FROM leaves l
		JOIN employees e ON l.employee_id = e.id
		LEFT JOIN employees m ON e.manager_id = m.id
		ORDER BY l.created_at DESC
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query leaves: %w", err)
	}
	defer rows.Close()

	var leaves []LeaveRequest
	for rows.Next() {
		var l LeaveRequest
		var emp employee.Employee
		var reviewedBy *string
		var reviewedAt *time.Time
		var rejectionReason *string
		var fromDate, toDate time.Time
		var managerName string

		err := rows.Scan(
			&l.ID, &l.EmployeeID, &l.Type, &fromDate, &toDate, &l.Days, &l.Reason, &l.Status,
			&rejectionReason, &reviewedBy, &reviewedAt, &l.CreatedAt,
			&emp.Name, &emp.Department, &emp.MobileNumber, &emp.ManagerID, &managerName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan leave row: %w", err)
		}

		l.FromDate = fromDate.Format("2006-01-02")
		l.ToDate = toDate.Format("2006-01-02")
		l.RejectionReason = rejectionReason
		l.ReviewedBy = reviewedBy
		l.ReviewedAt = reviewedAt
		if managerName != "" {
			emp.ManagerName = &managerName
		}
		
		emp.ID = l.EmployeeID
		l.Employee = &emp

		leaves = append(leaves, l)
	}

	return leaves, nil
}

func (r *PostgresRepository) ListPendingForManager(ctx context.Context, managerID string) ([]LeaveRequest, error) {
	query := `
		SELECT 
			l.id, l.employee_id, l.type, l.from_date, l.to_date, l.days, l.reason, l.status, l.rejection_reason, l.reviewed_by, l.reviewed_at, l.created_at,
			e.name, COALESCE(e.department, ''), e.mobile_number, e.manager_id, COALESCE(m.name, '')
		FROM leaves l
		JOIN employees e ON l.employee_id = e.id
		LEFT JOIN employees m ON e.manager_id = m.id
		WHERE l.status = 'pending' AND e.manager_id = $1
		ORDER BY l.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, managerID)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending leaves for manager: %w", err)
	}
	defer rows.Close()

	var leaves []LeaveRequest
	for rows.Next() {
		var l LeaveRequest
		var emp employee.Employee
		var reviewedBy *string
		var reviewedAt *time.Time
		var rejectionReason *string
		var fromDate, toDate time.Time
		var managerName string

		err := rows.Scan(
			&l.ID, &l.EmployeeID, &l.Type, &fromDate, &toDate, &l.Days, &l.Reason, &l.Status,
			&rejectionReason, &reviewedBy, &reviewedAt, &l.CreatedAt,
			&emp.Name, &emp.Department, &emp.MobileNumber, &emp.ManagerID, &managerName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan pending leave row: %w", err)
		}

		l.FromDate = fromDate.Format("2006-01-02")
		l.ToDate = toDate.Format("2006-01-02")
		l.RejectionReason = rejectionReason
		l.ReviewedBy = reviewedBy
		l.ReviewedAt = reviewedAt
		if managerName != "" {
			emp.ManagerName = &managerName
		}

		emp.ID = l.EmployeeID
		l.Employee = &emp

		leaves = append(leaves, l)
	}

	return leaves, nil
}

func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status LeaveStatus, reviewerID *string, rejectionReason *string) error {
	query := `
		UPDATE leaves 
		SET status = $1, reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $4
		WHERE id = $3 AND status = 'pending'
	`
	cmd, err := r.db.Exec(ctx, query, status, reviewerID, id, rejectionReason)
	if err != nil {
		return fmt.Errorf("failed to update leave status: %w", err)
	}
	if cmd.RowsAffected() > 0 {
		return nil
	}

	var currentStatus LeaveStatus
	err = r.db.QueryRow(ctx, `SELECT status FROM leaves WHERE id = $1`, id).Scan(&currentStatus)
	if err != nil {
		return ErrLeaveNotFound
	}
	return ErrLeaveNotPending
}

func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*LeaveRequest, error) {
	query := `
		SELECT 
			l.id, l.employee_id, l.type, l.from_date, l.to_date, l.days, l.reason, l.status, l.rejection_reason, l.reviewed_by, l.reviewed_at, l.created_at,
			e.name, COALESCE(e.department, ''), e.mobile_number, e.manager_id, COALESCE(m.name, '')
		FROM leaves l
		JOIN employees e ON l.employee_id = e.id
		LEFT JOIN employees m ON e.manager_id = m.id
		WHERE l.id = $1
	`
	var l LeaveRequest
	var emp employee.Employee
	var reviewedBy *string
	var reviewedAt *time.Time
	var rejectionReason *string
	var fromDate, toDate time.Time
	var managerName string

	err := r.db.QueryRow(ctx, query, id).Scan(
		&l.ID, &l.EmployeeID, &l.Type, &fromDate, &toDate, &l.Days, &l.Reason, &l.Status,
		&rejectionReason, &reviewedBy, &reviewedAt, &l.CreatedAt,
		&emp.Name, &emp.Department, &emp.MobileNumber, &emp.ManagerID, &managerName,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get leave by id: %w", err)
	}

	l.FromDate = fromDate.Format("2006-01-02")
	l.ToDate = toDate.Format("2006-01-02")
	l.RejectionReason = rejectionReason
	l.ReviewedBy = reviewedBy
	l.ReviewedAt = reviewedAt
	if managerName != "" {
		emp.ManagerName = &managerName
	}
	
	emp.ID = l.EmployeeID
	l.Employee = &emp

	return &l, nil
}

func (r *PostgresRepository) GetMonthlyBalance(ctx context.Context, employeeID string, month, year int) (*LeaveBalance, error) {
	query := `
		SELECT type, SUM(days)
		FROM leaves
		WHERE employee_id = $1 
		  AND status IN ('approved', 'pending')
		  AND EXTRACT(MONTH FROM from_date) = $2
		  AND EXTRACT(YEAR FROM from_date) = $3
		GROUP BY type
	`
	rows, err := r.db.Query(ctx, query, employeeID, month, year)
	if err != nil {
		return nil, fmt.Errorf("failed to query leave balance: %w", err)
	}
	defer rows.Close()

	bal := &LeaveBalance{
		EmployeeID:  employeeID,
		Month:       month,
		Year:        year,
		TotalCasual: 1, // Standard company policy
		TotalSick:   1, // Standard company policy
	}

	for rows.Next() {
		var lType string
		var days int
		if err := rows.Scan(&lType, &days); err != nil {
			return nil, fmt.Errorf("failed to scan balance row: %w", err)
		}
		if lType == string(TypeCasual) {
			bal.UsedCasual = days
		} else if lType == string(TypeSick) {
			bal.UsedSick = days
		}
	}

	return bal, nil
}
