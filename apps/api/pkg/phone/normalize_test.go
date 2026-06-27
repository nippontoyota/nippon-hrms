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
