package handler

import (
	"regexp"
	"strings"
)

const minRejectionReasonLen = 10

var rejectionDatePattern = regexp.MustCompile(`(?i)\b\d{1,2}/\d{1,2}/\d{4}\b`)

func validateRejectionReason(reason string) string {
	trimmed := strings.TrimSpace(reason)
	if len(trimmed) < minRejectionReasonLen {
		return "rejection reason must be at least 10 characters"
	}
	if rejectionDatePattern.MatchString(trimmed) {
		return "rejection reason must not be a date"
	}
	words := strings.Fields(strings.ToLower(trimmed))
	if len(words) < 2 {
		return "rejection reason must contain at least two words"
	}
	seen := make(map[string]struct{}, len(words))
	counts := make(map[string]int, len(words))
	for _, w := range words {
		seen[w] = struct{}{}
		counts[w]++
		if len(w) >= 3 && counts[w] >= 3 {
			return "rejection reason contains too much repeated text"
		}
	}
	if len(seen) < 2 {
		return "rejection reason must contain at least two distinct words"
	}
	return ""
}
