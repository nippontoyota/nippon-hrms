package payroll

import (
	"strings"
	"testing"
)

func TestPayslipTemplatePlaceholders(t *testing.T) {
	got := payslipTemplatePlaceholders("Akhil Jose", "May", 2026)
	want := []string{"Akhil Jose", "May", "Akhil Jose", "May", "2026"}
	if len(got) != len(want) {
		t.Fatalf("len = %d, want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("placeholder[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestPayslipCaption(t *testing.T) {
	caption := PayslipCaption("May", 2026, "Akhil Jose")
	if !strings.Contains(caption, "Dear *Akhil Jose*") {
		t.Errorf("caption missing greeting: %s", caption)
	}
	if !strings.Contains(caption, "Payslip - May 2026") {
		t.Errorf("caption missing title: %s", caption)
	}
}
