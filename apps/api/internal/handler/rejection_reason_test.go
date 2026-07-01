package handler

import "testing"

func TestValidateRejectionReason(t *testing.T) {
	tests := []struct {
		reason string
		want   string
	}{
		{"Insufficient leave balance for July", ""},
		{"short", "rejection reason must be at least 10 characters"},
		{"01/07/2026", "rejection reason must not be a date"},
		{"THE END THE END THE END", "rejection reason contains too much repeated text"},
		{"THE END IS NEVER THE END IS NEVER THE END", "rejection reason contains too much repeated text"},
		{"Date conflict on another day", ""},
		{"overlap overlap", "rejection reason must contain at least two distinct words"},
	}
	for _, tc := range tests {
		got := validateRejectionReason(tc.reason)
		if got != tc.want {
			t.Errorf("validateRejectionReason(%q) = %q, want %q", tc.reason, got, tc.want)
		}
	}
}
