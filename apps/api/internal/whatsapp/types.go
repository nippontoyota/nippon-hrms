package whatsapp

import "time"

const (
	payloadGeneratePay = "generate_pay"
)

type State int

const (
	StateIdle State = iota
	StateAwaitPeriod
	StateLeaveAwaitStart
	StateLeaveAwaitEnd
	StateLeaveAwaitReason
	StateLeaveAwaitConfirm
)

type Session struct {
	Phone              string
	State              State
	EmployeeID         string
	LastMenuSentAt     time.Time
	LastPeriodPromptAt time.Time
	LastPayslipSentAt  time.Time
	UpdatedAt          time.Time

	// Temporary fields for leave application
	TempLeaveStart  string
	TempLeaveEnd    string
	TempLeaveReason string
}

func (s *Session) resetFlow() {
	s.State = StateIdle
	s.LastMenuSentAt = time.Time{}
	s.LastPeriodPromptAt = time.Time{}
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
}
