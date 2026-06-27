package epf

import "strings"

const pfNumberPrefix = "KR/KCH/19297/"

// FormatPFNumber returns the full PF account number for payslip display.
func FormatPFNumber(epfNumber string) string {
	epfNumber = strings.TrimSpace(epfNumber)
	if epfNumber == "" {
		return ""
	}
	if strings.Contains(epfNumber, "/") {
		return epfNumber
	}
	return pfNumberPrefix + epfNumber
}

// FormatESINumber returns the ESI IP number for payslip display.
func FormatESINumber(esiNumber string) string {
	esiNumber = strings.TrimSpace(esiNumber)
	if esiNumber == "" || esiNumber == "0" {
		return "0"
	}
	return esiNumber
}
