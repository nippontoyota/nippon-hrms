package whatsapp

import (
	"fmt"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgNotEmployee = `This number is not registered. Please contact HR to link your WhatsApp number.`

const msgWelcome = `Welcome to Nippon Toyota HR Assistant!`

const msgGeneratePayBody = `Tap the button below to download your payslip.`

const msgNoPayslips = `No payslips are on file for your account yet. Please contact HR.`

const msgPayslipNotFound = `No payslip found for that period. Please try again.`

const msgPayslipError = `There was an issue generating your payslip. Please contact HR.`

const msgPayslipAwaitMonthFallback = `Please enter the payslip month and year in MM/YYYY format.

Example: 06/2026`

func msgPayslipAlreadySent(month, year int) string {
	return fmt.Sprintf(
		"You already received your payslip for %02d/%d. Reply Hi to request another period.",
		month, year,
	)
}

func msgPayslipCaption(name, monthStr string, year int) string {
	return fmt.Sprintf(
		"📄 *Payslip - %s %d*\n\nDear %s,\n\nPlease find attached your payslip for the month of %s %d.\n\nFor any discrepancies, please reach out to HR.",
		monthStr, year, name, monthStr, year,
	)
}

func generatePayButtons() []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{{
		ID:    payloadGeneratePay,
		Title: "Generate Pay",
	}}
}

const msgLeaveAwaitStart = `🏖️ *Leave Application*

Please enter the *Start Date* for your leave (DD-MM-YYYY).
Example: 01-07-2026`

const msgLeaveAwaitEnd = `🗓️ Got it. Now enter the *End Date* (DD-MM-YYYY).
Example: 05-07-2026`

const msgLeaveAwaitReason = `📝 Please provide a brief *reason* for your leave.`

func msgLeaveConfirmPrompt(start, end, reason string) string {
	return fmt.Sprintf(
		"Please confirm your leave details:\n\n*Start:* %s\n*End:* %s\n*Reason:* %s\n\nReply *yes* to submit or *no* to cancel.",
		start, end, reason,
	)
}

const msgLeaveCreated = `✅ Your leave application has been submitted and is pending manager approval. Reply *Hi* to return to the main menu.`
const msgLeaveCancelled = `❌ Leave application cancelled. Reply *Hi* to return to the main menu.`
