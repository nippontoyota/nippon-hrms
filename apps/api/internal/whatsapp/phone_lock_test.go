package whatsapp

import "testing"

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

func TestIsGreeting(t *testing.T) {
	for _, input := range []string{"Hi", "hello", "HEY", "start", "menu", "reset"} {
		if !isGreeting(input) {
			t.Fatalf("expected %q to be a greeting", input)
		}
	}
	if isGreeting("06/2026") {
		t.Fatal("date input should not be a greeting")
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
