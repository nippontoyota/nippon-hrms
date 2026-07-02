package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/leave"
)

func formatLeaveDateDisplay(iso string) string {
	t, ok := parseStoredLeaveDate(iso)
	if !ok {
		return iso
	}
	return t.Format("02/01/2006")
}

func buildManagerLeaveRequestText(empName string, req *leave.LeaveRequest) string {
	return fmt.Sprintf(
		"You have a new leave request from %s.\n\nType: %s\nDates: %s to %s\nTotal days: %d\nReason: %s\n\nPlease review and take action using the buttons below.",
		empName,
		leaveTypeDisplayName(req.Type),
		formatLeaveDateDisplay(req.FromDate),
		formatLeaveDateDisplay(req.ToDate),
		req.Days,
		req.Reason,
	)
}

func normalizeLeaveApprovalButtonText(input string) string {
	lower := strings.ToLower(strings.TrimSpace(input))
	lower = strings.TrimPrefix(lower, "✅ ")
	lower = strings.TrimPrefix(lower, "❌ ")
	return strings.TrimSpace(lower)
}

func parseManagerLeaveTemplateAction(input string) (approve bool, ok bool) {
	switch normalizeLeaveApprovalButtonText(input) {
	case "approve":
		return true, true
	case "reject":
		return false, true
	default:
		return false, false
	}
}

func (s *Service) tryHandleManagerTemplateLeaveAction(ctx context.Context, sess *Session, from string, approve bool) (bool, error) {
	mgr, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil {
		return false, nil
	}

	pending, err := s.leaveRepo.ListPendingForManager(ctx, mgr.ID)
	if err != nil || len(pending) == 0 {
		return false, nil
	}

	action := "REJECT_LEAVE_" + pending[0].ID
	if approve {
		action = "APPROVE_LEAVE_" + pending[0].ID
	}

	err = s.handleLeaveApproval(ctx, sess, from, action)
	return true, err
}

func managerLeaveRequestPlaceholders(empName string, req *leave.LeaveRequest) []string {
	return []string{
		empName,
		leaveTypeDisplayName(req.Type),
		formatLeaveDateDisplay(req.FromDate),
		formatLeaveDateDisplay(req.ToDate),
		strconv.Itoa(req.Days),
		req.Reason,
	}
}

func managerLeaveButtons(leaveID string) []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{
		{ID: "APPROVE_LEAVE_" + leaveID, Title: "Approve"},
		{ID: "REJECT_LEAVE_" + leaveID, Title: "Reject"},
	}
}

func shouldPromptManagerLeaveReview(input string) bool {
	switch normalizeGreetingInput(input) {
	case "ok", "okay", "yes", "review", "done", "got it", "noted":
		return true
	}
	return isAcknowledgment(input)
}

func (s *Service) notifyManagerLeaveRequest(ctx context.Context, mgrPhone string, emp *employee.Employee, req *leave.LeaveRequest) bool {
	if s.dt == nil || !s.dt.Configured() || mgrPhone == "" || emp == nil || req == nil {
		return false
	}

	msgText := buildManagerLeaveRequestText(emp.Name, req)
	buttons := managerLeaveButtons(req.ID)
	windowOpen := s.sessionWindow != nil && s.sessionWindow.IsSessionWindowOpen(ctx, mgrPhone)

	if windowOpen {
		if _, err := s.dt.SendInteractiveButtons(ctx, mgrPhone, "", msgText, "", buttons); err != nil {
			if doubletick.IsSessionExpiredError(err) {
				slog.Info("manager leave notify: session expired during interactive send, falling back to template", "manager", mgrPhone)
				return s.sendManagerLeaveRequestTemplate(ctx, mgrPhone, emp.Name, req)
			}
			slog.Error("failed to send interactive button to manager", "err", err, "manager", mgrPhone)
			return false
		}
		return true
	}

	return s.sendManagerLeaveRequestTemplate(ctx, mgrPhone, emp.Name, req)
}

func (s *Service) sendManagerLeaveRequestTemplate(ctx context.Context, mgrPhone, empName string, req *leave.LeaveRequest) bool {
	placeholders := managerLeaveRequestPlaceholders(empName, req)
	if _, err := s.dt.SendTemplate(ctx, mgrPhone, doubletick.TemplateLeaveRequestManager, doubletick.TemplateLanguageEN, placeholders); err != nil {
		slog.Error("failed to send manager leave template", "err", err, "manager", mgrPhone)
		return false
	}
	slog.Info("manager leave notify: sent via template", "manager", mgrPhone, "leaveId", req.ID)
	return true
}

func (s *Service) trySendManagerPendingLeaveReview(ctx context.Context, from, input string) (bool, error) {
	if !shouldPromptManagerLeaveReview(input) {
		return false, nil
	}
	if s.dt == nil || !s.dt.Configured() {
		return false, nil
	}

	mgr, err := s.empRepo.FindByPhone(ctx, from)
	if err != nil {
		return false, nil
	}

	pending, err := s.leaveRepo.ListPendingForManager(ctx, mgr.ID)
	if err != nil || len(pending) == 0 {
		return false, nil
	}

	req := pending[0]
	empName := ""
	if req.Employee != nil {
		empName = req.Employee.Name
	}

	msgText := buildManagerLeaveRequestText(empName, &req)
	if _, err := s.dt.SendInteractiveButtons(ctx, from, "", msgText, "", managerLeaveButtons(req.ID)); err != nil {
		slog.Error("failed to send manager leave review prompt", "err", err, "manager", from)
		return true, s.sendText(ctx, from, "We could not load your pending leave request. Please try again or contact HR.")
	}
	return true, nil
}

func buildManagerLeaveApprovedEmployeeText(empName, fromDate, toDate, managerName string) string {
	return fmt.Sprintf(
		"Hi %s,\n\nYour leave request for %s to %s has been approved by %s.",
		empName,
		formatLeaveDateDisplay(fromDate),
		formatLeaveDateDisplay(toDate),
		formatManagerRef(managerName),
	)
}

func buildManagerLeaveRejectedEmployeeText(empName, fromDate, toDate, managerName, reason string) string {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = "Not specified"
	}
	return fmt.Sprintf(
		"Hi %s,\n\nYour leave request for %s to %s has been rejected by %s.\n\nReason: %s",
		empName,
		formatLeaveDateDisplay(fromDate),
		formatLeaveDateDisplay(toDate),
		formatManagerRef(managerName),
		reason,
	)
}
