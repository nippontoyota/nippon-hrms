package whatsapp

import (
	"fmt"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgNotEmployee = `[UNAUTHORIZED ACCESS]
This number is not registered in the Nippon HR Connect Master Database. Please contact the HR Department to link your WhatsApp number.`

func msgWelcome(name string) string {
	if name != "" {
		return fmt.Sprintf("Hi %s,\n\nWelcome to Nippon HR Connect.", name)
	}
	return `Welcome to Nippon HR Connect.`
}

const msgMainMenuBody = `Please select an option from the menu below to proceed.`

const msgNoPayslips = `No historical payslip records were found for your employee profile. Please consult HR for clarification.`

const msgPayslipNotFound = `No payroll data exists for the requested period. Please try a different month.`

const msgPayslipError = `A system error occurred while generating your official PDF payslip. Please try again or contact IT Support.`

const msgPayslipAwaitMonthFallback = `Please specify the payslip month and year in MM/YYYY format.

Example: 06/2026`

func msgPayslipAlreadySent(month, year int) string {
	return fmt.Sprintf(
		"You already received your payslip for %02d/%d. Reply Hi to request another period.",
		month, year,
	)
}

func msgPayslipCaption(name, monthStr string, year int) string {
	return fmt.Sprintf(
		"*Payslip - %s %d*\n\nDear %s,\n\nPlease find attached your payslip for the month of %s %d.\n\nFor any discrepancies, please reach out to HR.",
		monthStr, year, name, monthStr, year,
	)
}

func mainMenuButtons() []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{
		{
			ID:    payloadGeneratePay,
			Title: "Request Salary Slip",
		},
		{
			ID:    payloadRequestLeave,
			Title: "Request Leave",
		},
	}
}

const msgLeaveAwaitStart = `*Leave Application*

Please enter the *Start Date* for your leave (DD/MM/YYYY).
Note: Start and End dates are both inclusive.

Example: 01/07/2026`

const msgLeaveAwaitEnd = `Got it. Now enter the *End Date* (DD/MM/YYYY).
Example: 05/07/2026`

const msgLeaveAwaitReason = `Please provide a brief *reason* for your leave.`

func msgLeaveConfirmPrompt(start, end, reason string, days int) string {
	return fmt.Sprintf(
		"Please confirm your leave details:\n\n*Start:* %s\n*End:* %s\n*Total Days:* %d\n*Reason:* %s\n\nReply *yes* to submit or *no* to cancel.",
		start, end, days, reason,
	)
}

const msgLeaveCreated = `*Leave Request Submitted*

Your leave request has been submitted and is pending approval. Reply *Hi* for the main menu.`
const msgLeaveCancelled = `*Action Terminated*

Your leave application was discarded. Reply *Hi* for the main menu.`
