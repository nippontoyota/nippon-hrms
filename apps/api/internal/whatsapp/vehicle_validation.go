package whatsapp

import (
	"regexp"
	"strings"
	"unicode"
)

var regNoRegex = regexp.MustCompile(`^[A-Z]{2}[0-9]{1,2}[A-Z]{0,4}[0-9]{1,4}$`)

// cleanRegNo strips whitespace, dashes, and dots, converting to uppercase.
func cleanRegNo(raw string) string {
	var sb strings.Builder
	for _, r := range raw {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			sb.WriteRune(unicode.ToUpper(r))
		}
	}
	return sb.String()
}

// isValidVehicleRegNo checks if a cleaned string is a valid Indian registration number.
func isValidVehicleRegNo(input string) bool {
	cleaned := cleanRegNo(input)
	if len(cleaned) < 6 || len(cleaned) > 13 {
		return false
	}

	if regNoRegex.MatchString(cleaned) {
		return true
	}

	// General fallback: starts with letter, ends with digit, has at least 2 letters and 2 digits
	letters := 0
	digits := 0
	for _, r := range cleaned {
		if r >= 'A' && r <= 'Z' {
			letters++
		} else if r >= '0' && r <= '9' {
			digits++
		}
	}

	firstChar := rune(cleaned[0])
	lastChar := rune(cleaned[len(cleaned)-1])

	return letters >= 2 && digits >= 2 &&
		firstChar >= 'A' && firstChar <= 'Z' &&
		lastChar >= '0' && lastChar <= '9'
}

// looksLikeVehicleRegNo checks if a text looks like a vehicle registration number (e.g. KL05AF3141).
func looksLikeVehicleRegNo(input string) bool {
	cleaned := cleanRegNo(input)
	if len(cleaned) < 5 || len(cleaned) > 14 {
		return false
	}
	return isValidVehicleRegNo(cleaned)
}

// isValidLocation checks if an input is a valid physical location/place name.
func isValidLocation(input string) (bool, string) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return false, "Location is mandatory. Please type the location of the vehicle."
	}

	lower := strings.ToLower(trimmed)
	if lower == "skip" {
		return false, "Location is mandatory and cannot be skipped. Please type the location of the vehicle."
	}

	// Catch if user entered a vehicle registration number instead of location
	if looksLikeVehicleRegNo(trimmed) {
		return false, "That looks like a vehicle registration number (" + strings.ToUpper(trimmed) + "). Location must be a town, city, or physical place name (e.g. Thiruvalla, Kalamassery, Edapally). Please enter the location:"
	}

	letters := 0
	digits := 0
	for _, r := range trimmed {
		if unicode.IsLetter(r) {
			letters++
		} else if unicode.IsDigit(r) {
			digits++
		}
	}

	// Must have at least 2 letters (supports Malayalam, English, etc.)
	if letters < 2 {
		return false, "Location must be a town or city name (e.g. Thiruvalla, Kalamassery). Please enter the location:"
	}

	// Digits should not overpower letters (e.g. entering phone numbers or PIN codes)
	if digits > letters {
		return false, "That looks like a number or code. Location must be a town or city name (e.g. Thiruvalla, Kalamassery). Please enter the location:"
	}

	return true, ""
}

// isUnsupportedMessageType checks if an incoming message is an unsupported message indicator from DoubleTick.
func isUnsupportedMessageType(input string) bool {
	lower := strings.ToLower(strings.TrimSpace(input))
	return strings.Contains(lower, "unsupported message type")
}
