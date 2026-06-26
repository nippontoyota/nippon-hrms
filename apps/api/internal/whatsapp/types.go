package whatsapp

import "time"

type State int

const (
	StateIdle State = iota

	StateMainMenu

	StatePayslipAwaitMonth

	StateTicketAwaitTitle
	StateTicketAwaitDesc
	StateTicketAwaitConfirm

	// ── Phase 1 Additions ──
	StateLeaveAwaitStart
	StateLeaveAwaitEnd
	StateLeaveAwaitReason
	StateLeaveAwaitConfirm

	StateAttendanceView
	StateIncentiveView
	StateFeedbackAwaitText

	StateHolidayView
)

type Session struct {
	Phone      string
	State      State
	EmployeeID string
	Ticket     TicketDraft
	Leave      LeaveDraft
	UpdatedAt  time.Time
}

type TicketDraft struct {
	Title       string
	Description string
}

type LeaveDraft struct {
	StartDate string
	EndDate   string
	Reason    string
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
	s.Ticket = TicketDraft{}
	s.Leave = LeaveDraft{}
}
