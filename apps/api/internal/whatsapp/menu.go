package whatsapp

import (
	"fmt"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgNotEmployee = `We could not find your mobile number in the Nippon Toyota employee records.

If you are an employee, please contact HR to register your WhatsApp number. Otherwise, kindly reach out to HR for assistance.`

const msgWelcome = `Welcome to Nippon Toyota HR Assistant!`

const msgGeneratePayBody = `Tap the button below to download your payslip.`

const msgNoPayslips = `No payslips are on file for your account yet. Please contact HR.`

const msgPayslipNotFound = `No payslip found for that period. Please try again.`

const msgPayslipError = `There was an issue generating your payslip. Please contact HR.`

const msgPayslipAwaitMonthFallback = `Please enter the month and year you need the payslip for.

Example: 06/2026`

func msgPayslipCaption(name, monthStr string, year int) string {
	return fmt.Sprintf(
		"📄 *Payslip - %s %d*\n\nDear %s,\n\nPlease find attached your payslip for the month of %s %d.\n\nFor any discrepancies, please reach out to HR.",
		monthStr, year, name, monthStr, year,
	)
}

func periodListRowID(month, year int) string {
	return fmt.Sprintf("%s%d_%d", periodIDPrefix, month, year)
}

func periodListRowTitle(month, year int) string {
	monthNames := []string{
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if month >= 1 && month <= 12 {
		return fmt.Sprintf("%s %d", monthNames[month], year)
	}
	return fmt.Sprintf("%02d/%d", month, year)
}

func generatePayButtons() []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{{
		ID:    payloadGeneratePay,
		Title: "Generate Pay",
	}}
}
