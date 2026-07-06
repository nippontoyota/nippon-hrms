package employee

import (
	"context"
	"time"
)

type Employee struct {
	ID                        string    `json:"id"`
	EmployeeID                string    `json:"employeeId"`
	Name                      string    `json:"name"`
	Department                string    `json:"department"`
	MobileNumber              string    `json:"mobileNo"`
	Level                     string    `json:"level"`
	DOJ                       string    `json:"doj"`
	Birthday                  string    `json:"birthday"`
	YearsExperience           float64   `json:"yearsExperience"`
	Branch                    string    `json:"branch"`
	Designation               string    `json:"designation"`
	Zone                      string    `json:"zone"`
	Basic                     float64   `json:"basic"`
	DA                        float64   `json:"da"`
	RevisedBasicDA            float64   `json:"revisedBasicDa"`
	HRA                       float64   `json:"hra"`
	Travel                    float64   `json:"travel"`
	Hostel                    float64   `json:"hostel"`
	Children                  float64   `json:"children"`
	TotalSalary               float64   `json:"totalSalary"`
	Mobile                    float64   `json:"mobile"`
	Conveyance                float64   `json:"conveyance"`
	WashAllowance             float64   `json:"washAllowance"`
	BranchAllowance           float64   `json:"branchAllowance"`
	SpecialAllowance          float64   `json:"specialAllowance"`
	Training                  float64   `json:"training"`
	TotalAllowances           float64   `json:"totalAllowances"`
	TotalSalaryWithAllowances float64   `json:"totalSalaryWithAllowances"`
	BankName                  string    `json:"bankName"`
	AccountNumber             string    `json:"accountNumber"`
	BankBranch                string    `json:"bankBranch"`
	IFSCCode                  string    `json:"ifscCode"`
	Status                    string    `json:"status"`
	ManagerID                 *string   `json:"managerId,omitempty"`
	ManagerName               *string   `json:"managerName,omitempty"`
	CreatedAt                 time.Time `json:"createdAt"`
	UpdatedAt                 time.Time `json:"updatedAt"`
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	List(ctx context.Context) ([]Employee, error)
	ListPaginated(ctx context.Context, page, limit int, search string) (*ListResult, error)
	GetByID(ctx context.Context, id string) (*Employee, error)
	Create(ctx context.Context, emp *Employee) error
	Update(ctx context.Context, id string, emp *Employee) error
	FindByPhone(ctx context.Context, phone string) (*Employee, error)
	VerifyIdentity(ctx context.Context, id, dob string) (*Employee, error)
	UpdatePhone(ctx context.Context, id, newPhone string) error
	BulkInsert(ctx context.Context, employees []Employee) error
	Delete(ctx context.Context, id string) error
	DeleteMany(ctx context.Context, ids []string) error
	DeleteAll(ctx context.Context) error
}
