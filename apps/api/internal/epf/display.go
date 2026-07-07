package epf

import (
	"regexp"
	"strings"
)

const pfNumberPrefix = "KR/KCH/19297/"

var hasDigit = regexp.MustCompile(`\d`)

// isValidAccount ensures the string contains at least one digit.
// Rejects alphabetic locations like "Ernakulam" or "IT".
func isValidAccount(s string) bool {
	if s == "" || s == "0" || strings.ToLower(s) == "n/a" {
		return false
	}
	return hasDigit.MatchString(s)
}

// FormatPFNumber returns the full PF account number for payslip display.
func FormatPFNumber(epfNumber string) string {
	epfNumber = strings.TrimSpace(epfNumber)
	if !isValidAccount(epfNumber) {
		return "N/A"
	}
	if strings.Contains(epfNumber, "/") {
		return epfNumber
	}
	return pfNumberPrefix + epfNumber
}

// FormatESINumber returns the ESI IP number for payslip display.
func FormatESINumber(esiNumber string) string {
	esiNumber = strings.TrimSpace(esiNumber)
	if !isValidAccount(esiNumber) {
		return "N/A"
	}
	return esiNumber
}

// FormatUAN returns the UAN for payslip display.
func FormatUAN(uan string) string {
	uan = strings.TrimSpace(uan)
	if !isValidAccount(uan) {
		return "N/A"
	}
	return uan
}
