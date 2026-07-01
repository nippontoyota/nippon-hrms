package whatsapp

import (
	"strings"
	"testing"
	"time"

	"github.com/nippon-toyota/hrms/internal/leave"
)

func TestLeaveTypeDisplayName(t *testing.T) {
	if got := leaveTypeDisplayName(leave.TypeCasual); got != "Casual Leave" {
		t.Fatalf("casual = %q", got)
	}
	if got := leaveTypeDisplayName(leave.TypeSick); got != "Sick Leave" {
		t.Fatalf("sick = %q", got)
	}
	if got := leaveTypeDisplayName(leave.TypeUnpaid); got != "Unpaid Leave" {
		t.Fatalf("unpaid = %q", got)
	}
}

func TestMsgLeaveConfirmPromptOmitsReason(t *testing.T) {
	msg := msgLeaveConfirmPrompt("Casual Leave", "01/07/2026", "01/07/2026", 1)
	if strings.Contains(msg, "Reason:") {
		t.Fatalf("confirm summary must not ask for reason, got %q", msg)
	}
	if strings.Count(msg, "Reply *Yes*") != 1 {
		t.Fatalf("summary should mention Yes once, got %q", msg)
	}
}

func TestLeaveConfirmSummaryUsesStoredFields(t *testing.T) {
	sDate, _ := time.Parse("2006-01-02", "2026-07-01")
	eDate, _ := time.Parse("2006-01-02", "2026-07-01")
	sess := &Session{
		TempLeaveType:  leave.TypeCasual,
		TempLeaveStart: "2026-07-01",
		TempLeaveEnd:   "2026-07-01",
	}
	days := int(eDate.Sub(sDate).Hours()/24) + 1
	msg := msgLeaveConfirmPrompt(
		leaveTypeDisplayName(sess.TempLeaveType),
		sDate.Format("02/01/2006"),
		eDate.Format("02/01/2006"),
		days,
	)
	if !strings.Contains(msg, "Total days: 1") {
		t.Fatalf("expected day count in summary, got %q", msg)
	}
}
