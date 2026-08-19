package whatsapp

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

type dedupStore struct {
	mu                 sync.Mutex
	ttl                time.Duration
	echoWindow         time.Duration
	actionWindow       time.Duration
	greetingWindow     time.Duration
	periodWindow       time.Duration
	payslipWindow      time.Duration
	leaveSubmitWindow  time.Duration
	byMessageID        map[string]time.Time
	byAction           map[string]time.Time
	lastStructuredAt   map[string]time.Time
	byPayslipDelivery  map[string]time.Time
	byLeaveSubmit      map[string]time.Time
	inFlightPayslip    map[string]bool
	inFlightLeaveSubmit map[string]bool
}

func newDedupStore(ttl time.Duration) *dedupStore {
	if ttl == 0 {
		ttl = 5 * time.Minute
	}
	return &dedupStore{
		ttl:               ttl,
		echoWindow:        time.Second,
		actionWindow:      5 * time.Second,
		greetingWindow:    30 * time.Second,
		periodWindow:      30 * time.Second,
		payslipWindow:       1 * time.Minute,
		leaveSubmitWindow:   1 * time.Minute,
		byMessageID:         make(map[string]time.Time),
		byAction:            make(map[string]time.Time),
		lastStructuredAt:    make(map[string]time.Time),
		byPayslipDelivery:   make(map[string]time.Time),
		byLeaveSubmit:       make(map[string]time.Time),
		inFlightPayslip:     make(map[string]bool),
		inFlightLeaveSubmit: make(map[string]bool),
	}
}

func (d *dedupStore) isDuplicate(messageID, phone, input, msgType string, state State) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	d.evict(now)

	input = strings.TrimSpace(input)
	msgType = strings.ToLower(msgType)

	if messageID != "" {
		if seenAt, ok := d.byMessageID[messageID]; ok && now.Sub(seenAt) < d.ttl {
			return true
		}
		d.byMessageID[messageID] = now
	}

	skipEchoWindow := isInLeaveFlow(state)
	if !skipEchoWindow && msgType == "text" && !looksLikePeriodAttempt(input) && !looksLikeLeaveDateAttempt(input) {
		if seenAt, ok := d.lastStructuredAt[phone]; ok && now.Sub(seenAt) < d.echoWindow {
			return true
		}
	} else if msgType == "button" || msgType == "interactive" {
		d.lastStructuredAt[phone] = now
	}

	if looksLikeLeaveDateAttempt(input) {
		if isInLeaveFlow(state) {
			// Fall through to action-key dedup for leave date steps.
		} else {
			return false
		}
	}

	actionKey := fmt.Sprintf("%s|%d|%s", phone, state, canonicalInput(input))
	actionWindow := d.actionWindow
	if isGreeting(input) {
		actionWindow = d.greetingWindow
	} else if looksLikePeriodAttempt(input) {
		actionWindow = d.periodWindow
	} else if cInp := canonicalInput(input); cInp == payloadRequestHolidays || cInp == payloadRequestReferral {
		actionWindow = 5 * time.Minute
	}
	if seenAt, ok := d.byAction[actionKey]; ok && now.Sub(seenAt) < actionWindow {
		return true
	}
	d.byAction[actionKey] = now

	return false
}

func (d *dedupStore) tryAcquirePayslip(phone string, month, year int) (acquired bool, silent bool) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	d.evict(now)

	key := payslipDeliveryKey(phone, month, year)
	if d.inFlightPayslip[key] {
		return false, true
	}
	if seenAt, ok := d.byPayslipDelivery[key]; ok && now.Sub(seenAt) < d.payslipWindow {
		return false, true
	}

	d.inFlightPayslip[key] = true
	return true, false
}

func (d *dedupStore) releasePayslip(phone string, month, year int) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.inFlightPayslip, payslipDeliveryKey(phone, month, year))
}

func (d *dedupStore) isRecentPayslip(phone string, month, year int) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	key := payslipDeliveryKey(phone, month, year)
	if seenAt, ok := d.byPayslipDelivery[key]; ok && now.Sub(seenAt) < d.payslipWindow {
		return true
	}
	return false
}

func (d *dedupStore) markPayslipDelivered(phone string, month, year int) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.byPayslipDelivery[payslipDeliveryKey(phone, month, year)] = time.Now()
}

func (d *dedupStore) clearPayslipDelivery(phone string, month, year int) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.byPayslipDelivery, payslipDeliveryKey(phone, month, year))
}

func (d *dedupStore) tryAcquireLeaveSubmit(phone string) (acquired bool, silent bool) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	d.evict(now)

	if d.inFlightLeaveSubmit[phone] {
		return false, true
	}
	if seenAt, ok := d.byLeaveSubmit[phone]; ok && now.Sub(seenAt) < d.leaveSubmitWindow {
		return false, true
	}

	d.inFlightLeaveSubmit[phone] = true
	return true, false
}

func (d *dedupStore) releaseLeaveSubmit(phone string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	delete(d.inFlightLeaveSubmit, phone)
}

func (d *dedupStore) markLeaveSubmitted(phone string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.byLeaveSubmit[phone] = time.Now()
	delete(d.inFlightLeaveSubmit, phone)
}

func payslipDeliveryKey(phone string, month, year int) string {
	return fmt.Sprintf("%s|%d|%d", phone, month, year)
}

func (d *dedupStore) evict(now time.Time) {
	for id, seenAt := range d.byMessageID {
		if now.Sub(seenAt) > d.ttl {
			delete(d.byMessageID, id)
		}
	}
	for key, seenAt := range d.byAction {
		if now.Sub(seenAt) > d.greetingWindow {
			delete(d.byAction, key)
		}
	}
	for phone, seenAt := range d.lastStructuredAt {
		if now.Sub(seenAt) > d.echoWindow {
			delete(d.lastStructuredAt, phone)
		}
	}
	for key, seenAt := range d.byPayslipDelivery {
		if now.Sub(seenAt) > d.payslipWindow {
			delete(d.byPayslipDelivery, key)
		}
	}
	for phone, seenAt := range d.byLeaveSubmit {
		if now.Sub(seenAt) > d.leaveSubmitWindow {
			delete(d.byLeaveSubmit, phone)
		}
	}
}

func canonicalInput(input string) string {
	switch normalizeMenuSelection(input) {
	case payloadGeneratePay, payloadRequestSalary, payloadRequestLeave, payloadRequestHolidays, payloadRequestReferral, payloadRequestHealthCard:
		return normalizeMenuSelection(input)
	default:
		if sel := normalizeLeaveTypeSelection(input); sel != "" {
			return sel
		}
		return strings.ToLower(input)
	}
}

func looksLikePeriodAttempt(input string) bool {
	input = strings.ReplaceAll(strings.TrimSpace(input), ";", "/")
	if !strings.Contains(input, "/") {
		return false
	}
	return len(strings.Split(input, "/")) == 2
}

func looksLikeLeaveDateAttempt(input string) bool {
	input = strings.ReplaceAll(strings.TrimSpace(input), ";", "/")
	if !strings.Contains(input, "/") {
		return false
	}
	return len(strings.Split(input, "/")) == 3
}

func normalizeMenuSelection(input string) string {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)
	switch {
	case trimmed == payloadGeneratePay, lower == "generate pay":
		return payloadGeneratePay
	case trimmed == payloadRequestSalary, lower == "request salary slip", lower == "salary slip":
		return payloadRequestSalary
	case trimmed == payloadRequestLeave, lower == "request leave":
		return payloadRequestLeave
	case trimmed == payloadRequestHealthCard, lower == "request health card", lower == "health card":
		return payloadRequestHealthCard
	case trimmed == payloadRequestHolidays, lower == "holiday calendar":
		return payloadRequestHolidays
	case trimmed == payloadRequestReferral, trimmed == payloadReferCandidate, lower == "referral link", lower == "refer a candidate", lower == "refer":
		return payloadRequestReferral
	}
	// WhatsApp often echoes the full interactive body plus the chosen button label.
	if isMainMenuEcho(lower) || strings.Contains(lower, "how may we help") || strings.Contains(lower, "more options") {
		switch {
		case strings.Contains(lower, "request leave"):
			return payloadRequestLeave
		case strings.Contains(lower, "salary slip"), strings.Contains(lower, "request salary slip"):
			return payloadRequestSalary
		case strings.Contains(lower, "generate pay"):
			return payloadGeneratePay
		case strings.Contains(lower, "holiday calendar"):
			return payloadRequestHolidays
		case strings.Contains(lower, "referral link"), strings.Contains(lower, "refer a candidate"), strings.Contains(lower, "refer"):
			return payloadRequestReferral
		}
	}
	return trimmed
}

func normalizeLeaveTypeSelection(input string) string {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)
	if sel := normalizeLeaveTypeButtonLabel(lower); sel != "" {
		return sel
	}
	// WhatsApp often echoes the full interactive body plus the chosen button label.
	if isLeaveTypePromptBody(lower) {
		if last := strings.ToLower(strings.TrimSpace(lastNonEmptyLine(trimmed))); last != "" {
			if sel := normalizeLeaveTypeButtonLabel(last); sel != "" {
				return sel
			}
		}
		return ""
	}
	return ""
}

func normalizeLeaveTypeButtonLabel(lower string) string {
	lower = strings.TrimSpace(lower)
	switch {
	case lower == payloadLeaveCasual, lower == "casual leave", lower == "casual":
		return payloadLeaveCasual
	case lower == payloadLeaveDuty, lower == "duty leave", lower == "duty":
		return payloadLeaveDuty
	}
	if strings.Contains(lower, "casual") {
		return payloadLeaveCasual
	}
	if strings.Contains(lower, "duty") {
		return payloadLeaveDuty
	}

	return ""
}

func isLeaveTypePromptBody(lower string) bool {
	return strings.Contains(lower, "leave application") &&
		strings.Contains(lower, "what type of leave do you need")
}

func lastNonEmptyLine(s string) string {
	lines := strings.Split(s, "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if line := strings.TrimSpace(lines[i]); line != "" {
			return line
		}
	}
	return ""
}
