package dispatch

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/payroll"
	"github.com/nippon-toyota/hrms/internal/whatsapp"
)

type Service struct {
	repo          Repository
	payrollRepo   payroll.Repository
	empRepo       employee.Repository
	epfRepo       epf.Repository
	dispatcher    *payroll.Dispatcher
	windowStore   whatsapp.SessionWindowStore
	cfg           RunnerConfig
	registry      *RunnerRegistry
}

func NewService(
	repo Repository,
	payrollRepo payroll.Repository,
	empRepo employee.Repository,
	epfRepo epf.Repository,
	dispatcher *payroll.Dispatcher,
	windowStore whatsapp.SessionWindowStore,
	cfg RunnerConfig,
) *Service {
	if cfg.Workers <= 0 {
		cfg.Workers = 15
	}
	return &Service{
		repo:        repo,
		payrollRepo: payrollRepo,
		empRepo:     empRepo,
		epfRepo:     epfRepo,
		dispatcher:  dispatcher,
		windowStore: windowStore,
		cfg:         cfg,
		registry:    NewRunnerRegistry(),
	}
}

func (s *Service) StartDispatch(ctx context.Context, month, year int) (*Job, error) {
	if err := s.dispatcher.EnsureWhatsAppConfigured(); err != nil {
		return nil, err
	}

	running, err := s.repo.HasRunningJobForPeriod(ctx, month, year)
	if err != nil {
		return nil, err
	}
	if running {
		return nil, fmt.Errorf("a dispatch job is already running for %02d/%d", month, year)
	}

	records, err := s.payrollRepo.ListByPeriod(ctx, month, year)
	if err != nil {
		return nil, fmt.Errorf("list payroll records: %w", err)
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("no payroll records for %02d/%d", month, year)
	}

	items := make([]Item, len(records))
	for i, rec := range records {
		items[i] = Item{
			EmployeeID:   rec.EmployeeID,
			EmployeeName: rec.EmpNameSnapshot,
			Status:       ItemPending,
		}
	}

	job, err := s.repo.CreateJob(ctx, month, year, items)
	if err != nil {
		return nil, err
	}

	s.runJobAsync(job.ID, month, year, records)
	return job, nil
}

func (s *Service) GetJob(ctx context.Context, jobID string) (*Job, error) {
	return s.repo.GetJob(ctx, jobID)
}

func (s *Service) GetLatestJobForPeriod(ctx context.Context, month, year int) (*Job, error) {
	return s.repo.GetLatestJobForPeriod(ctx, month, year)
}

func (s *Service) ListItems(ctx context.Context, jobID string, status ItemStatus, page, limit int) ([]Item, int, error) {
	return s.repo.ListItems(ctx, jobID, status, page, limit)
}

func (s *Service) RetryFailed(ctx context.Context, jobID string) error {
	n, err := s.repo.ResetFailedItems(ctx, jobID)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("no failed items to retry")
	}

	job, err := s.repo.GetJob(ctx, jobID)
	if err != nil {
		return err
	}

	records, err := s.payrollRepo.ListByPeriod(ctx, job.Month, job.Year)
	if err != nil {
		return err
	}

	s.runJobAsync(jobID, job.Month, job.Year, records)
	return nil
}

func (s *Service) runJobAsync(jobID string, month, year int, records []payroll.Record) {
	if !s.registry.TryStart(jobID) {
		return
	}

	go func() {
		defer s.registry.Done(jobID)
		ctx := context.Background()

		if err := s.repo.SetJobRunning(ctx, jobID); err != nil {
			slog.Error("dispatch: set job running failed", "job", jobID, "err", err)
			return
		}

		recMap := make(map[string]payroll.Record, len(records))
		for _, rec := range records {
			recMap[rec.EmployeeID] = rec
		}

		employees, err := s.empRepo.List(ctx)
		if err != nil {
			slog.Error("dispatch: list employees failed", "job", jobID, "err", err)
			return
		}
		empMap := make(map[string]*employee.Employee, len(employees))
		for i := range employees {
			empMap[employees[i].EmployeeID] = &employees[i]
		}

		epfMap := map[string]*epf.Record{}
		if s.epfRepo != nil {
			epfRecords, err := s.epfRepo.List(ctx)
			if err != nil {
				slog.Error("dispatch: list epf failed", "job", jobID, "err", err)
				return
			}
			for i := range epfRecords {
				epfMap[epfRecords[i].EmployeeID] = &epfRecords[i]
			}
		}

		if s.windowStore != nil {
			phones := make([]string, 0, len(empMap))
			for _, emp := range empMap {
				if emp.MobileNumber != "" {
					phones = append(phones, emp.MobileNumber)
				}
			}
			s.dispatcher.SetSessionCache(s.windowStore.LoadOpenSessions(ctx, phones))
			defer s.dispatcher.ClearSessionCache()
		}

		var wg sync.WaitGroup
		for i := 0; i < s.cfg.Workers; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.worker(ctx, jobID, month, year, recMap, empMap, epfMap)
			}()
		}
		wg.Wait()

		if err := s.repo.FinalizeJob(ctx, jobID); err != nil {
			slog.Error("dispatch: finalize job failed", "job", jobID, "err", err)
			return
		}

		job, err := s.repo.GetJob(ctx, jobID)
		if err != nil {
			slog.Error("dispatch: get job after finalize failed", "job", jobID, "err", err)
			return
		}
		if job.Failed == 0 && job.Sent > 0 {
			if err := s.payrollRepo.MarkAsDispatched(ctx, month, year); err != nil {
				slog.Error("dispatch: mark payroll dispatched failed", "job", jobID, "err", err)
			}
		} else if job.Failed > 0 {
			if err := s.payrollRepo.ClearDispatched(ctx, month, year); err != nil {
				slog.Error("dispatch: clear payroll dispatched flag failed", "job", jobID, "err", err)
			}
		}
		slog.Info("dispatch: job completed", "job", jobID, "sent", job.Sent, "failed", job.Failed, "skipped", job.Skipped, "total", job.Total)
	}()
}

func (s *Service) worker(
	ctx context.Context,
	jobID string,
	month, year int,
	recMap map[string]payroll.Record,
	empMap map[string]*employee.Employee,
	epfMap map[string]*epf.Record,
) {
	for {
		if s.cfg.ItemDelay > 0 {
			time.Sleep(s.cfg.ItemDelay)
		}

		item, err := s.repo.ClaimNextPendingItem(ctx, jobID)
		if err != nil {
			slog.Error("dispatch: claim item failed", "job", jobID, "err", err)
			return
		}
		if item == nil {
			return
		}

		rec, ok := recMap[item.EmployeeID]
		if !ok {
			_ = s.repo.MarkItemFailed(ctx, jobID, item.ID, "payroll record not found")
			continue
		}

		emp, ok := empMap[item.EmployeeID]
		if !ok {
			_ = s.repo.MarkItemSkipped(ctx, jobID, item.ID, "employee not found in master database")
			continue
		}
		if emp.MobileNumber == "" {
			_ = s.repo.MarkItemSkipped(ctx, jobID, item.ID, "missing mobile number")
			continue
		}

		epfRec := epfMap[item.EmployeeID]
		if err := s.dispatcher.DeliverPayslip(ctx, emp, &rec, epfRec, month, year); err != nil {
			_ = s.repo.MarkItemFailed(ctx, jobID, item.ID, err.Error())
			slog.Error("dispatch: payslip send failed", "job", jobID, "emp", item.EmployeeID, "err", err)
			continue
		}

		if err := s.repo.MarkItemSent(ctx, jobID, item.ID); err != nil {
			slog.Error("dispatch: mark sent failed", "job", jobID, "emp", item.EmployeeID, "err", err)
			continue
		}
		slog.Info("dispatch: payslip sent", "job", jobID, "emp", item.EmployeeID)
	}
}
