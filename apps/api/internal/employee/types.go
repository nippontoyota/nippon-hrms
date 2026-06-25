package employee

import (
	"context"
	"time"
)

type Employee struct {
	ID                        string
	Name                      string
	Department                string
	MobileNumber              string
	Level                     string
	DOJ                       string
	YearsExperience           float64
	Branch                    string
	Designation               string
	Zone                      string
	Basic                     float64
	DA                        float64
	RevisedBasicDA            float64
	HRA                       float64
	Travel                    float64
	Hostel                    float64
	Children                  float64
	TotalSalary               float64
	Mobile                    float64
	Conveyance                float64
	WashAllowance             float64
	BranchAllowance           float64
	SpecialAllowance          float64
	Training                  float64
	TotalAllowances           float64
	TotalSalaryWithAllowances float64
	BankName                  string
	AccountNumber             string
	BankBranch                string
	IFSCCode                  string
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}

type UploadResponse struct {
	TotalProcessed int      `json:"totalProcessed"`
	SuccessCount   int      `json:"successCount"`
	ErrorCount     int      `json:"errorCount"`
	Errors         []string `json:"errors,omitempty"`
}

type Repository interface {
	FindByPhone(ctx context.Context, phone string) (*Employee, error)
	VerifyIdentity(ctx context.Context, id, dob string) (*Employee, error)
	UpdatePhone(ctx context.Context, id, newPhone string) error
	BulkInsert(ctx context.Context, employees []Employee) error
}
