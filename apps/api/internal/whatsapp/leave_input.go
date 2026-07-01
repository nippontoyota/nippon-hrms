package whatsapp

import "strings"

const minLeaveReasonLen = 3

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
	case StateLeaveAwaitReason, StateLeaveAwaitConfirm:
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
	return state >= StateLeaveAwaitType && state <= StateLeaveAwaitConfirm
}
