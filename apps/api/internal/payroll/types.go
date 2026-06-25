package payroll

import (
	"context"
	"time"
)

type Record struct {
	ID                           string
	EmployeeID                   string
	Month                        int
	Year                         int
	EmpNameSnapshot              string
	Leaves                       float64
	LOP                          float64
	Days                         float64
	Absents                      float64
	Basic                        float64
	DA                           float64
	BasicDA                      float64
	HRA                          float64
	Travel                       float64
	ChildrenHostel               float64
	ChildrenEducation            float64
	Mobile                       float64
	Conveyance                   float64
	BranchAllowance              float64
	WashAllowance                float64
	SpecialAllowance             float64
	Training                     float64
	Incentive                    float64
	TotalEarWithIncen            float64
	GrossSalWithoutIncentives    float64
	GrossForPT                   float64
	PF                           float64
	PF367                        float64
	PF833                        float64
	ESI075                       float64
	ESI325                       float64
	TDS                          float64
	SalAdv                       float64
	AdditionalDeduction          float64
	Loan                         float64
	Advance                      float64
	LOPDeduction                 float64
	CompanyStatutoryContribution float64
	ReimbMedical                 float64
	ReimbLTA                     float64
	ZetaMealVoucher              float64
	ReimbTravel                  float64
	TotalReimbursement           float64
	EPFER                        float64
	NetIncentive                 float64
	TotalDeductions              float64
	ActualFinalAmount            float64
	CreatedAt                    time.Time
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	GetPayslip(ctx context.Context, employeeID string, month, year int) (*Record, error)

	BulkInsert(ctx context.Context, records []Record) error
}
