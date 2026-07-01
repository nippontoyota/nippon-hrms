package whatsapp

import (
	"time"

	"github.com/nippon-toyota/hrms/internal/leave"
)

const (
	payloadGeneratePay   = "generate_pay"
	payloadRequestSalary = "request_salary_slip"
	payloadRequestLeave  = "request_leave"
	payloadLeaveCasual   = "leave_casual"
	payloadLeaveSick     = "leave_sick"
)

type State int

const (
	StateIdle State = iota
	StateAwaitPeriod
	StateLeaveAwaitType
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

	TempLeaveType   leave.LeaveType
	TempLeaveStart  string
	TempLeaveEnd    string
	TempLeaveReason string
}

func (s *Session) resetFlow() {
	s.State = StateIdle
	s.LastMenuSentAt = time.Time{}
	s.LastPeriodPromptAt = time.Time{}
	s.TempLeaveType = ""
	s.TempLeaveStart = ""
	s.TempLeaveEnd = ""
	s.TempLeaveReason = ""
}
