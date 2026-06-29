package phone_test

import (
	"testing"

	"github.com/nippon-toyota/hrms/pkg/phone"
)

func TestNormalizeIndian(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"+918590215315", "8590215315"},
		{"918590215315", "8590215315"},
		{"8590215315", "8590215315"},
		{"+91 85902 15315", "8590215315"},
	}
	for _, tc := range tests {
		if got := phone.NormalizeIndian(tc.in); got != tc.want {
			t.Fatalf("NormalizeIndian(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestFormatWhatsAppE164(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"8590215315", "+918590215315"},
		{"+918590215315", "+918590215315"},
		{"+91 85902 15315", "+918590215315"},
		{"invalid", ""},
		{"12345", ""},
	}
	for _, tc := range tests {
		if got := phone.FormatWhatsAppE164(tc.in); got != tc.want {
			t.Fatalf("FormatWhatsAppE164(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
