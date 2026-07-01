package whatsapp

import (
	"regexp"
	"strings"
)

const minLeaveReasonLen = 3

const minRejectionReasonLen = 10

var rejectionDatePattern = regexp.MustCompile(`(?i)\b\d{1,2}/\d{1,2}/\d{4}\b`)

// isValidRejectionReason mirrors the HR portal rejection reason rules: at least
// 10 characters, two distinct words, not a date, and not an approve/reject button echo.
func isValidRejectionReason(input string) bool {
	trimmed := strings.TrimSpace(input)
	if isLeaveApprovalButtonEcho(trimmed) {
		return false
	}
	if len(trimmed) < minRejectionReasonLen {
		return false
	}
	if rejectionDatePattern.MatchString(trimmed) {
		return false
	}
	words := strings.Fields(strings.ToLower(trimmed))
	if len(words) < 2 {
		return false
	}
	seen := make(map[string]struct{}, len(words))
	for _, w := range words {
		seen[w] = struct{}{}
	}
	return len(seen) >= 2
}

func isLeaveConfirmAffirmative(input string) bool {
	switch strings.ToLower(strings.TrimSpace(input)) {
	case "yes", "y", "yeah", "ok", "okay", "confirm", "submit":
		return true
	default:
		return false
	}
}

func isLeaveConfirmNegative(input string) bool {
	switch strings.ToLower(strings.TrimSpace(input)) {
	case "no", "cancel", "0":
		return true
	default:
		return false
	}
}

func isLeaveConfirmKeyword(input string) bool {
	return isLeaveConfirmAffirmative(input) || isLeaveConfirmNegative(input)
}

func isValidLeaveReason(input string) bool {
	trimmed := strings.TrimSpace(input)
	if isBotPromptEcho(trimmed) {
		return false
	}
	if len(trimmed) < minLeaveReasonLen {
		return false
	}
	if looksLikeLeaveDateAttempt(trimmed) || looksLikePeriodAttempt(trimmed) {
		return false
	}
	if isLeaveConfirmKeyword(trimmed) {
		return false
	}
	return true
}

func isValidInputForState(state State, input string) bool {
	if isGreeting(input) || input == "0" {
		return true
	}

	switch state {
	case StateLeaveAwaitType:
		return normalizeLeaveTypeSelection(input) != ""
	case StateLeaveAwaitStart, StateLeaveAwaitEnd:
		_, ok := parseLeaveDate(input)
		return ok
	case StateLeaveAwaitReason:
		return isValidLeaveReason(input)
	case StateLeaveAwaitConfirm:
		return isLeaveConfirmAffirmative(input) || isLeaveConfirmNegative(input)
	default:
		return true
	}
}

func isLeaveCancelIntent(input string) bool {
	switch normalizeGreetingInput(input) {
	case "hi", "0", "cancel", "menu", "reset", "start":
		return true
	default:
		return false
	}
}

func isCasualGreeting(input string) bool {
	switch normalizeGreetingInput(input) {
	case "hello", "hey":
		return true
	default:
		return false
	}
}

func isStoredLeaveDateEcho(sess *Session, input string) bool {
	if sess == nil {
		return false
	}
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return false
	}
	if trimmed == sess.LastAcceptedLeaveInput {
		return true
	}
	parsed, ok := parseLeaveDate(trimmed)
	if !ok {
		return false
	}
	iso := parsed.Format("2006-01-02")
	return iso == sess.TempLeaveStart || iso == sess.TempLeaveEnd
}

func isInLeaveFlow(state State) bool {
	return state >= StateLeaveAwaitType && state <= StateLeaveAwaitRejectionReason
}
