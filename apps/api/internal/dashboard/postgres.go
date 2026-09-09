package dashboard

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	db *pgxpool.Pool
}

func NewPostgresRepository(db *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) GetStats(ctx context.Context) (*DashboardStats, error) {
	stats := &DashboardStats{
		BranchDistribution: []BranchCount{},
	}

	// 1. Get total employee count
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM employees`).Scan(&stats.EmployeeCount)
	if err != nil {
		return nil, err
	}

	// 2. Get branch distribution
	branchRows, err := r.db.Query(ctx, `
		SELECT COALESCE(branch, 'Unassigned'), COUNT(*)
		FROM employees
		GROUP BY COALESCE(branch, 'Unassigned')
		ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer branchRows.Close()

	for branchRows.Next() {
		var bc BranchCount
		if err := branchRows.Scan(&bc.Branch, &bc.Count); err != nil {
			return nil, err
		}
		stats.BranchDistribution = append(stats.BranchDistribution, bc)
	}

	// 3. Get experience distribution
	err = r.db.QueryRow(ctx, `
		WITH exp AS (
			SELECT 
				COALESCE(
					EXTRACT(YEAR FROM age(CURRENT_DATE, doj)),
					years_experience,
					0
				) as yrs
			FROM employees
		)
		SELECT 
			COUNT(*) FILTER (WHERE yrs < 1),
			COUNT(*) FILTER (WHERE yrs >= 1 AND yrs < 3),
			COUNT(*) FILTER (WHERE yrs >= 3 AND yrs < 5),
			COUNT(*) FILTER (WHERE yrs >= 5 AND yrs < 10),
			COUNT(*) FILTER (WHERE yrs >= 10)
		FROM exp
	`).Scan(
		&stats.Experience.Under1Year,
		&stats.Experience.OneTo3Years,
		&stats.Experience.ThreeTo5Years,
		&stats.Experience.FiveTo10Years,
		&stats.Experience.Over10Years,
	)
	if err != nil {
		return nil, err
	}

	// 4. Get department distribution
	stats.DepartmentDistribution = []DepartmentCount{}
	departmentRows, err := r.db.Query(ctx, `
		SELECT COALESCE(department, 'Unassigned'), COUNT(*)
		FROM employees
		GROUP BY COALESCE(department, 'Unassigned')
		ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, err
	}
	defer departmentRows.Close()

	for departmentRows.Next() {
		var dc DepartmentCount
		if err := departmentRows.Scan(&dc.Department, &dc.Count); err != nil {
			return nil, err
		}
		stats.DepartmentDistribution = append(stats.DepartmentDistribution, dc)
	}

	// 5. Pending mock counts (leaving as 0 for now as they were previously mocked)
	stats.PendingLeaveRequests = 0
	stats.PendingDispatchJobs = 0
	stats.AttendancePeriods = 0

	return stats, nil
}
