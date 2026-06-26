package payroll

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type Dispatcher struct {
	repo     Repository
	empRepo  employee.Repository
	dtClient *doubletick.Client
}

func NewDispatcher(repo Repository, empRepo employee.Repository, dtClient *doubletick.Client) *Dispatcher {
	return &Dispatcher{
		repo:     repo,
		empRepo:  empRepo,
		dtClient: dtClient,
	}
}

type ValidationError struct {
	EmployeeID   string `json:"employeeId"`
	EmployeeName string `json:"employeeName"`
	Reason       string `json:"reason"`
}

// ValidatePayroll checks all records for a period against strict rules.
func (d *Dispatcher) ValidatePayroll(ctx context.Context, month, year int) ([]ValidationError, error) {
	records, err := d.repo.ListByPeriod(ctx, month, year)
	if err != nil {
		return nil, fmt.Errorf("list payroll records: %w", err)
	}

	employees, err := d.empRepo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list employees: %w", err)
	}

	empMap := make(map[string]*employee.Employee)
	for i := range employees {
		empMap[employees[i].EmployeeID] = &employees[i]
	}

	var validationErrs []ValidationError
	for _, rec := range records {
		emp, exists := empMap[rec.EmployeeID]
		if !exists {
			validationErrs = append(validationErrs, ValidationError{
				EmployeeID:   rec.EmployeeID,
				EmployeeName: rec.EmpNameSnapshot,
				Reason:       "Employee not found in master database",
			})
			continue
		}

		if emp.MobileNumber == "" {
			validationErrs = append(validationErrs, ValidationError{
				EmployeeID:   rec.EmployeeID,
				EmployeeName: rec.EmpNameSnapshot,
				Reason:       "Missing mobile number",
			})
		}

		if rec.ActualFinalAmount <= 0 {
			validationErrs = append(validationErrs, ValidationError{
				EmployeeID:   rec.EmployeeID,
				EmployeeName: rec.EmpNameSnapshot,
				Reason:       fmt.Sprintf("Net salary is %.2f (must be > 0)", rec.ActualFinalAmount),
			})
		}
	}

	return validationErrs, nil
}

// DispatchPayslips generates and sends the payslip PDF to every employee with a record for the period.
func (d *Dispatcher) DispatchPayslips(ctx context.Context, month, year int) error {
	records, err := d.repo.ListByPeriod(ctx, month, year)
	if err != nil {
		return fmt.Errorf("list payroll records: %w", err)
	}

	slog.Info("dispatching payslips", "month", month, "year", year, "count", len(records))

	go func() {
		bgCtx := context.Background()
		monthStr := time.Month(month).String()
		caption := fmt.Sprintf("Your payslip for %s %d", monthStr, year)

		sent := 0
		for i := range records {
			rec := records[i]

			emp, err := d.empRepo.GetByID(bgCtx, rec.EmployeeID)
			if err != nil {
				slog.Error("dispatch: employee lookup failed", "emp", rec.EmployeeID, "err", err)
				continue
			}
			if emp.MobileNumber == "" {
				slog.Warn("dispatch: employee has no mobile number", "emp", rec.EmployeeID)
				continue
			}

			pdfBytes, err := GeneratePayslipPDF(emp, &rec)
			if err != nil {
				slog.Error("dispatch: pdf gen failed", "emp", rec.EmployeeID, "err", err)
				continue
			}

			filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", rec.EmployeeID, month, year)
			mediaURL, err := d.dtClient.UploadMedia(bgCtx, pdfBytes, filename, "application/pdf")
			if err != nil {
				slog.Error("dispatch: media upload failed", "emp", rec.EmployeeID, "err", err)
				continue
			}

			if _, err := d.dtClient.SendDocument(bgCtx, emp.MobileNumber, mediaURL, filename, caption); err != nil {
				slog.Error("dispatch: doubletick send failed", "emp", rec.EmployeeID, "err", err)
				continue
			}

			sent++
			slog.Info("dispatch: payslip sent", "emp", rec.EmployeeID)
		}
		slog.Info("dispatch: completed", "sent", sent, "total", len(records))
	}()

	return nil
}

// SendSinglePayslip generates and sends the payslip for a single employee for a given period.
func (d *Dispatcher) SendSinglePayslip(ctx context.Context, employeeID string, month, year int) error {
	emp, err := d.empRepo.GetByID(ctx, employeeID)
	if err != nil {
		return fmt.Errorf("employee not found: %w", err)
	}
	if emp.MobileNumber == "" {
		return fmt.Errorf("employee %s has no mobile number registered", employeeID)
	}

	rec, err := d.repo.GetPayslip(ctx, employeeID, month, year)
	if err != nil {
		return fmt.Errorf("no payroll record found for %s in %02d/%d: %w", employeeID, month, year, err)
	}

	pdfBytes, err := GeneratePayslipPDF(emp, rec)
	if err != nil {
		return fmt.Errorf("pdf generation failed: %w", err)
	}

	monthStr := time.Month(month).String()
	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", employeeID, month, year)
	caption := fmt.Sprintf("Your payslip for %s %d", monthStr, year)

	go func() {
		bgCtx := context.Background()
		mediaURL, err := d.dtClient.UploadMedia(bgCtx, pdfBytes, filename, "application/pdf")
		if err != nil {
			slog.Error("send single: media upload failed", "emp", employeeID, "err", err)
			return
		}
		if _, err := d.dtClient.SendDocument(bgCtx, emp.MobileNumber, mediaURL, filename, caption); err != nil {
			slog.Error("send single: doubletick send failed", "emp", employeeID, "err", err)
			return
		}
		slog.Info("send single: payslip sent", "emp", employeeID)
	}()

	return nil
}

// GeneratePreviewPDF generates the payslip PDF for a single employee and returns it as raw bytes for previewing in the browser.
func (d *Dispatcher) GeneratePreviewPDF(ctx context.Context, employeeID string, month, year int) ([]byte, error) {
	record, err := d.repo.GetPayslip(ctx, employeeID, month, year)
	if err != nil {
		return nil, fmt.Errorf("record not found: %w", err)
	}
	emp, err := d.empRepo.GetByID(ctx, employeeID)
	if err != nil {
		return nil, fmt.Errorf("employee not found: %w", err)
	}

	return GeneratePayslipPDF(emp, record)
}
