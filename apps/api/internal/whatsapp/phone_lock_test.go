package whatsapp

import (
	"strings"
	"testing"
)

func TestShouldSkipInboundEcho_generatePayText(t *testing.T) {
	if !shouldSkipInboundEcho("Generate Pay", "text", StateIdle) {
		t.Fatal("expected generate pay text echo to be skipped in idle state")
	}
}

func TestShouldSkipInboundEcho_generatePayTextAwaitPeriod(t *testing.T) {
	// Legacy "Generate Pay" at await-period re-sends the period prompt — not skipped.
	if shouldSkipInboundEcho("Generate Pay", "text", StateAwaitPeriod) {
		t.Fatal("generate pay at await-period should be processed as payslip menu re-tap")
	}
}

func TestShouldSkipInboundEcho_interactiveBodyEcho(t *testing.T) {
	echo := "Welcome to Nippon Toyota HR Assistant!\nTap the button below to download your payslip.\nGenerate Pay"
	if !shouldSkipInboundEcho(echo, "text", StateIdle) {
		t.Fatal("expected full interactive body text echo to be skipped")
	}
}

func TestShouldSkipInboundEcho_monthNameText(t *testing.T) {
	if shouldSkipInboundEcho("June 2026", "text", StateAwaitPeriod) {
		t.Fatal("month name text should be handled by await-period handler, not skipped")
	}
}

func TestShouldSkipInboundEcho_manualPeriod(t *testing.T) {
	if shouldSkipInboundEcho("06/2026", "text", StateAwaitPeriod) {
		t.Fatal("manual MM/YYYY entry should not be skipped")
	}
}

func TestShouldSkipInboundEcho_leaveTypeButtonsIdle(t *testing.T) {
	// At idle, leave-type text is accepted for session-loss recovery — not skipped.
	if shouldSkipInboundEcho("Casual Leave", "text", StateIdle) {
		t.Fatal("casual leave at idle should be processed for recovery, not skipped")
	}
	if shouldSkipInboundEcho("Sick Leave", "text", StateIdle) {
		t.Fatal("sick leave at idle should be processed for recovery, not skipped")
	}
}

func TestShouldSkipInboundEcho_leaveTypeButtonsAwaitType(t *testing.T) {
	if shouldSkipInboundEcho("Casual Leave", "text", StateLeaveAwaitType) {
		t.Fatal("casual leave text should be processed while awaiting leave type")
	}
	if shouldSkipInboundEcho(payloadLeaveCasual, "text", StateLeaveAwaitType) {
		t.Fatal("leave_casual payload text should be processed while awaiting leave type")
	}
	if shouldSkipInboundEcho("Sick Leave", "text", StateLeaveAwaitType) {
		t.Fatal("sick leave text should be processed while awaiting leave type")
	}
	echo := "Leave Application\n\nWhat type of leave do you need?\nCasual Leave"
	if shouldSkipInboundEcho(echo, "text", StateLeaveAwaitType) {
		t.Fatal("full leave-type interactive echo should be processed while awaiting leave type")
	}
}

func TestNormalizeLeaveTypeSelection(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{payloadLeaveCasual, payloadLeaveCasual},
		{"Casual Leave", payloadLeaveCasual},
		{"casual", payloadLeaveCasual},
		{payloadLeaveSick, payloadLeaveSick},
		{"Sick Leave", payloadLeaveSick},
		{"sick", payloadLeaveSick},
		{"annual leave", ""},
		{"Leave Application\n\nWhat type of leave do you need?\nCasual Leave", payloadLeaveCasual},
		{"Leave Application\n\nWhat type of leave do you need?\nSick Leave", payloadLeaveSick},
	}

	for _, tc := range tests {
		if got := normalizeLeaveTypeSelection(tc.input); got != tc.want {
			t.Fatalf("normalizeLeaveTypeSelection(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestIsGreeting(t *testing.T) {
	for _, input := range []string{"Hi", "hello", "HEY", "start", "menu", "reset", "Hi!", "hello.", "hello there", "hi there", "hey there"} {
		if !isGreeting(input) {
			t.Fatalf("expected %q to be a greeting", input)
		}
	}
	for _, input := range []string{"06/2026", "history", "high five", "Hi Krishnanand G, welcome to Nippon HR Connect"} {
		if isGreeting(input) {
			t.Fatalf("expected %q not to be a greeting", input)
		}
	}
}

func TestMsgWelcomeFor(t *testing.T) {
	want := "Hello Krishnanand G,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below."
	if got := msgWelcome("Krishnanand G"); got != want {
		t.Fatalf("msgWelcome() = %q, want %q", got, want)
	}
	if got := msgWelcome(""); !strings.Contains(got, "Welcome to Nippon HR Connect") {
		t.Fatalf("msgWelcome(\"\") = %q, want generic welcome", got)
	}
}

func TestParseMMYYYY(t *testing.T) {
	tests := []struct {
		input     string
		wantMonth int
		wantYear  int
		wantOK    bool
	}{
		{"06/2026", 6, 2026, true},
		{"06;2026", 6, 2026, true},
		{"June 2026", 0, 0, false},
		{"6/26", 0, 0, false},
		{"13/2026", 0, 0, false},
		{"06/1999", 0, 0, false},
	}

	for _, tc := range tests {
		month, year, ok := parseMMYYYY(tc.input)
		if ok != tc.wantOK || month != tc.wantMonth || year != tc.wantYear {
			t.Fatalf("parseMMYYYY(%q) = (%d, %d, %v), want (%d, %d, %v)",
				tc.input, month, year, ok, tc.wantMonth, tc.wantYear, tc.wantOK)
		}
	}
}
