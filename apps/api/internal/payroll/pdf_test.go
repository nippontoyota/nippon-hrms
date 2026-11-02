package payroll

import (
	"os"
	"regexp"
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

	var esiRow *lineItem
	for _, d := range v.Deductions {
		if d.Label == "ESI" {
			val := d
			esiRow = &val
			break
		}
	}
	if esiRow == nil {
		t.Fatalf("expected ESI deduction row, got %d deductions", len(v.Deductions))
	}
	if esiRow.Amount != "141" {
		t.Fatalf("ESI amount = %q, want 141 (employee 0.75%% only, not 753)", esiRow.Amount)
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

func TestNewPayslipView_fixedIncentiveZeroSuppression(t *testing.T) {
	// Historical or regular record with FixedIncentive == 0
	recZero := &Record{
		EmployeeID:      "1001",
		Month:           9,
		Year:            2026,
		EmpNameSnapshot: "Historical Employee",
		BasicDA:         30000,
		FixedIncentive:  0,
	}

	viewZero := newPayslipView(nil, recZero, nil)
	for _, e := range viewZero.Earnings {
		if e.Label == "Fixed Incentive" {
			t.Fatalf("expected 'Fixed Incentive' to be suppressed when 0, but found in Earnings with amount %q", e.Amount)
		}
	}

	// River or eligible record with FixedIncentive > 0
	recActive := &Record{
		EmployeeID:        "IMR001",
		Month:             10,
		Year:              2026,
		EmpNameSnapshot:   "River Employee",
		BasicDA:           30000,
		FixedIncentive:    5000,
		TotalEarWithIncen: 35000,
		ActualFinalAmount: 35000,
	}

	viewActive := newPayslipView(nil, recActive, nil)
	var foundActive *lineItem
	for _, e := range viewActive.Earnings {
		if e.Label == "Fixed Incentive" {
			val := e
			foundActive = &val
			break
		}
	}
	if foundActive == nil {
		t.Fatalf("expected 'Fixed Incentive' to be present when > 0, but not found")
	}
	if foundActive.Amount != "5000" {
		t.Fatalf("expected 'Fixed Incentive' amount to be '5000', got %q", foundActive.Amount)
	}

	// Verify both PDFs generate cleanly and fit on exactly 1 page
	empRiver := &employee.Employee{
		EmployeeID:    "IMR001",
		Name:          "Akhil Mohan",
		Designation:   "Technician",
		Department:    "Service",
		AccountNumber: "1234567890",
		BankName:      "State Bank of India",
		IFSCCode:      "SBIN0001234",
		Branch:        "Nedumbassery",
	}

	pageRegex := regexp.MustCompile(`/Type\s*/Page\b[^s]`)

	pdfZero, err := GeneratePayslipPDF(nil, recZero, nil)
	if err != nil {
		t.Fatalf("GeneratePayslipPDF for zero fixed incentive: %v", err)
	}
	pagesZero := len(pageRegex.FindAll(pdfZero, -1))
	if pagesZero != 1 {
		t.Fatalf("expected 1 page for zero fixed incentive payslip, got %d", pagesZero)
	}

	pdfActive, err := GeneratePayslipPDF(empRiver, recActive, nil)
	if err != nil {
		t.Fatalf("GeneratePayslipPDF for active fixed incentive: %v", err)
	}
	pagesActive := len(pageRegex.FindAll(pdfActive, -1))
	if pagesActive != 1 {
		t.Fatalf("expected 1 page for active fixed incentive payslip, got %d", pagesActive)
	}

	_ = os.WriteFile("/tmp/sample_zero.pdf", pdfZero, 0644)
	_ = os.WriteFile("/tmp/sample_river.pdf", pdfActive, 0644)
}
