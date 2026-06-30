package whatsapp

import (
	"fmt"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgNotEmployee = `This WhatsApp number is not registered in our system.

Please contact the HR department to register your number.`

func msgWelcome(name string) string {
	if strings.TrimSpace(name) != "" {
		return fmt.Sprintf("Hello %s,\n\nWelcome to Nippon HR Connect.\n\nPlease select an option using the buttons below.", strings.TrimSpace(name))
	}
	return `Welcome to Nippon HR Connect.

Please select an option using the buttons below.`
}

const msgMainMenuBody = `How may we help you today?`

const msgMenuTextFallback = `Please reply *Salary Slip* or *Request Leave*.`

const msgPayslipNotFound = `No payslip was found for the month you entered.

Please try another month or contact the HR department.`

const msgPayslipError = `We were unable to send your payslip at this time.

Please try again later or contact the HR department.`

const msgPayslipAwaitMonth = `Please enter the month and year for your payslip.

Format: MM/YYYY
Example: 06/2026`

const msgPayslipInvalidPeriod = `Invalid format.

Please enter month and year as MM/YYYY.
Example: 06/2026`

func msgPayslipAlreadySent(month, year int) string {
	return fmt.Sprintf(
		"Your payslip for %02d/%d has already been sent.\n\nReply Hi if you need a payslip for a different month.",
		month, year,
	)
}


func mainMenuButtons() []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{
		{ID: payloadRequestSalary, Title: "Salary Slip"},
		{ID: payloadRequestLeave, Title: "Request Leave"},
	}
}

const msgLeaveAwaitType = `Leave Application

What type of leave do you need?`

const msgLeaveTypeTextFallback = `Please tap *Casual Leave* or *Sick Leave* using the buttons above.`

const msgLeaveInvalidType = `Please select a leave type using the buttons below.`

func leaveTypeButtons() []doubletick.InteractiveButton {
	return []doubletick.InteractiveButton{
		{ID: payloadLeaveCasual, Title: "Casual Leave"},
		{ID: payloadLeaveSick, Title: "Sick Leave"},
	}
}

const msgLeaveAwaitStart = `Leave Application

Please enter your leave start date.

Format: DD/MM/YYYY
Example: 01/07/2026`

const msgLeaveAwaitEnd = `Please enter your leave end date.

Format: DD/MM/YYYY
Example: 05/07/2026

For a one-day leave, enter the same date as your start date.`

const msgLeaveAwaitReason = `Please enter the reason for your leave.`

const msgLeaveInvalidDate = `Invalid format.

Please enter the date as DD/MM/YYYY.
Example: 01/07/2026`

const msgLeaveStartInPast = `The start date cannot be in the past.

Please enter today's date or a future date.`

const msgLeaveEndBeforeStart = `The end date cannot be before the start date.

Please enter the correct end date.`

const msgLeaveConfirmHelp = `Please reply *Yes* to submit or *No* to cancel.`

func msgLeaveConfirmPrompt(leaveType, start, end, reason string, days int) string {
	return fmt.Sprintf(
		"Please confirm your leave details:\n\nLeave type: %s\nStart date: %s\nEnd date: %s\nTotal days: %d\nReason: %s\n\nReply *Yes* to submit or *No* to cancel.",
		leaveType, start, end, days, reason,
	)
}

func msgLeaveInsufficientBalance(days, remaining int, leaveKind, month string, year int) string {
	return fmt.Sprintf(
		"You have requested %d days of leave, but only %d %s leave days are available for %s %d.\n\nPlease apply for fewer days.",
		days, remaining, leaveKind, month, year,
	)
}

const msgLeaveCreated = `Your leave request has been submitted successfully.

It is pending approval from the HR department. Reply Hi to return to the main menu.`

const msgLeaveCancelled = `Your leave request has been cancelled.

Reply Hi to return to the main menu.`

const msgLeaveSubmitError = `Your leave request could not be submitted due to a system error.

Please try again or contact the HR department.`

const msgIdleNudge = `Reply *Hi* when you need something else.`

const msgIdleNudgePayslip = `Your payslip has been sent.

Reply *Hi* when you need something else.`

const msgSessionExpired = `Your previous session expired.

Reply *Hi* and start your request again.`
