package payroll

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

type Dispatcher struct {
	repo     Repository
	dtClient *doubletick.Client
}

func NewDispatcher(repo Repository, dtClient *doubletick.Client) *Dispatcher {
	return &Dispatcher{
		repo:     repo,
		dtClient: dtClient,
	}
}

// DispatchPayslips triggers an asynchronous job to send payslips to all employees for a given month/year.
func (d *Dispatcher) DispatchPayslips(ctx context.Context, month, year int) error {
	// In a real app, we'd fetch all records for this month.
	// Since we are stubbed, we'll simulate fetching records.
	slog.Info("dispatching payslips", "month", month, "year", year)

	go func() {
		bgCtx := context.Background() // Background context since HTTP request will complete
		records := []Record{
			{EmployeeID: "EMP001", Basic: 50000, TotalDeductions: 2000, ActualFinalAmount: 58000, Month: month, Year: year},
			// ... simulate more records
		}

		for _, record := range records {
			// 1. Generate PDF
			pdfBytes, err := GeneratePDF(&record)
			if err != nil {
				slog.Error("dispatch: pdf gen failed", "emp", record.EmployeeID, "err", err)
				continue
			}

			// 2. Upload to Storage
			filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", record.EmployeeID, month, year)
			pdfURL, err := UploadToStorage(pdfBytes, filename)
			if err != nil {
				slog.Error("dispatch: storage upload failed", "emp", record.EmployeeID, "err", err)
				continue
			}

			// 3. Send via DoubleTick (Simulated phone number lookup)
			// In reality, we'd need employee.Repository here to get the phone number.
			// For Phase 1 stubs, we assume we know the target or log it.
			phone := "+919999999999" // Stub

			monthStr := time.Month(month).String()
			msg := fmt.Sprintf("✅ Your payslip for *%s %d* is ready.\n\n📄 Secure Link: %s", monthStr, year, pdfURL)

			_, err = d.dtClient.SendText(bgCtx, phone, msg)
			if err != nil {
				slog.Error("dispatch: doubletick send failed", "emp", record.EmployeeID, "err", err)
				continue
			}

			slog.Info("dispatch: payslip sent", "emp", record.EmployeeID)
		}
		slog.Info("dispatch: completed")
	}()

	return nil
}
