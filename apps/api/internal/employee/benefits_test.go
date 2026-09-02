package employee

import "testing"

func TestFormatBenefitAmount(t *testing.T) {
	amount := 1234567.8
	if got := FormatBenefitAmount(&amount); got != "₹12,34,567.80" {
		t.Fatalf("FormatBenefitAmount() = %q", got)
	}
	if got := FormatBenefitAmount(nil); got != "" {
		t.Fatalf("FormatBenefitAmount(nil) = %q", got)
	}
	rounded := 1.999
	if got := FormatBenefitAmount(&rounded); got != "₹2.00" {
		t.Fatalf("FormatBenefitAmount(rounded) = %q, want ₹2.00", got)
	}
}
