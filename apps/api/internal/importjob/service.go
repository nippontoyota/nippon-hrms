package importjob

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/nippon-toyota/hrms/pkg/logger"
)

const stagingBatchSize = 5000

type Service struct {
	repo *Repository
	cfg  Config
}

func NewService(repo *Repository, cfg Config) *Service {
	if cfg.MaxFileMB <= 0 {
		cfg.MaxFileMB = 200
	}
	if cfg.MaxRows <= 0 {
		cfg.MaxRows = 500_000
	}
	if cfg.TempDir == "" {
		cfg.TempDir = os.TempDir()
	}
	return &Service{repo: repo, cfg: cfg}
}

func (s *Service) StartImport(ctx context.Context, entity EntityType, mode Mode, month, year *int, fileName string, fileReader io.Reader, createdBy string) (*Job, error) {
	running, err := s.repo.HasRunningJob(ctx, entity)
	if err != nil {
		return nil, err
	}
	if running {
		return nil, fmt.Errorf("an import is already running for %s", entity)
	}

	if entity == EntityPayroll && (month == nil || year == nil) {
		return nil, fmt.Errorf("month and year are required for payroll import")
	}

	format, err := DetectFormat(fileName, fileReader)
	if err != nil {
		return nil, err
	}

	job, err := s.repo.CreateJob(ctx, entity, mode, month, year, filepath.Base(fileName), format, createdBy)
	if err != nil {
		return nil, err
	}

	tmpPath := filepath.Join(s.cfg.TempDir, fmt.Sprintf("import_%s_%s", job.ID, filepath.Base(fileName)))
	f, err := os.Create(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("create temp file: %w", err)
	}
	if _, err := io.Copy(f, fileReader); err != nil {
		f.Close()
		os.Remove(tmpPath)
		return nil, fmt.Errorf("save upload: %w", err)
	}
	f.Close()

	go s.runJob(job.ID, tmpPath)

	return job, nil
}

func (s *Service) runJob(jobID, filePath string) {
	ctx := context.Background()
	defer os.Remove(filePath)

	job, err := s.repo.GetJob(ctx, jobID)
	if err != nil {
		logger.Error("import job not found", "jobId", jobID, "err", err)
		return
	}

	if err := s.repo.UpdateStatus(ctx, jobID, StatusParsing); err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	parsed, err := ParseFile(job.EntityType, job.FileFormat, filePath, derefInt(job.Month), derefInt(job.Year), s.cfg.MaxRows)
	if err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	rejected := len(parsed.Errors)
	if err := s.repo.InsertErrors(ctx, jobID, parsed.Errors); err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	if err := s.repo.UpdateStatus(ctx, jobID, StatusLoading); err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	if err := s.loadStaging(ctx, job, parsed); err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	stats, err := s.repo.Merge(ctx, job)
	if err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	total := parsed.TotalRows
	if err := s.repo.CompleteJob(ctx, jobID, total, stats.Inserted, stats.SkippedIdentical, rejected, stats.Conflicts); err != nil {
		s.repo.FailJob(ctx, jobID, err.Error())
		return
	}

	logger.Info("import completed", "jobId", jobID, "inserted", stats.Inserted, "conflicts", stats.Conflicts)
}

func (s *Service) loadStaging(ctx context.Context, job *Job, parsed *ParseResult) error {
	switch job.EntityType {
	case EntityEmployees:
		for i := 0; i < len(parsed.EmployeeRows); i += stagingBatchSize {
			end := i + stagingBatchSize
			if end > len(parsed.EmployeeRows) {
				end = len(parsed.EmployeeRows)
			}
			if err := s.repo.CopyStagingEmployees(ctx, job.ID, parsed.EmployeeRows[i:end]); err != nil {
				return err
			}
		}
	case EntityEPF:
		for i := 0; i < len(parsed.EPFRows); i += stagingBatchSize {
			end := i + stagingBatchSize
			if end > len(parsed.EPFRows) {
				end = len(parsed.EPFRows)
			}
			if err := s.repo.CopyStagingEPF(ctx, job.ID, parsed.EPFRows[i:end]); err != nil {
				return err
			}
		}
	case EntityPayroll:
		for i := 0; i < len(parsed.PayrollRows); i += stagingBatchSize {
			end := i + stagingBatchSize
			if end > len(parsed.PayrollRows) {
				end = len(parsed.PayrollRows)
			}
			if err := s.repo.CopyStagingPayroll(ctx, job.ID, parsed.PayrollRows[i:end]); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Service) GetJob(ctx context.Context, jobID string) (*Job, error) {
	return s.repo.GetJob(ctx, jobID)
}

func (s *Service) GetLatestPendingConflictsJob(ctx context.Context, entity EntityType) (*Job, error) {
	return s.repo.GetLatestCompletedJob(ctx, entity, ModeAdd)
}

func (s *Service) ListErrors(ctx context.Context, jobID string, page, limit int) (*PaginatedErrors, error) {
	return s.repo.ListErrors(ctx, jobID, page, limit)
}

func (s *Service) ListConflicts(ctx context.Context, jobID string, page, limit int, search string) (*PaginatedConflicts, error) {
	return s.repo.ListConflicts(ctx, jobID, page, limit, search)
}

func (s *Service) ResolveConflicts(ctx context.Context, jobID string, conflictIDs []string, resolution Resolution) (int, error) {
	return s.repo.ResolveConflicts(ctx, jobID, conflictIDs, resolution)
}

func (s *Service) ResolveAllConflicts(ctx context.Context, jobID string, resolution Resolution) (int, error) {
	return s.repo.ResolveAllConflicts(ctx, jobID, resolution)
}

func derefInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}
