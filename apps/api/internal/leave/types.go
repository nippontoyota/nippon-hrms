package leave

import (
	"context"
	"time"

	"github.com/nippon-toyota/hrms/internal/employee"
)

type LeaveStatus string

const (
	StatusPending  LeaveStatus = "pending"
	StatusApproved LeaveStatus = "approved"
	StatusRejected LeaveStatus = "rejected"
)

type LeaveType string

const (
	TypeCasual    LeaveType = "casual"
	TypeSick      LeaveType = "sick"
	TypeAnnual    LeaveType = "annual"
	TypeMaternity LeaveType = "maternity"
	TypePaternity LeaveType = "paternity"
	TypeUnpaid    LeaveType = "unpaid"
)

type LeaveRequest struct {
	ID          string            `json:"id"`
	EmployeeID  string            `json:"employeeId"`
	Type        LeaveType         `json:"type"`
	FromDate    string            `json:"fromDate"` // YYYY-MM-DD
	ToDate      string            `json:"toDate"`   // YYYY-MM-DD
	Days        int               `json:"days"`
	Reason      string            `json:"reason"`
	Status          LeaveStatus       `json:"status"`
	RejectionReason *string           `json:"rejectionReason,omitempty"`
	ReviewedBy      *string           `json:"reviewedBy,omitempty"`
	ReviewedAt  *time.Time        `json:"reviewedAt,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	Employee    *employee.Employee `json:"employee,omitempty"` // For joining
}

type LeaveBalance struct {
	EmployeeID  string `json:"employeeId"`
	Month       int    `json:"month"`
	Year        int    `json:"year"`
	TotalCasual int    `json:"totalCasual"`
	UsedCasual  int    `json:"usedCasual"`
	TotalSick   int    `json:"totalSick"`
	UsedSick    int    `json:"usedSick"`
}

func (b *LeaveBalance) RemainingCasual() int {
	rem := b.TotalCasual - b.UsedCasual
	if rem < 0 {
		return 0
	}
	return rem
}

func (b *LeaveBalance) RemainingSick() int {
	rem := b.TotalSick - b.UsedSick
	if rem < 0 {
		return 0
	}
	return rem
}

type Repository interface {
	Create(ctx context.Context, req *LeaveRequest) error
	ListAll(ctx context.Context) ([]LeaveRequest, error)
	UpdateStatus(ctx context.Context, id string, status LeaveStatus, reviewerID *string, rejectionReason *string) error
	GetMonthlyBalance(ctx context.Context, employeeID string, month, year int) (*LeaveBalance, error)
	GetByID(ctx context.Context, id string) (*LeaveRequest, error)
}
