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
func shouldSkipInboundEcho(input, msgType string) bool {
	if !strings.EqualFold(msgType, "text") {
		return false
	}

	input = strings.TrimSpace(input)
	if input == "" {
		return true
	}

	return isInteractiveMenuEcho(input)
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
	if lower == "request leave" || input == payloadRequestLeave {
		return true
	}
	if strings.Contains(lower, "nippon hr connect") && strings.Contains(lower, "please tap a button") {
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
	return false
}
