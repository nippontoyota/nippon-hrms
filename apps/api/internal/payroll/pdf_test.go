package payroll

import (
	"testing"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func TestGeneratePayslipPDF_longVariableFields(t *testing.T) {
	emp := &employee.Employee{
		EmployeeID:    "9005",
		Name:          "Bharath Chandra",
		Designation:   "Technical Development Manager",
		Department:    "IT",
		AccountNumber: "603801234567",
		BankName:      "ICICI Bank",
		IFSCCode:      "ICIC0006038",
		Branch:        "Kalamassery Corporate Office Building",
	}

	rec := &Record{
		EmployeeID:        "9005",
		Month:             6,
		Year:              2026,
		EmpNameSnapshot:   "Bharath Chandra",
		Days:              30,
		BasicDA:           50000,
		TotalEarWithIncen: 75000,
		TotalDeductions:   5000,
		ActualFinalAmount: 70000,
	}

	pdf, err := GeneratePayslipPDF(emp, rec, nil)
	if err != nil {
		t.Fatalf("GeneratePayslipPDF: %v", err)
	}
	if len(pdf) < 1000 {
		t.Fatalf("expected non-trivial PDF output, got %d bytes", len(pdf))
	}
}
