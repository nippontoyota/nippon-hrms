package whatsapp

import (
	"strings"
	"testing"
)

func TestShouldSkipInboundEcho_generatePayText(t *testing.T) {
	if !shouldSkipInboundEcho("Generate Pay", "text") {
		t.Fatal("expected generate pay text echo to be skipped in idle state")
	}
}

func TestShouldSkipInboundEcho_generatePayTextAwaitPeriod(t *testing.T) {
	if !shouldSkipInboundEcho("Generate Pay", "text") {
		t.Fatal("expected generate pay text echo to be skipped in await-period state")
	}
}

func TestShouldSkipInboundEcho_interactiveBodyEcho(t *testing.T) {
	echo := "Welcome to Nippon Toyota HR Assistant!\nTap the button below to download your payslip.\nGenerate Pay"
	if !shouldSkipInboundEcho(echo, "text") {
		t.Fatal("expected full interactive body text echo to be skipped")
	}
}

func TestShouldSkipInboundEcho_monthNameText(t *testing.T) {
	if shouldSkipInboundEcho("June 2026", "text") {
		t.Fatal("month name text should be handled by await-period handler, not skipped")
	}
}

func TestShouldSkipInboundEcho_manualPeriod(t *testing.T) {
	if shouldSkipInboundEcho("06/2026", "text") {
		t.Fatal("manual MM/YYYY entry should not be skipped")
	}
}

func TestShouldSkipInboundEcho_leaveTypeButtons(t *testing.T) {
	if !shouldSkipInboundEcho("Casual Leave", "text") {
		t.Fatal("expected casual leave text echo to be skipped")
	}
	if !shouldSkipInboundEcho("Sick Leave", "text") {
		t.Fatal("expected sick leave text echo to be skipped")
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
