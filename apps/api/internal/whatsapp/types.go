package whatsapp

import (
	"time"

	"github.com/nippon-toyota/hrms/internal/leave"
)

const (
	payloadGeneratePay        = "generate_pay"
	payloadRequestSalary      = "request_salary_slip"
	payloadRequestLeave       = "request_leave"
	payloadRequestHolidays    = "request_holidays"
	payloadRequestHealthCard  = "request_health_card"
	payloadRequestMaintenance = "request_maintenance"
	payloadReferCandidate     = "refer_candidate"
	payloadRequestBonus       = "request_approved_bonus_2026"
	payloadRequestEncashment  = "request_leave_encashment_2026"

	payloadLeaveCasual     = "leave_casual"
	payloadLeaveDuty       = "leave_duty"
	payloadRequestReferral = "request_referral_link"

	leaveReasonWhatsApp = "Requested via WhatsApp"
)

type State int

const (
	StateIdle State = iota
	StateAwaitPeriod
	StateLeaveAwaitType
	StateLeaveAwaitStart
	StateLeaveAwaitEnd
	StateLeaveAwaitDateConfirm
	StateLeaveAwaitReason
	StateLeaveAwaitConfirm
	StateLeaveAwaitRejectionReason
	StateLeaveAwaitPickRequest

	StateMaintenanceAwaitBranch
	StateMaintenanceAwaitLocation
	StateMaintenanceAwaitCategory
	StateMaintenanceAwaitDescription
	StateMaintenanceAwaitImage
)

type Session struct {
	Phone                  string
	State                  State
	EmployeeID             string
	LastMenuSentAt         time.Time
	LastPeriodPromptAt     time.Time
	LastPayslipSentAt      time.Time
	LastLeaveTypePromptAt  time.Time
	LastLeaveSubmittedAt   time.Time
	LastLeaveDateAt        time.Time
	LastAcceptedLeaveInput string
	LastLeaveStepAt        time.Time
	LastEndPromptAt        time.Time
	HasEndDateAttempt      bool
	LastStartMessageID     string
	LastReasonPromptAt     time.Time
	LastLeaveReminderAt    time.Time
	LastOutboundAt         time.Time
	LastOutboundText       string
	UpdatedAt              time.Time

	TempLeaveType           leave.LeaveType
	TempLeaveStart          string
	TempLeaveEnd            string
	TempLeaveReason         string
	PendingRejectionLeaveID string
	LastRejectionPromptAt   time.Time
	PendingPickLeaveIDs     []string
	PendingTemplateApprove  *bool

	TempMaintenanceBranchID    string
	TempMaintenanceLocation    string
	TempMaintenanceCategory    string
	TempMaintenanceDescription string
	TempMaintenanceImageURL    string
}

func (s *Session) resetFlow() {
	s.State = StateIdle
	s.LastMenuSentAt = time.Time{}
	s.LastPeriodPromptAt = time.Time{}
	s.TempLeaveType = ""
	s.TempLeaveStart = ""
	s.TempLeaveEnd = ""
	s.TempLeaveReason = ""
	s.PendingRejectionLeaveID = ""
	s.LastRejectionPromptAt = time.Time{}
	s.PendingPickLeaveIDs = nil
	s.PendingTemplateApprove = nil
	s.LastStartMessageID = ""

	s.TempMaintenanceBranchID = ""
	s.TempMaintenanceLocation = ""
	s.TempMaintenanceCategory = ""
	s.TempMaintenanceDescription = ""
	s.TempMaintenanceImageURL = ""
}

func (s *Session) reset() {
	s.State = StateIdle
	s.EmployeeID = ""
}
