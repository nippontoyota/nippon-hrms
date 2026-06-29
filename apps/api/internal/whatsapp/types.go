package whatsapp

import "time"

const (
	payloadGeneratePay = "generate_pay"
)

type State int

const (
	StateIdle State = iota
	StateAwaitPeriod
)

type Session struct {
	Phone              string
	State              State
	EmployeeID         string
	LastMenuSentAt     time.Time
	LastPeriodPromptAt time.Time
	LastPayslipSentAt  time.Time
	UpdatedAt          time.Time
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
