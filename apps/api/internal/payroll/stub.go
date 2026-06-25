package payroll

import (
	"context"
	"errors"
)

type StubRepository struct{}

func NewStubRepository() *StubRepository {
	return &StubRepository{}
}

func (r *StubRepository) GetPayslip(ctx context.Context, employeeID string, month, year int) (*Record, error) {

	if employeeID == "" {
		return nil, errors.New("employee ID is required")
	}

	return &Record{
		ID:          "PAY-12345",
		EmployeeID:  employeeID,
		Month:       month,
		Year:        year,
		BasicSalary: 50000.00,
		Allowances:  15000.00,
		Deductions:  5000.00,
		NetPay:      60000.00,
	}, nil
}

func (r *StubRepository) BulkInsert(ctx context.Context, records []Record) error {

	return nil
}
