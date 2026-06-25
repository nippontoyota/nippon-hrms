package whatsapp

import "time"

type State int

const (
	StateIdle State = iota

	StateMainMenu

	StateVerifyID
	StateVerifyDOB

	StatePayslipAwaitMonth

	StateTicketAwaitTitle
	StateTicketAwaitDesc
	StateTicketAwaitConfirm

	StateHolidayView
)

type Session struct {
	Phone      string
	State      State
	EmployeeID string
	Ticket     TicketDraft
	UpdatedAt  time.Time
}

type TicketDraft struct {
	Title       string
	Description string
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
	s.Ticket = TicketDraft{}
}
