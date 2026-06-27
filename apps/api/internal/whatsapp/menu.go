package whatsapp

import (
	"fmt"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgNotEmployee = `*Unauthorized Access*

This mobile number is not registered in the Nippon Toyota Human Resources database.

If you are an active employee, please contact the HR department to update your registered contact information.`

const msgWelcome = `Welcome to *Nippon HR Connect*`

const msgGeneratePayBody = `Please select an option below to proceed with your request.`

const msgNoPayslips = `There are currently no payroll records available for your account. Please contact the HR department for further assistance.`

const msgPayslipNotFound = `No payroll records were found for the selected period. Please verify the month and year and try again.`

const msgPayslipError = `A system error occurred while generating your document. Please contact the HR department for support.`

const msgPayslipAwaitMonthFallback = `Please specify the required payroll period (Month and Year).

Format: MM/YYYY (e.g., 06/2026)`

func msgPayslipCaption(name, monthStr string, year int) string {
	return fmt.Sprintf(
		"📄 *Official Payslip | %s %d*\n\nDear %s,\n\nPlease find the attached payslip for the payroll period of %s %d.\n\nFor any discrepancies or payroll-related inquiries, please contact the HR department.",
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
