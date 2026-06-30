package whatsapp

import (
	"testing"
	"time"
)

func TestParseStoredLeaveDate_sameDayEndNotBeforeStart(t *testing.T) {
	start, ok := parseLeaveDate("10/07/2026")
	if !ok {
		t.Fatal("parseLeaveDate failed")
	}
	stored := start.Format("2006-01-02")
	end, ok := parseLeaveDate("10/07/2026")
	if !ok {
		t.Fatal("parseLeaveDate end failed")
	}
	parsedStart, ok := parseStoredLeaveDate(stored)
	if !ok {
		t.Fatal("parseStoredLeaveDate failed")
	}
	if end.Before(parsedStart) {
		t.Fatalf("one-day leave: end %v should not be before start %v (tz bug)", end, parsedStart)
	}
}

func TestLeaveEndDateComparison_oneDayLeave(t *testing.T) {
	sess := &Session{TempLeaveStart: "2026-07-10"}
	endDate, ok := parseLeaveDate("10/07/2026")
	if !ok {
		t.Fatal("parse end failed")
	}
	startDate, ok := parseStoredLeaveDate(sess.TempLeaveStart)
	if !ok {
		t.Fatal("parse stored start failed")
	}
	if endDate.Before(startDate) {
		t.Fatal("end must not be before start for same calendar day")
	}
	days := int(endDate.Sub(startDate).Hours()/24) + 1
	if days != 1 {
		t.Fatalf("expected 1 day, got %d", days)
	}
}

func TestStartOfDayLocal(t *testing.T) {
	now := time.Now()
	sod := startOfDayLocal(now)
	if sod.Hour() != 0 || sod.Minute() != 0 {
		t.Fatalf("expected midnight local, got %v", sod)
	}
}
