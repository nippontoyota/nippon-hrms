package whatsapp

import (
	"strings"
	"testing"
)

func TestAcceptsInboundAtState(t *testing.T) {
	menuEcho := "Hello Krishnanand G,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nRequest Leave"
	leaveTypeEcho := "Leave Application\n\nWhat type of leave do you need?\nCasual Leave"

	tests := []struct {
		name  string
		state State
		input string
		want  bool
	}{
		{"idle hi", StateIdle, "Hi", true},
		{"idle menu leave text", StateIdle, "Request Leave", true},
		{"idle menu leave echo", StateIdle, menuEcho, true},
		{"idle menu salary text", StateIdle, "Salary Slip", true},
		{"idle leave type recovery", StateIdle, "Casual Leave", true},
		{"idle period shortcut", StateIdle, "06/2026", true},
		{"idle leave date expired", StateIdle, "01/07/2026", true},
		{"idle random", StateIdle, "foobar", false},

		{"await period month", StateAwaitPeriod, "06/2026", true},
		{"await period salary re-tap", StateAwaitPeriod, "Salary Slip", true},
		{"await period legacy generate pay", StateAwaitPeriod, "Generate Pay", true},
		{"await period garbage", StateAwaitPeriod, "foobar", false},

		{"leave type casual", StateLeaveAwaitType, "Casual Leave", true},
		{"leave type payload", StateLeaveAwaitType, payloadLeaveCasual, true},
		{"leave type echo", StateLeaveAwaitType, leaveTypeEcho, true},
		{"leave type garbage", StateLeaveAwaitType, "annual leave", false},

		{"leave start date", StateLeaveAwaitStart, "01/07/2026", true},
		{"leave start garbage", StateLeaveAwaitStart, "next week", false},

		{"leave end date", StateLeaveAwaitEnd, "05/07/2026", true},

		{"leave reason", StateLeaveAwaitReason, "Family function", true},
		{"leave reason date", StateLeaveAwaitReason, "01/07/2026", false},

		{"leave confirm yes", StateLeaveAwaitConfirm, "yes", true},
		{"leave confirm garbage", StateLeaveAwaitConfirm, "maybe", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := acceptsInboundAtState(tc.state, tc.input); got != tc.want {
				t.Fatalf("acceptsInboundAtState(%v, %q) = %v, want %v", tc.state, tc.input, got, tc.want)
			}
		})
	}
}

func TestNormalizeMenuSelection_multilineEcho(t *testing.T) {
	echo := "Hello Krishnanand G,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nRequest Leave"
	if got := normalizeMenuSelection(echo); got != payloadRequestLeave {
		t.Fatalf("normalizeMenuSelection(menu echo) = %q, want %q", got, payloadRequestLeave)
	}

	salaryEcho := "Welcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nSalary Slip"
	if got := normalizeMenuSelection(salaryEcho); got != payloadRequestSalary {
		t.Fatalf("normalizeMenuSelection(salary echo) = %q, want %q", got, payloadRequestSalary)
	}
}

func TestShouldSkipInboundEcho_matrix(t *testing.T) {
	menuEcho := "Hello Krishnanand G,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.\n\nHow may we help you today?\nRequest Leave"
	leaveTypeEcho := "Leave Application\n\nWhat type of leave do you need?\nCasual Leave"

	tests := []struct {
		name    string
		state   State
		input   string
		msgType string
		want    bool
	}{
		// Pure echoes with no matching state should be skipped.
		{"idle generate pay echo", StateIdle, "Generate Pay", "text", true},
		{"await period generate pay echo", StateAwaitPeriod, "Generate Pay", "text", false},

		// Answers for the current step must never be skipped.
		{"idle request leave text", StateIdle, "Request Leave", "text", false},
		{"idle menu echo", StateIdle, menuEcho, "text", false},
		{"idle casual leave recovery", StateIdle, "Casual Leave", "text", false},
		{"await period salary retap", StateAwaitPeriod, "Salary Slip", "text", false},
		{"await period month entry", StateAwaitPeriod, "06/2026", "text", false},
		{"leave type casual", StateLeaveAwaitType, "Casual Leave", "text", false},
		{"leave type echo", StateLeaveAwaitType, leaveTypeEcho, "text", false},
		{"leave start date", StateLeaveAwaitStart, "01/07/2026", "text", false},

		// Interactive payloads are never skipped by type.
		{"interactive payload", StateLeaveAwaitType, payloadLeaveCasual, "interactive", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := shouldSkipInboundEcho(tc.input, tc.msgType, tc.state); got != tc.want {
				t.Fatalf("shouldSkipInboundEcho(%q, %q, %v) = %v, want %v", tc.input, tc.msgType, tc.state, got, tc.want)
			}
		})
	}
}

func TestShouldSkipInboundEcho_doesNotSkipGreeting(t *testing.T) {
	if shouldSkipInboundEcho("Hi", "text", StateIdle) {
		t.Fatal("greetings must be processed, not skipped")
	}
}

func TestIsMainMenuEcho(t *testing.T) {
	if !isMainMenuEcho("Welcome to Nippon HR Connect.\nHow may we help you today?") {
		t.Fatal("expected main menu echo detection")
	}
	if isMainMenuEcho("Leave Application\nWhat type of leave do you need?") {
		t.Fatal("leave type prompt should not match main menu echo")
	}
}

func TestNormalizeMenuSelection_exactStillWorks(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{payloadRequestLeave, payloadRequestLeave},
		{"request leave", payloadRequestLeave},
		{"Salary Slip", payloadRequestSalary},
	} {
		if got := normalizeMenuSelection(tc.in); got != tc.want {
			t.Fatalf("normalizeMenuSelection(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestNormalizeLeaveTypeSelection_doesNotFalsePositive(t *testing.T) {
	if got := normalizeLeaveTypeSelection("annual leave"); got != "" {
		t.Fatalf("annual leave should not match, got %q", got)
	}
}

func TestAcceptsInboundAtState_leaveReasonNotMenu(t *testing.T) {
	reason := "Need casual leave for travel"
	if !acceptsInboundAtState(StateLeaveAwaitReason, reason) {
		t.Fatal("valid reason containing words casual leave should be accepted")
	}
}

func TestEchoSkipConsistentWithAccepts(t *testing.T) {
	// Every input accepted at a state must not be skipped as text.
	inputs := []string{
		"Hi", "Request Leave", "Salary Slip", "Casual Leave", "06/2026", "01/07/2026",
		"Family function", "yes", "no",
	}
	states := []State{
		StateIdle, StateAwaitPeriod, StateLeaveAwaitType,
		StateLeaveAwaitStart, StateLeaveAwaitEnd, StateLeaveAwaitReason, StateLeaveAwaitConfirm,
	}
	for _, state := range states {
		for _, input := range inputs {
			if acceptsInboundAtState(state, input) && shouldSkipInboundEcho(input, "text", state) {
				t.Fatalf("input %q accepted at state %v but would be skipped as echo", input, state)
			}
		}
	}
}

func TestNormalizeMenuSelection_unknownReturnsTrimmed(t *testing.T) {
	if got := normalizeMenuSelection("  foobar  "); got != "foobar" {
		t.Fatalf("got %q", got)
	}
	if isMenuLeaveSelection("foobar") {
		t.Fatal("unknown input should not be leave selection")
	}
}

func TestIsBotPromptEcho_leavePromptBodies(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{msgLeaveAwaitType, true},
		{msgLeaveAwaitStart, true},
		{msgLeaveAwaitEnd, true},
		{msgLeaveAwaitReason, true},
		{"Please confirm your leave details:\n\nLeave type: Casual Leave", true},
		{"Leave Application\n\nWhat type of leave do you need?\nCasual Leave", true},
	}
	for _, tc := range cases {
		if got := isBotPromptEcho(tc.input); got != tc.want {
			t.Fatalf("isBotPromptEcho(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestShouldSkipInboundEcho_promptOnlyAtLeaveAwaitType(t *testing.T) {
	if !shouldSkipInboundEcho(msgLeaveAwaitType, "text", StateLeaveAwaitType) {
		t.Fatal("prompt-only echo should be skipped while awaiting leave type")
	}
}

func TestLeaveTypeEchoContainsBothMarkers(t *testing.T) {
	echo := "Leave Application\n\nWhat type of leave do you need?\nSick Leave"
	lower := strings.ToLower(echo)
	if !strings.Contains(lower, "leave application") || !strings.Contains(lower, "sick leave") {
		t.Fatal("test setup broken")
	}
	if isInteractiveMenuEcho(echo) && !acceptsInboundAtState(StateLeaveAwaitType, echo) {
		t.Fatal("leave type echo must be accepted at await-type even if it matches interactive echo heuristics")
	}
}
