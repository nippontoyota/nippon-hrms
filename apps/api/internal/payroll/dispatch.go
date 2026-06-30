package payroll

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/pkg/phone"
)

type SessionWindowChecker interface {
	IsSessionWindowOpen(ctx context.Context, phone string) bool
}

type Dispatcher struct {
	repo          Repository
	empRepo       employee.Repository
	epfRepo       epf.Repository
	dtClient      *doubletick.Client
	windowStore   SessionWindowChecker
	sessionCache  map[string]bool
	sessionMu     sync.RWMutex
}

func NewDispatcher(
	repo Repository,
	empRepo employee.Repository,
	epfRepo epf.Repository,
	dtClient *doubletick.Client,
	windowStore SessionWindowChecker,
) *Dispatcher {
	return &Dispatcher{
		repo:        repo,
		empRepo:     empRepo,
		epfRepo:     epfRepo,
		dtClient:    dtClient,
		windowStore: windowStore,
	}
}

func (d *Dispatcher) SetSessionCache(cache map[string]bool) {
	d.sessionMu.Lock()
	defer d.sessionMu.Unlock()
	d.sessionCache = cache
}

func (d *Dispatcher) ClearSessionCache() {
	d.sessionMu.Lock()
	defer d.sessionMu.Unlock()
	d.sessionCache = nil
}

func (d *Dispatcher) lookupEpf(ctx context.Context, employeeID string) *epf.Record {
	if d.epfRepo == nil {
		return nil
	}
	rec, err := d.epfRepo.GetByID(ctx, employeeID)
	if err != nil {
		return nil
	}
	return rec
}

func (d *Dispatcher) ensureWhatsApp() error {
	if d.dtClient == nil || !d.dtClient.Configured() {
		return fmt.Errorf("WhatsApp (DoubleTick) is not configured")
	}
	return nil
}

func PayslipCaption(monthStr string, year int, empName string) string {
	return fmt.Sprintf("📄 *Payslip - %s %d*\n\nDear *%s*,\n\nPlease find attached your payslip for the month of *%s %d*.\n\nFor any discrepancies, please reach out to HR.", monthStr, year, empName, monthStr, year)
}

func payslipTemplatePlaceholders(empName, monthStr string, year int) []string {
	yearStr := strconv.Itoa(year)
	// notification_of_payslip uses {{1}} name, {{2}}/{{3}} in title, {{2}}/{{3}} again in body (5 slots).
	return []string{empName, monthStr, yearStr, monthStr, yearStr}
}

func (d *Dispatcher) isSessionOpen(ctx context.Context, to string) bool {
	d.sessionMu.RLock()
	cache := d.sessionCache
	d.sessionMu.RUnlock()

	if cache != nil {
		if open, ok := cache[to]; ok {
			return open
		}
		return false
	}
	return d.windowStore != nil && d.windowStore.IsSessionWindowOpen(ctx, to)
}

func (d *Dispatcher) deliverPayslipMessage(
	ctx context.Context,
	to, filename, caption string,
	pdfBytes []byte,
	monthStr string, year int, empName string,
) error {
	if err := d.ensureWhatsApp(); err != nil {
		return err
	}

	mediaURL, _, err := d.dtClient.UploadMedia(ctx, pdfBytes, filename, "application/pdf")
	if err != nil {
		return fmt.Errorf("media upload failed: %w", err)
	}

	placeholders := payslipTemplatePlaceholders(empName, monthStr, year)

	if d.isSessionOpen(ctx, to) {
		if _, err := d.dtClient.SendDocument(ctx, to, mediaURL, filename, caption); err != nil {
			if doubletick.IsSessionExpiredError(err) {
				slog.Info("payslip send: session expired during SendDocument, falling back to template", "to", to)
			} else {
				return fmt.Errorf("whatsapp send failed: %w", err)
			}
		} else {
			return nil
		}
	}

	if _, err := d.dtClient.SendTemplateWithDocument(
		ctx, to,
		doubletick.TemplatePayslipNotification,
		doubletick.TemplateLanguageEN,
		placeholders,
		mediaURL, filename,
	); err != nil {
		return fmt.Errorf("whatsapp template send failed: %w", err)
	}
	return nil
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

		if !strings.EqualFold(strings.TrimSpace(rec.EmpNameSnapshot), strings.TrimSpace(emp.Name)) {
			validationErrs = append(validationErrs, ValidationError{
				EmployeeID:   rec.EmployeeID,
				EmployeeName: rec.EmpNameSnapshot,
				Reason:       fmt.Sprintf("Name mismatch: Payroll says '%s', but Directory says '%s'", strings.TrimSpace(rec.EmpNameSnapshot), strings.TrimSpace(emp.Name)),
			})
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

// DispatchPayslips is deprecated; bulk dispatch is handled by internal/dispatch.Service.
func (d *Dispatcher) DispatchPayslips(ctx context.Context, month, year int) error {
	return fmt.Errorf("use dispatch job service")
}

// DeliverPayslip generates and sends a payslip for a payroll record.
func (d *Dispatcher) DeliverPayslip(ctx context.Context, emp *employee.Employee, rec *Record, epfRec *epf.Record, month, year int) error {
	if emp.MobileNumber == "" {
		return fmt.Errorf("no mobile number")
	}
	to := phone.FormatWhatsAppE164(emp.MobileNumber)
	if to == "" {
		return fmt.Errorf("invalid mobile number")
	}

	pdfBytes, err := GeneratePayslipPDF(emp, rec, epfRec)
	if err != nil {
		return fmt.Errorf("pdf generation failed: %w", err)
	}

	monthStr := time.Month(month).String()
	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", rec.EmployeeID, month, year)
	caption := PayslipCaption(monthStr, year, rec.EmpNameSnapshot)

	return d.deliverPayslipMessageWithRetry(ctx, to, filename, caption, pdfBytes, monthStr, year, rec.EmpNameSnapshot)
}

func (d *Dispatcher) deliverPayslipMessageWithRetry(
	ctx context.Context,
	to, filename, caption string,
	pdfBytes []byte,
	monthStr string, year int, empName string,
) error {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 500 * time.Millisecond)
		}
		lastErr = d.deliverPayslipMessage(ctx, to, filename, caption, pdfBytes, monthStr, year, empName)
		if lastErr == nil {
			return nil
		}
		if !doubletick.IsTransient(lastErr) {
			return lastErr
		}
	}
	return lastErr
}

// EnsureWhatsAppConfigured returns an error if DoubleTick is not configured.
func (d *Dispatcher) EnsureWhatsAppConfigured() error {
	return d.ensureWhatsApp()
}

func (d *Dispatcher) SendSinglePayslip(ctx context.Context, employeeID string, month, year int) error {
	if err := d.ensureWhatsApp(); err != nil {
		return err
	}

	emp, err := d.empRepo.GetByID(ctx, employeeID)
	if err != nil {
		return fmt.Errorf("employee not found: %w", err)
	}
	if emp.MobileNumber == "" {
		return fmt.Errorf("employee %s has no mobile number registered", employeeID)
	}
	to := phone.FormatWhatsAppE164(emp.MobileNumber)
	if to == "" {
		return fmt.Errorf("employee %s has an invalid mobile number", employeeID)
	}

	rec, err := d.repo.GetPayslip(ctx, employeeID, month, year)
	if err != nil {
		return fmt.Errorf("no payroll record found for %s in %02d/%d: %w", employeeID, month, year, err)
	}

	pdfBytes, err := GeneratePayslipPDF(emp, rec, d.lookupEpf(ctx, employeeID))
	if err != nil {
		return fmt.Errorf("pdf generation failed: %w", err)
	}

	monthStr := time.Month(month).String()
	filename := fmt.Sprintf("payslip_%s_%02d_%d.pdf", employeeID, month, year)
	caption := PayslipCaption(monthStr, year, rec.EmpNameSnapshot)

	if err := d.deliverPayslipMessage(ctx, to, filename, caption, pdfBytes, monthStr, year, rec.EmpNameSnapshot); err != nil {
		return err
	}

	slog.Info("send single: payslip sent", "emp", employeeID)
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

	return GeneratePayslipPDF(emp, record, d.lookupEpf(ctx, employeeID))
}
