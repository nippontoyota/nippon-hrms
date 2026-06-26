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

// DispatchPayslips generates and sends the payslip PDF to every employee with a record for the period.
// The PDF is uploaded to DoubleTick's media endpoint and delivered as a WhatsApp document (not persisted).
func (d *Dispatcher) DispatchPayslips(ctx context.Context, month, year int) error {
	records, err := d.repo.ListByPeriod(ctx, month, year)
	if err != nil {
		return fmt.Errorf("list payroll records: %w", err)
	}

	slog.Info("dispatching payslips", "month", month, "year", year, "count", len(records))

	go func() {
		bgCtx := context.Background() // Background context since the HTTP request will have completed.
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
