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

func TestMsgLeaveConfirmPromptIncludesReason(t *testing.T) {
	msg := msgLeaveConfirmPrompt("Casual Leave", "01/07/2026", "01/07/2026", "Just cuz", 1)
	if !strings.Contains(msg, "Reason: Just cuz") {
		t.Fatalf("expected reason in summary, got %q", msg)
	}
	if strings.Count(msg, "Reply *Yes*") != 1 {
		t.Fatalf("summary should mention Yes once, got %q", msg)
	}
}

func TestLeaveConfirmSummaryUsesStoredFields(t *testing.T) {
	sDate, _ := time.Parse("2006-01-02", "2026-07-01")
	eDate, _ := time.Parse("2006-01-02", "2026-07-01")
	sess := &Session{
		TempLeaveType:   leave.TypeCasual,
		TempLeaveStart:  "2026-07-01",
		TempLeaveEnd:    "2026-07-01",
		TempLeaveReason: "Just cuz",
	}
	days := int(eDate.Sub(sDate).Hours()/24) + 1
	msg := msgLeaveConfirmPrompt(
		leaveTypeDisplayName(sess.TempLeaveType),
		sDate.Format("02/01/2006"),
		eDate.Format("02/01/2006"),
		sess.TempLeaveReason,
		days,
	)
	if strings.Contains(msg, "01/07/2026") && strings.Contains(msg, "Reason: 01/07/2026") {
		t.Fatal("should not show date as reason when reason is text")
	}
	if !strings.Contains(msg, "Reason: Just cuz") {
		t.Fatalf("expected stored reason, got %q", msg)
	}
}

func TestFormatDaysLeft(t *testing.T) {
	if got := formatDaysLeft(1); got != "1 day left" {
		t.Fatalf("singular = %q", got)
	}
	if got := formatDaysLeft(0); got != "0 days left" {
		t.Fatalf("zero = %q", got)
	}
	if got := formatDaysLeft(2); got != "2 days left" {
		t.Fatalf("plural = %q", got)
	}
}

func TestMsgLeaveAwaitTypeWithBalance(t *testing.T) {
	bal := &leave.LeaveBalance{TotalCasual: 1, UsedCasual: 0, TotalSick: 1, UsedSick: 1}
	msg := msgLeaveAwaitTypeWithBalance(bal)
	if !strings.Contains(msg, "Casual Leave: 1 day left") {
		t.Fatalf("expected casual balance in body, got %q", msg)
	}
	if !strings.Contains(msg, "Sick Leave: 0 days left") {
		t.Fatalf("expected sick balance in body, got %q", msg)
	}
	if msgLeaveAwaitTypeWithBalance(nil) != msgLeaveAwaitType {
		t.Fatal("nil balance should use default prompt")
	}
}

func TestLeaveTypeButtonsWithBalance(t *testing.T) {
	bal := &leave.LeaveBalance{TotalCasual: 1, UsedCasual: 0, TotalSick: 1, UsedSick: 1}
	buttons := leaveTypeButtonsWithBalance(bal)
	if len(buttons) != 3 {
		t.Fatalf("expected 3 buttons, got %d", len(buttons))
	}
	if buttons[0].Title != "Casual Leave (1 left)" {
		t.Fatalf("casual button = %q", buttons[0].Title)
	}
	if buttons[1].Title != "Sick Leave (0 left)" {
		t.Fatalf("sick button = %q", buttons[1].Title)
	}
	if buttons[2].Title != "Unpaid Leave" {
		t.Fatalf("unpaid button = %q", buttons[2].Title)
	}
}
