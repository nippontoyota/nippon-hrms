package whatsapp

import (
	"strings"
	"testing"

	"github.com/nippon-toyota/hrms/internal/leave"
)

func TestBuildManagerLeaveRequestText(t *testing.T) {
	req := &leave.LeaveRequest{
		Type:     leave.TypeCasual,
		FromDate: "2026-07-01",
		ToDate:   "2026-07-03",
		Days:     3,
		Reason:   "Family function",
	}

	msg := buildManagerLeaveRequestText("Rajesh Kumar", req)
	if strings.Contains(msg, "📅") || strings.Contains(msg, "✅") || strings.Contains(msg, "❌") {
		t.Fatalf("manager leave text should not contain emojis: %q", msg)
	}
	want := "You have a new leave request from Rajesh Kumar."
	if !strings.HasPrefix(msg, want) {
		t.Fatalf("unexpected prefix: %q", msg)
	}
	if !strings.Contains(msg, "Type: Casual Leave") {
		t.Fatalf("expected leave type in message: %q", msg)
	}
	if !strings.Contains(msg, "Please review and take action using the buttons below.") {
		t.Fatalf("expected action prompt in message: %q", msg)
	}
}

func TestParseManagerLeaveTemplateAction(t *testing.T) {
	if approve, ok := parseManagerLeaveTemplateAction("Approve"); !ok || !approve {
		t.Fatalf("Approve should map to approve action, got approve=%v ok=%v", approve, ok)
	}
	if approve, ok := parseManagerLeaveTemplateAction("reject"); !ok || approve {
		t.Fatalf("reject should map to reject action, got approve=%v ok=%v", approve, ok)
	}
	if _, ok := parseManagerLeaveTemplateAction("yes"); ok {
		t.Fatal("yes should not map to manager template action")
	}
}

func TestShouldPromptManagerLeaveReview(t *testing.T) {
	for _, input := range []string{"ok", "review", "noted", "thank you"} {
		if !shouldPromptManagerLeaveReview(input) {
			t.Fatalf("expected %q to prompt manager leave review", input)
		}
	}
	if shouldPromptManagerLeaveReview("Hi") {
		t.Fatal("greeting should not prompt manager leave review")
	}
}
