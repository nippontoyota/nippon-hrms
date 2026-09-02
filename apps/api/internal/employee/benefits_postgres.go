package employee

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
)

func (r *PostgresRepository) GetBenefit(ctx context.Context, employeeID string, benefitType BenefitType, period string) (*EmployeeBenefit, error) {
	var benefit EmployeeBenefit
	err := r.db.QueryRow(ctx, `
		SELECT employee_id, benefit_type, period, amount, source_file
		FROM employee_benefits
		WHERE employee_id = $1 AND benefit_type = $2 AND period = $3
	`, employeeID, benefitType, period).Scan(
		&benefit.EmployeeID, &benefit.BenefitType, &benefit.Period, &benefit.Amount, &benefit.SourceFile,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get employee benefit: %w", err)
	}
	return &benefit, nil
}

var _ BenefitRepository = (*PostgresRepository)(nil)
