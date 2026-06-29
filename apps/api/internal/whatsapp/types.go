package whatsapp

import "time"

const (
	payloadGeneratePay   = "generate_pay"
	payloadRequestSalary = "request_salary_slip"
	payloadRequestLeave  = "request_leave"
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

	TempLeaveStart  string
	TempLeaveEnd    string
	TempLeaveReason string
}

func (s *Session) resetFlow() {
	s.State = StateIdle
	s.LastMenuSentAt = time.Time{}
	s.LastPeriodPromptAt = time.Time{}
	s.TempLeaveStart = ""
	s.TempLeaveEnd = ""
	s.TempLeaveReason = ""
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
}
