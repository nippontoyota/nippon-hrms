package payroll

import (
	"context"
	"time"
)

type Record struct {
	ID                           string    `json:"id"`
	EmployeeID                   string    `json:"employeeId"`
	Month                        int       `json:"month"`
	Year                         int       `json:"year"`
	EmpNameSnapshot              string    `json:"empNameSnapshot"`
	Leaves                       float64   `json:"leaves"`
	LOP                          float64   `json:"lop"`
	Days                         float64   `json:"days"`
	Absents                      float64   `json:"absents"`
	Basic                        float64   `json:"basic"`
	DA                           float64   `json:"da"`
	BasicDA                      float64   `json:"basicDa"`
	HRA                          float64   `json:"hra"`
	Travel                       float64   `json:"travel"`
	ChildrenHostel               float64   `json:"childrenHostel"`
	ChildrenEducation            float64   `json:"childrenEducation"`
	Mobile                       float64   `json:"mobile"`
	Conveyance                   float64   `json:"conveyance"`
	BranchAllowance              float64   `json:"branchAllowance"`
	WashAllowance                float64   `json:"washAllowance"`
	SpecialAllowance             float64   `json:"specialAllowance"`
	Training                     float64   `json:"training"`
	Incentive                    float64   `json:"incentive"`
	TotalEarWithIncen            float64   `json:"totalEarWithIncen"`
	GrossSalWithoutIncentives    float64   `json:"grossSalWithoutIncentives"`
	GrossForPT                   float64   `json:"grossForPT"`
	PF                           float64   `json:"pf"`
	PF367                        float64   `json:"pf367"`
	PF833                        float64   `json:"pf833"`
	ESI075                       float64   `json:"esi075"`
	ESI325                       float64   `json:"esi325"`
	TDS                          float64   `json:"tds"`
	SalAdv                       float64   `json:"salAdv"`
	AdditionalDeduction          float64   `json:"additionalDeduction"`
	Loan                         float64   `json:"loan"`
	Advance                      float64   `json:"advance"`
	LOPDeduction                 float64   `json:"lopDeduction"`
	CompanyStatutoryContribution float64   `json:"companyStatutoryContribution"`
	ReimbMedical                 float64   `json:"reimbMedical"`
	ReimbLTA                     float64   `json:"reimbLTA"`
	ZetaMealVoucher              float64   `json:"zetaMealVoucher"`
	ReimbTravel                  float64   `json:"reimbTravel"`
	TotalReimbursement           float64   `json:"totalReimbursement"`
	EPFER                        float64   `json:"epfER"`
	NetIncentive                 float64   `json:"netIncentive"`
	TotalDeductions              float64   `json:"totalDeductions"`
	ActualFinalAmount            float64   `json:"actualFinalAmount"`
	CreatedAt                    time.Time `json:"createdAt"`
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	GetPayslip(ctx context.Context, employeeID string, month, year int) (*Record, error)

	ListByPeriod(ctx context.Context, month, year int) ([]Record, error)
	BulkInsert(ctx context.Context, records []Record) error
	Delete(ctx context.Context, id string) error
}
