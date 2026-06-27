package whatsapp

import "time"

const (
	payloadGeneratePay = "generate_pay"
	periodIDPrefix     = "payslip_"
)

type State int

const (
	StateIdle State = iota
	StateAwaitPeriod
)

type Session struct {
	Phone      string
	State      State
	EmployeeID string
	UpdatedAt  time.Time
}

func (s *Session) resetFlow() {
	s.State = StateIdle
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
}
