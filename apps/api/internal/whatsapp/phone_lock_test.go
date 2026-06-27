package whatsapp

import "testing"

func TestShouldSkipInboundEcho_generatePayText(t *testing.T) {
	if !shouldSkipInboundEcho("Generate Pay", "text", StateIdle) {
		t.Fatal("expected generate pay text echo to be skipped in idle state")
	}
}

func TestShouldSkipInboundEcho_listTitleText(t *testing.T) {
	if !shouldSkipInboundEcho("June 2026", "text", StateAwaitPeriod) {
		t.Fatal("expected list title text echo to be skipped while awaiting period")
	}
}

func TestShouldSkipInboundEcho_periodButton(t *testing.T) {
	if shouldSkipInboundEcho("payslip_6_2026", "button", StateAwaitPeriod) {
		t.Fatal("button payload should not be skipped")
	}
}

func TestShouldSkipInboundEcho_manualPeriod(t *testing.T) {
	if shouldSkipInboundEcho("06/2026", "text", StateAwaitPeriod) {
		t.Fatal("manual MM/YYYY entry should not be skipped")
	}
}
