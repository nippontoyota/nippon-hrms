package employee

import (
	"context"
	"fmt"
	"math"
	"strconv"
)

type BenefitType string

const (
	BenefitApprovedBonus   BenefitType = "APPROVED_BONUS"
	BenefitLeaveEncashment BenefitType = "LEAVE_ENCASHMENT"
)

type EmployeeBenefit struct {
	EmployeeID  string
	BenefitType BenefitType
	Period      string
	Amount      *float64
	SourceFile  string
}

type BenefitRepository interface {
	GetBenefit(ctx context.Context, employeeID string, benefitType BenefitType, period string) (*EmployeeBenefit, error)
}

func FormatBenefitAmount(amount *float64) string {
	if amount == nil {
		return ""
	}
	return "₹" + formatIndianAmount(*amount)
}

func formatIndianAmount(amount float64) string {
	negative := amount < 0
	cents := int64(math.Round(math.Abs(amount) * 100))
	whole := strconv.FormatInt(cents/100, 10)
	if len(whole) > 3 {
		last := whole[len(whole)-3:]
		prefix := whole[:len(whole)-3]
		grouped := ""
		for len(prefix) > 2 {
			grouped = "," + prefix[len(prefix)-2:] + grouped
			prefix = prefix[:len(prefix)-2]
		}
		whole = prefix + grouped + "," + last
	}
	result := whole + "." + fmt.Sprintf("%02d", cents%100)
	if negative {
		return "-" + result
	}
	return result
}
