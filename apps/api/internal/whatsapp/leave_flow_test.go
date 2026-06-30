package whatsapp

import (
	"strings"
	"testing"
	"time"

	"github.com/nippon-toyota/hrms/internal/leave"
)

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
