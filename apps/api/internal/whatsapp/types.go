// Package whatsapp owns the WhatsApp employee self-service conversation layer.
// It sits between the DoubleTick HTTP client and the HR business logic.
package whatsapp

import "time"

// ─── Session State ────────────────────────────────────────────────────────────

// State represents where the employee is in the conversation flow.
type State int

const (
	StateIdle State = iota // no active conversation

	// Main menu
	StateMainMenu

	// Payslip flow
	StatePayslipAwaitID // waiting for employee ID

	// Maintenance ticket flow
	StateTicketAwaitTitle // waiting for ticket title
	StateTicketAwaitDesc  // waiting for ticket description
	StateTicketAwaitConfirm

	// Holiday calendar — stateless, single response
	StateHolidayView
)

// ─── Session ──────────────────────────────────────────────────────────────────

// Session holds the in-flight conversation state for a single WhatsApp number.
// Stored in memory; the interface makes it easy to swap to Redis later.
type Session struct {
	Phone      string        // WhatsApp phone number (primary key for session lookup)
	State      State
	EmployeeID string        // populated once the employee self-identifies
	Ticket     TicketDraft   // accumulated while in the ticket flow
	UpdatedAt  time.Time
}

// TicketDraft collects fields for a new maintenance ticket across multiple turns.
type TicketDraft struct {
	Title       string
	Description string
}

// reset clears flow-specific data and returns the session to Idle.
func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
	s.Ticket = TicketDraft{}
}
