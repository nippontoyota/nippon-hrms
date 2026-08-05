package vehiclereferral

import (
	"errors"
	"strings"

	"github.com/nippon-toyota/hrms/pkg/phone"
)

var ErrInvalidInput = errors.New("invalid referral details")

type Input struct {
	CustomerName  string
	EmployeeID    string
	ReferredName  string
	ReferredPhone string
	Model         string
	Website       string
}

func ValidIndianMobile(raw string) bool {
	d := phone.NormalizeIndian(raw)
	if len(d) != 10 {
		return false
	}
	return d[0] >= '6' && d[0] <= '9'
}

func NormalizeInput(in Input) (Referral, error) {
	ref := Referral{
		CustomerName: trimField(in.CustomerName, 100),
		EmployeeID:   trimField(in.EmployeeID, 50),
		ReferredName: trimField(in.ReferredName, 100),
		Model:        strings.ToLower(strings.TrimSpace(in.Model)),
	}

	if len(ref.CustomerName) < 2 || len(ref.ReferredName) < 2 {
		return Referral{}, ErrInvalidInput
	}
	if len(ref.EmployeeID) < 1 {
		return Referral{}, ErrInvalidInput
	}
	if ref.Model != "glanza" && ref.Model != "hyryder" {
		return Referral{}, ErrInvalidInput
	}
	if !ValidIndianMobile(in.ReferredPhone) {
		return Referral{}, ErrInvalidInput
	}

	ref.ReferredPhone = phone.FormatWhatsAppE164(in.ReferredPhone)
	return ref, nil
}

func trimField(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) > max {
		s = s[:max]
	}
	return s
}
