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
	byMessageID        map[string]time.Time
	byAction           map[string]time.Time
	lastStructuredAt   map[string]time.Time
	byPayslipDelivery  map[string]time.Time
	inFlightPayslip    map[string]bool
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
		payslipWindow:     1 * time.Minute,
		byMessageID:       make(map[string]time.Time),
		byAction:          make(map[string]time.Time),
		lastStructuredAt:  make(map[string]time.Time),
		byPayslipDelivery: make(map[string]time.Time),
		inFlightPayslip:   make(map[string]bool),
	}
}

func (d *dedupStore) isDuplicate(messageID, phone, input, msgType string) bool {
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

	if msgType == "text" && !looksLikePeriodAttempt(input) && !looksLikeLeaveDateAttempt(input) {
		if seenAt, ok := d.lastStructuredAt[phone]; ok && now.Sub(seenAt) < d.echoWindow {
			return true
		}
	} else if msgType == "button" || msgType == "interactive" {
		d.lastStructuredAt[phone] = now
	}

	if looksLikeLeaveDateAttempt(input) {
		return false
	}

	actionKey := phone + "|" + canonicalInput(input)
	actionWindow := d.actionWindow
	if isGreeting(input) {
		actionWindow = d.greetingWindow
	} else if looksLikePeriodAttempt(input) {
		actionWindow = d.periodWindow
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
}

func canonicalInput(input string) string {
	switch normalizeMenuSelection(input) {
	case payloadGeneratePay, payloadRequestSalary, payloadRequestLeave:
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
	default:
		return trimmed
	}
}

func normalizeLeaveTypeSelection(input string) string {
	trimmed := strings.TrimSpace(input)
	lower := strings.ToLower(trimmed)
	switch {
	case trimmed == payloadLeaveCasual, lower == "casual leave", lower == "casual":
		return payloadLeaveCasual
	case trimmed == payloadLeaveSick, lower == "sick leave", lower == "sick":
		return payloadLeaveSick
	default:
		return ""
	}
}
