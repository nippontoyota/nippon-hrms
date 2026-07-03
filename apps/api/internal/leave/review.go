package leave

import (
	"errors"
)

var (
	ErrLeaveNotPending    = errors.New("leave is not pending")
	ErrLeaveNotFound      = errors.New("leave not found")
	ErrNotAssignedManager = errors.New("reviewer is not the assigned manager")
	ErrSelfApproval       = errors.New("employee cannot review own leave")
	ErrNoManagerAssigned  = errors.New("employee has no assigned manager")
)

func CanManagerReviewLeave(reviewerID string, req *LeaveRequest) error {
	if req == nil {
		return ErrLeaveNotFound
	}
	if req.Status != StatusPending {
		return ErrLeaveNotPending
	}
	if req.Employee == nil || req.Employee.ManagerID == nil || *req.Employee.ManagerID == "" {
		return ErrNoManagerAssigned
	}
	if reviewerID == req.EmployeeID {
		return ErrSelfApproval
	}
	if reviewerID != *req.Employee.ManagerID {
		return ErrNotAssignedManager
	}
	return nil
}

func ReviewLeaveErrorMessage(err error) string {
	switch {
	case errors.Is(err, ErrLeaveNotPending):
		return "This leave request was already reviewed."
	case errors.Is(err, ErrNotAssignedManager), errors.Is(err, ErrSelfApproval):
		return "You are not authorized to review this leave request."
	case errors.Is(err, ErrNoManagerAssigned):
		return "No manager is assigned to this employee. Please contact HR."
	case errors.Is(err, ErrLeaveNotFound):
		return "Sorry, we could not find that leave request."
	default:
		return "System error. Could not update leave status."
	}
}
