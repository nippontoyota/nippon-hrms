package whatsapp

import (
	"fmt"
	"github.com/nippon-toyota/hrms/internal/doubletick"
)

const msgVerifyPromptID = `🔒 *Verification Required*

Your phone number is not registered. To link your device to your Nippon Toyota employee account, please reply with your *Employee ID*.

Example: EMP001`

const msgVerifyPromptDOB = `📅 Great! Now please reply with your *Date of Birth* (YYYY-MM-DD) to securely verify your identity.

Example: 1990-05-24`

const msgVerifyFailed = `❌ Verification failed. Please check your details and try again, or contact HR.`

const msgVerifySuccess = `✅ Device verified successfully! Welcome to the HR Assistant.`

func MainMenuTemplate() doubletick.TemplateContent {
	return doubletick.TemplateContent{
		TemplateName: "hrms_main_menu",
		Language:     "en",

		Components: []doubletick.TemplateComponent{},
	}
}

const msgMainMenuFallback = `👋 Welcome to *Nippon Toyota HR Assistant*!

Please select an option by replying:
- *Payslip*
- *Ticket*
- *Holiday*

────────────────
Reply *0* anytime to return here.`

const msgUnknownOption = `❓ Sorry, I didn't understand that.

Reply *0* to see the main menu.`

const msgSessionReset = `🔄 Your session has been reset.`

const msgPayslipAwaitMonth = `💼 *Payslip Request*

Please enter the month and year you need the payslip for.

Example: 05/2026 or June 2026`

const msgPayslipNotFound = `❌ No payslip found for that period. Please check and try again, or reply *0* to go back.`

const msgPayslipError = `⚠️ There was an issue generating your payslip. Please contact HR.`

func msgPayslipReady(month, year string) string {
	return fmt.Sprintf(
		"✅ Payslip retrieved for *%s %s*.\n\n📄 Downloading document...",
		month, year,
	)
}

const msgTicketAwaitTitle = `🔧 *Raise Maintenance Ticket*

Please enter a brief *title* for your issue.

Example: _AC not working in Block B_`

const msgTicketAwaitDesc = `📝 Got it! Now describe the issue in a bit more detail.

Example: _The air conditioning unit in Block B Room 204 has not been working since Monday._`

func msgTicketConfirmPrompt(title, desc string) string {
	return fmt.Sprintf(
		"Please confirm your ticket details:\n\n*Title:* %s\n*Description:* %s\n\nReply *yes* to submit or *no* to cancel.",
		title, desc,
	)
}

func msgTicketCreated(ticketID string) string {
	return fmt.Sprintf(
		"✅ Your maintenance ticket has been raised!\n\n🎫 *Ticket ID:* %s\n📋 *Status:* Open\n\nOur team will follow up soon.\n\nReply *0* to return to the main menu.",
		ticketID,
	)
}

const msgTicketCancelled = `❌ Ticket cancelled. Reply *0* to return to the main menu.`

const msgHolidayCalendar = `📅 *Nippon Toyota Holiday Calendar 2026*

🗓️  Jan 26 — Republic Day
🗓️  Apr 14 — Tamil New Year / Ambedkar Jayanti
🗓️  May 01 — Labour Day
🗓️  Aug 15 — Independence Day
🗓️  Oct 02 — Gandhi Jayanti
🗓️  Nov 01 — Kannada Rajyotsava
🗓️  Dec 25 — Christmas

────────────────
For the full list, please contact HR or visit the intranet portal.

Reply *0* to return to the main menu.`

// ─── Phase 1 Additions ────────────────────────────────────────────────────────

// Leave Messages
const msgLeaveAwaitStart = `🏖️ *Leave Application*

Please enter the *Start Date* for your leave (YYYY-MM-DD).
Example: 2026-07-01`

const msgLeaveAwaitEnd = `🗓️ Got it. Now enter the *End Date* (YYYY-MM-DD).
Example: 2026-07-05`

const msgLeaveAwaitReason = `📝 Please provide a brief *reason* for your leave.`

func msgLeaveConfirmPrompt(start, end, reason string) string {
	return fmt.Sprintf(
		"Please confirm your leave details:\n\n*Start:* %s\n*End:* %s\n*Reason:* %s\n\nReply *yes* to submit or *no* to cancel.",
		start, end, reason,
	)
}

const msgLeaveCreated = `✅ Your leave application has been submitted and is pending manager approval. Reply *0* to return to the main menu.`
const msgLeaveCancelled = `❌ Leave application cancelled. Reply *0* to return to the main menu.`

// Attendance
const msgAttendanceSummary = `📊 *Attendance Summary (Current Month)*

✅ Days Present: 22
❌ Days Absent: 1
⚠️ Late Arrivals: 0

────────────────
Reply *0* to return to the main menu.`

// Incentive
const msgIncentiveSummary = `💰 *Incentive Statement*

Your incentive for the previous quarter has been processed.
Total Incentive: ₹15,000

If you need a detailed breakdown, please contact HR.
Reply *0* to return to the main menu.`

// Feedback
const msgFeedbackAwaitText = `🗣️ *Employee Feedback*

We value your input! Please type your feedback, suggestion, or concern below. This will be sent directly to the HR team.`

const msgFeedbackSubmitted = `✅ Thank you! Your feedback has been securely submitted to HR. Reply *0* to return to the main menu.`
