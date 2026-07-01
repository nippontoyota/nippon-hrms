package whatsapp

import "testing"

func TestIsValidLeaveReason(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"Just cuz", true},
		{"Family function", true},
		{"01/07/2026", false},
		{"06/2026", false},
		{"yes", false},
		{"ok", false},
		{"ab", false},
		{"   ", false},
	}
	for _, tc := range tests {
		if got := isValidLeaveReason(tc.input); got != tc.want {
			t.Fatalf("isValidLeaveReason(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestIsLeaveConfirmAffirmative(t *testing.T) {
	for _, input := range []string{"Yes", "y", "yeah", "OK", "confirm", "submit"} {
		if !isLeaveConfirmAffirmative(input) {
			t.Fatalf("expected affirmative for %q", input)
		}
	}
	if isLeaveConfirmAffirmative("maybe") {
		t.Fatal("maybe should not be affirmative")
	}
}

func TestIsValidInputForState_reason(t *testing.T) {
	if isValidInputForState(StateLeaveAwaitReason, "01/07/2026") {
		t.Fatal("date should be invalid at reason step")
	}
	if !isValidInputForState(StateLeaveAwaitReason, "Doctor appointment") {
		t.Fatal("text reason should be valid")
	}
}

func TestIsValidRejectionReason(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"Not enough staff coverage", true},
		{"Insufficient balance available", true},
		{"❌ Reject", false},
		{"Reject", false},
		{"✅ Approve", false},
		{"REJECT_LEAVE_abc123", false},
		{"no", false},
		{"too short", false},
		{"01/07/2026", false},
		{"busy busy busy busy", false},
		{"", false},
	}
	for _, tc := range tests {
		if got := isValidRejectionReason(tc.input); got != tc.want {
			t.Fatalf("isValidRejectionReason(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestShouldSkipInboundEcho_rejectionButtonEcho(t *testing.T) {
	if !shouldSkipInboundEcho("❌ Reject", "text", StateLeaveAwaitRejectionReason) {
		t.Fatal("reject button echo should be skipped at rejection-reason state")
	}
	if shouldSkipInboundEcho("Not enough staff coverage", "text", StateLeaveAwaitRejectionReason) {
		t.Fatal("valid typed reason must not be skipped at rejection-reason state")
	}
}
