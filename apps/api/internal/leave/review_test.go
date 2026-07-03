package leave

import (
	"errors"
	"testing"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func managerID(id string) *string { return &id }

func TestCanManagerReviewLeave(t *testing.T) {
	req := &LeaveRequest{
		ID:         "leave-1",
		EmployeeID: "emp-1",
		Status:     StatusPending,
		Employee: &employee.Employee{
			ID:        "emp-1",
			ManagerID: managerID("mgr-1"),
		},
	}

	if err := CanManagerReviewLeave("mgr-1", req); err != nil {
		t.Fatalf("valid manager should pass: %v", err)
	}

	if err := CanManagerReviewLeave("emp-1", req); !errors.Is(err, ErrSelfApproval) {
		t.Fatalf("self approval should fail: %v", err)
	}

	if err := CanManagerReviewLeave("other-mgr", req); !errors.Is(err, ErrNotAssignedManager) {
		t.Fatalf("wrong manager should fail: %v", err)
	}

	decided := *req
	decided.Status = StatusApproved
	if err := CanManagerReviewLeave("mgr-1", &decided); !errors.Is(err, ErrLeaveNotPending) {
		t.Fatalf("non-pending should fail: %v", err)
	}

	noMgr := *req
	noMgr.Employee = &employee.Employee{ID: "emp-1", ManagerID: nil}
	if err := CanManagerReviewLeave("mgr-1", &noMgr); !errors.Is(err, ErrNoManagerAssigned) {
		t.Fatalf("missing manager should fail: %v", err)
	}
}

func TestReviewLeaveErrorMessage(t *testing.T) {
	if msg := ReviewLeaveErrorMessage(ErrSelfApproval); msg == "" {
		t.Fatal("expected message for self approval")
	}
	if msg := ReviewLeaveErrorMessage(ErrLeaveNotPending); msg == "" {
		t.Fatal("expected already reviewed message")
	}
}
