// Package whatsapp — menu.go is the single source of truth for all outbound
// message copy. Edit text here; no message strings live elsewhere.
package whatsapp

import "fmt"

// ─── Main Menu ────────────────────────────────────────────────────────────────

const msgMainMenu = `👋 Welcome to *Nippon Toyota HR Assistant*!

Please select an option by replying with the number:

1️⃣  Get Payslip
2️⃣  Raise Maintenance Ticket
3️⃣  Holiday Calendar

────────────────
Reply *0* anytime to see this menu again.`

// ─── Global ───────────────────────────────────────────────────────────────────

const msgUnknownOption = `❓ Sorry, I didn't understand that.

Reply *0* to see the main menu.`

const msgSessionReset = `🔄 Your session has been reset.` + "\n\n" + msgMainMenu

// ─── Payslip Flow ─────────────────────────────────────────────────────────────

const msgPayslipAwaitID = `💼 *Payslip Request*

Please enter your *Employee ID* to continue.

Example: EMP001`

const msgPayslipNotFound = `❌ Employee ID not found. Please check and try again, or reply *0* to go back.`

func msgPayslipReady(employeeID string) string {
	// TODO: replace with actual payslip generation + document URL once
	// payroll service and Supabase Storage are wired in.
	return fmt.Sprintf(
		"✅ Payslip retrieved for *%s*.\n\n📄 Your payslip will be shared shortly.\n\nReply *0* to return to the main menu.",
		employeeID,
	)
}

// ─── Maintenance Ticket Flow ──────────────────────────────────────────────────

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

// ─── Holiday Calendar ─────────────────────────────────────────────────────────

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
