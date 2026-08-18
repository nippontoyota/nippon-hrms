package whatsapp

import (
	"strings"
	"sync"
)

type phoneLocker struct {
	locks sync.Map
}

func newPhoneLocker() *phoneLocker {
	return &phoneLocker{}
}

func (l *phoneLocker) run(phone string, fn func()) {
	v, _ := l.locks.LoadOrStore(phone, &sync.Mutex{})
	mu := v.(*sync.Mutex)
	mu.Lock()
	defer mu.Unlock()
	fn()
}

// shouldSkipInboundEcho drops WhatsApp text echoes of button selections.
// When the session is waiting for that selection, the text is the user's answer — not an echo.
func shouldSkipInboundEcho(input, msgType string, state State) bool {
	if !strings.EqualFold(msgType, "text") {
		return false
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return true
	}

	if acceptsInboundAtState(state, input) {
		return false
	}

	return isBotPromptEcho(input)
}

// isLeaveApprovalButtonEcho detects text echoes of the manager approve/reject buttons.
func isLeaveApprovalButtonEcho(input string) bool {
	trimmed := strings.TrimSpace(input)
	if strings.HasPrefix(trimmed, "APPROVE_LEAVE_") || strings.HasPrefix(trimmed, "REJECT_LEAVE_") {
		return true
	}
	lower := normalizeLeaveApprovalButtonText(trimmed)
	switch lower {
	case "approve", "reject":
		return true
	default:
		return false
	}
}

// isBotPromptEcho detects WhatsApp text echoes of button taps and outbound prompt bodies.
func isBotPromptEcho(input string) bool {
	if isInteractiveMenuEcho(input) {
		return true
	}
	if isLeaveApprovalButtonEcho(input) {
		return true
	}
	lower := strings.ToLower(strings.TrimSpace(input))
	if strings.Contains(lower, "please type the reason for rejecting") {
		return true
	}
	if strings.Contains(lower, "accepted leave request") {
		return true
	}
	if strings.Contains(lower, "rejected leave request") {
		return true
	}
	if strings.Contains(lower, "has been approved by") {
		return true
	}
	if strings.Contains(lower, "has been rejected by") {
		return true
	}
	if strings.Contains(lower, "leave application") {
		if strings.Contains(lower, "what type of leave do you need") {
			return true
		}
		if strings.Contains(lower, "please enter your leave start date") {
			return true
		}
	}
	if strings.Contains(lower, "please enter your leave end date") {
		return true
	}
	if strings.Contains(lower, "please enter your leave start date") {
		return true
	}
	if strings.Contains(lower, "please enter a short reason in words") {
		return true
	}
	if strings.Contains(lower, "please enter the reason for your leave") {
		return true
	}
	if strings.Contains(lower, "please confirm your leave details") {
		return true
	}
	if strings.Contains(lower, "please confirm your leave dates") {
		return true
	}
	if strings.Contains(lower, "reply") && strings.Contains(lower, "re-enter the end date") {
		return true
	}
	if strings.Contains(lower, "please enter the month and year for your payslip") {
		return true
	}
	if strings.Contains(lower, "how may we help you today") || strings.Contains(lower, "welcome to nippon hr connect") {
		return true
	}
	return false
}

// isInteractiveMenuEcho detects text echoes of interactive button/list replies.
// WhatsApp often echoes the full multi-line body (welcome + option label), not just the selection.
func isInteractiveMenuEcho(input string) bool {
	lower := strings.ToLower(strings.TrimSpace(input))
	if lower == "generate pay" || input == payloadGeneratePay {
		return true
	}
	if lower == "request salary slip" || lower == "salary slip" || input == payloadRequestSalary {
		return true
	}
	if lower == "health card" || lower == "request health card" || input == payloadRequestHealthCard {
		return true
	}
	if lower == "duty leave" || input == payloadLeaveDuty {
		return true
	}
	if lower == "request leave" || input == payloadRequestLeave {
		return true
	}
	if lower == "casual leave" || input == payloadLeaveCasual {
		return true
	}
	if strings.HasPrefix(lower, "casual leave (") && strings.HasSuffix(lower, " left)") {
		return true
	}

	if lower == "holiday calendar" || input == payloadRequestHolidays {
		return true
	}
	if strings.Contains(lower, "nippon hr connect") && strings.Contains(lower, "please select an option") {
		return true
	}
	if strings.Contains(lower, "generate pay") &&
		(strings.Contains(lower, "payslip") || strings.Contains(lower, "nippon")) {
		return true
	}
	if strings.Contains(lower, "request salary slip") && strings.Contains(lower, "nippon") {
		return true
	}
	if strings.Contains(lower, "salary slip") && strings.Contains(lower, "nippon") {
		return true
	}
	if strings.Contains(lower, "request leave") && strings.Contains(lower, "nippon") {
		return true
	}
	if strings.Contains(lower, "casual leave") && strings.Contains(lower, "leave application") {
		return true
	}
	if strings.Contains(lower, "sick leave") && strings.Contains(lower, "leave application") {
		return true
	}
	if strings.Contains(lower, "unpaid leave") && strings.Contains(lower, "leave application") {
		return true
	}
	return false
}

// isLeaveTypePromptOnlyEcho detects WhatsApp text echoes of the leave-type question without a selection.
func isLeaveTypePromptOnlyEcho(input string) bool {
	lower := strings.ToLower(strings.TrimSpace(input))
	return strings.Contains(lower, "leave application") &&
		strings.Contains(lower, "what type of leave do you need") &&
		normalizeLeaveTypeSelection(input) == ""
}
