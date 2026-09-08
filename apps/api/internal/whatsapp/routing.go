package whatsapp

import (
	"strconv"
	"strings"
)

// acceptsInboundAtState reports whether a text message should be handled by the
// current state handler instead of being dropped as a button echo.
func acceptsInboundAtState(state State, input string) bool {
	input = strings.TrimSpace(input)
	if input == "" {
		return false
	}
	if isGreeting(input) || input == "0" || isAcknowledgment(input) {
		return true
	}

	switch state {
	case StateIdle:
		if isActiveMenuSelection(state, input) {
			return true
		}
		if normalizeLeaveTypeSelection(input) != "" {
			return true
		}
		if looksLikePeriodAttempt(input) {
			return true
		}
		return looksLikeLeaveDateAttempt(input)

	case StateAwaitPeriod:
		if isActiveMenuSelection(state, input) {
			return true
		}
		if looksLikePeriodAttempt(input) {
			_, _, ok := parseMMYYYY(input)
			return ok
		}
		return false

	case StateLeaveAwaitType:
		return normalizeLeaveTypeSelection(input) != ""

	case StateLeaveAwaitStart, StateLeaveAwaitEnd:
		_, ok := parseLeaveDate(input)
		return ok

	case StateLeaveAwaitDateConfirm:
		return isLeaveConfirmKeyword(input) || isValidLeaveReason(input)

	case StateLeaveAwaitReason:
		return isValidLeaveReason(input)

	case StateLeaveAwaitConfirm:
		return isLeaveConfirmKeyword(input)

	case StateLeaveAwaitRejectionReason:
		return isValidRejectionReason(input) || strings.ToLower(input) == "cancel" || input == "0"

	case StateLeaveAwaitPickRequest:
		if strings.ToLower(input) == "cancel" || input == "0" {
			return true
		}
		n, err := strconv.Atoi(strings.TrimSpace(input))
		return err == nil && n >= 1 && n <= 9

	case StateMaintenanceAwaitBranch, StateMaintenanceAwaitLocation, StateMaintenanceAwaitCategory, StateMaintenanceAwaitDescription:
		return true

	default:
		return false
	}
}

func isMenuSalarySelection(input string) bool {
	switch normalizeMenuSelection(input) {
	case payloadGeneratePay, payloadRequestSalary:
		return true
	default:
		return false
	}
}

func isMenuLeaveSelection(input string) bool {
	return normalizeMenuSelection(input) == payloadRequestLeave
}

// isActiveMenuSelection returns true for menu button answers that are valid at the given state.
func isActiveMenuSelection(state State, input string) bool {
	sel := normalizeMenuSelection(input)
	switch state {
	case StateIdle:
		return sel == payloadRequestSalary || sel == payloadRequestLeave || sel == payloadRequestHolidays || sel == payloadRequestReferral || sel == payloadReferCandidate || sel == payloadRequestHealthCard || sel == payloadRequestMaintenance || sel == payloadRequestBonus || sel == payloadRequestEncashment
	case StateAwaitPeriod:
		return sel == payloadGeneratePay || sel == payloadRequestSalary
	default:
		return false
	}
}

func isMainMenuEcho(input string) bool {
	lower := strings.ToLower(strings.TrimSpace(input))
	return strings.Contains(lower, "nippon hr connect") &&
		(strings.Contains(lower, "please select an option") || strings.Contains(lower, "how may we help"))
}

// isStalePromptEcho reports inbound text that repeats an outbound prompt body but is not
// a valid answer for the current state (e.g. the leave-type question without a selection).
func isStalePromptEcho(state State, input string) bool {
	return isBotPromptEcho(input) && !acceptsInboundAtState(state, input)
}
