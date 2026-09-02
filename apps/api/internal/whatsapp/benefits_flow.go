package whatsapp

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func (s *Service) handleEmployeeBenefitRequest(ctx context.Context, sess *Session, from string, benefitType employee.BenefitType, period string) error {
	s.ensureEmployee(ctx, sess, from)
	if sess.EmployeeID == "" {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.sendUserText(ctx, sess, from, msgNotEmployee)
	}
	if s.benefitRepo == nil {
		slog.Error("employee benefit repository is not configured")
		return s.sendUserText(ctx, sess, from, "We could not retrieve that information right now. Please contact HR.")
	}
	benefit, err := s.benefitRepo.GetBenefit(ctx, sess.EmployeeID, benefitType, period)
	if err != nil {
		slog.Error("employee benefit lookup failed", "employee_id", sess.EmployeeID, "benefit_type", benefitType, "period", period, "err", err)
		return s.sendUserText(ctx, sess, from, "We could not retrieve that information right now. Please contact HR.")
	}
	if benefit == nil || benefit.Amount == nil {
		return s.sendUserText(ctx, sess, from, fmt.Sprintf("No %s data was found for you for %s. Please contact HR if you think this is incorrect.", benefitLabel(benefitType), period))
	}

	sess.resetFlow()
	s.sessions.Set(from, sess)
	return s.sendUserText(ctx, sess, from, fmt.Sprintf("Your %s for %s is %s.\n\nReply *Hi* when you need something else.", benefitLabel(benefitType), period, employee.FormatBenefitAmount(benefit.Amount)))
}

func benefitLabel(benefitType employee.BenefitType) string {
	if benefitType == employee.BenefitLeaveEncashment {
		return "leave encashment"
	}
	return "approved bonus"
}
