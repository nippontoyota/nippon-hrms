package whatsapp

import (
	"context"
	"testing"

	"github.com/nippon-toyota/hrms/internal/employee"
)

type flowBenefitRepo struct {
	benefits map[string]*employee.EmployeeBenefit
}

func (r *flowBenefitRepo) GetBenefit(_ context.Context, employeeID string, benefitType employee.BenefitType, period string) (*employee.EmployeeBenefit, error) {
	return r.benefits[employeeID+":"+string(benefitType)+":"+period], nil
}

func TestBenefitsMenuContainsBothOptions(t *testing.T) {
	rows := moreOptionsListSections()[0].Rows
	seen := map[string]bool{}
	for _, row := range rows {
		seen[row.ID] = true
	}
	if !seen[payloadRequestBonus] || !seen[payloadRequestEncashment] {
		t.Fatalf("benefits options missing from More Options: %+v", rows)
	}
}

func TestBenefitFlowReturnsBothEmployeeValues(t *testing.T) {
	svc, rec, _, phone := newFlowTestService(t)
	bonus := 24690.12
	encashment := 50720.547945
	svc.benefitRepo = &flowBenefitRepo{benefits: map[string]*employee.EmployeeBenefit{
		"EMP001:" + string(employee.BenefitApprovedBonus) + ":2026":      {EmployeeID: "EMP001", BenefitType: employee.BenefitApprovedBonus, Period: "2026", Amount: &bonus},
		"EMP001:" + string(employee.BenefitLeaveEncashment) + ":2025-26": {EmployeeID: "EMP001", BenefitType: employee.BenefitLeaveEncashment, Period: "2025-26", Amount: &encashment},
	}}

	_ = svc.HandleWebhook(context.Background(), inbound(phone, "b1", "interactive", payloadRequestBonus))
	_ = svc.HandleWebhook(context.Background(), inbound(phone, "b2", "interactive", payloadRequestEncashment))

	if !rec.containsText("Your approved bonus for 2026 is ₹24,690.12") {
		t.Fatalf("bonus response missing or incorrect: %v", rec.allTexts())
	}
	if !rec.containsText("Your leave encashment for 2025-26 is ₹50,720.55") {
		t.Fatalf("encashment response missing or incorrect: %v", rec.allTexts())
	}
}

func TestBenefitFlowExplainsMissingDataWithoutError(t *testing.T) {
	svc, rec, _, phone := newFlowTestService(t)
	svc.benefitRepo = &flowBenefitRepo{benefits: map[string]*employee.EmployeeBenefit{}}

	_ = svc.HandleWebhook(context.Background(), inbound(phone, "b1", "interactive", payloadRequestBonus))

	if !rec.containsText("No approved bonus data was found for you for 2026") {
		t.Fatalf("missing-data response not sent: %v", rec.allTexts())
	}
}
