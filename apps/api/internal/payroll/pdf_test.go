package payroll

import (
	"testing"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func TestNewPayslipView_esiDeductionUsesEmployeeShareOnly(t *testing.T) {
	rec := &Record{
		EmployeeID:      "9001",
		Month:           7,
		Year:            2026,
		EmpNameSnapshot: "Krishnanand G",
		ESI075:          141,
		ESI325:          612,
		TotalDeductions: 1821,
	}

	v := newPayslipView(nil, rec, nil)

	const esiIdx = 1
	if len(v.Deductions) <= esiIdx {
		t.Fatalf("expected ESI deduction row, got %d deductions", len(v.Deductions))
	}
	if v.Deductions[esiIdx].Label != "ESI" {
		t.Fatalf("deduction[%d] label = %q, want ESI", esiIdx, v.Deductions[esiIdx].Label)
	}
	if v.Deductions[esiIdx].Amount != "141" {
		t.Fatalf("ESI amount = %q, want 141 (employee 0.75%% only, not 753)", v.Deductions[esiIdx].Amount)
	}
}

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
		EmployeeID:      "9005",
		Month:           6,
		Year:            2026,
		EmpNameSnapshot: "Bharath Chandra",
		Days:            30,
		BasicDA:         50000,
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
