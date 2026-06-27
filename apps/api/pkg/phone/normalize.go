package phone

import (
	"strings"
	"unicode"
)

// NormalizeIndian returns the last 10 digits of an Indian mobile number.
// Handles formats like +918590215315, 918590215315, 8590215315, +91 85902 15315.
func NormalizeIndian(raw string) string {
	var digits strings.Builder
	for _, r := range raw {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}
	s := digits.String()
	if len(s) > 10 {
		return s[len(s)-10:]
	}
	return s
}
