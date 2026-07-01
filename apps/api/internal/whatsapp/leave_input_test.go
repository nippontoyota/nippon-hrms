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
