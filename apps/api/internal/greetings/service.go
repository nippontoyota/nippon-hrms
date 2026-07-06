package greetings

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
)

type Service struct {
	empRepo employee.Repository
	dt      *doubletick.Client
	db      *pgxpool.Pool
}

func NewService(empRepo employee.Repository, dt *doubletick.Client, db *pgxpool.Pool) *Service {
	return &Service{
		empRepo: empRepo,
		dt:      dt,
		db:      db,
	}
}

func (s *Service) ProcessDailyGreetings(ctx context.Context) error {
	if !s.dt.Configured() {
		slog.Warn("greetings: doubletick client not configured, skipping daily greetings")
		return nil
	}

	employees, err := s.empRepo.List(ctx)
	if err != nil {
		slog.Error("greetings: failed to list employees", "err", err)
		return err
	}

	now := time.Now()
	_, currentMonth, currentDay := now.Date()

	var bdayCount, annivCount int

	for _, emp := range employees {
		if emp.Status != "Active" {
			continue
		}
		if emp.MobileNumber == "" {
			continue
		}

		if isToday(emp.Birthday, currentMonth, currentDay, false) {
			if s.shouldSend(ctx, emp.ID, "BIRTHDAY", now.Year()) {
				s.sendGreeting(ctx, emp.MobileNumber, emp.Name, doubletick.TemplateEmployeeBirthday)
				s.markSent(ctx, emp.ID, "BIRTHDAY", now.Year())
				bdayCount++
			}
		}

		if isToday(emp.DOJ, currentMonth, currentDay, true) {
			if s.shouldSend(ctx, emp.ID, "WORK_ANNIVERSARY", now.Year()) {
				s.sendGreeting(ctx, emp.MobileNumber, emp.Name, doubletick.TemplateEmployeeWorkAnniversary)
				s.markSent(ctx, emp.ID, "WORK_ANNIVERSARY", now.Year())
				annivCount++
			}
		}
	}

	slog.Info("greetings: finished processing daily greetings", "birthdays", bdayCount, "anniversaries", annivCount)
	return nil
}

func (s *Service) shouldSend(ctx context.Context, empID, greetingType string, year int) bool {
	var count int
	err := s.db.QueryRow(ctx, "SELECT COUNT(*) FROM greetings_log WHERE employee_id = $1 AND greeting_type = $2 AND year = $3", empID, greetingType, year).Scan(&count)
	if err != nil {
		slog.Error("greetings: failed to check log", "emp", empID, "type", greetingType, "err", err)
		return false // fail safe: don't send if we can't check
	}
	return count == 0
}

func (s *Service) markSent(ctx context.Context, empID, greetingType string, year int) {
	_, err := s.db.Exec(ctx, "INSERT INTO greetings_log (employee_id, greeting_type, year) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", empID, greetingType, year)
	if err != nil {
		slog.Error("greetings: failed to mark sent", "emp", empID, "type", greetingType, "err", err)
	}
}

func (s *Service) sendGreeting(ctx context.Context, mobile, name, template string) {
	parts := strings.Split(name, " ")
	firstName := parts[0]
	if len(firstName) == 0 {
		firstName = "Team Member"
	}

	_, err := s.dt.SendTemplate(
		ctx,
		mobile,
		template,
		doubletick.TemplateLanguageEN,
		[]string{firstName},
	)
	if err != nil {
		slog.Error("greetings: failed to send greeting", "mobile", mobile, "template", template, "err", err)
	} else {
		slog.Info("greetings: sent greeting successfully", "mobile", mobile, "template", template, "name", firstName)
	}
}

func isToday(dateStr string, currentMonth time.Month, currentDay int, isAnniversary bool) bool {
	if dateStr == "" || dateStr == "0000-00-00" {
		return false
	}
	// dateStr is like "2006-01-02 15:04:05" or "2006-01-02"
	parsed, err := time.Parse(time.RFC3339, dateStr)
	if err != nil {
		parsed, err = time.Parse("2006-01-02 15:04:05-07", dateStr) // standard pg format
		if err != nil {
			parsed, err = time.Parse("2006-01-02 15:04:05", dateStr)
			if err != nil {
				parsed, err = time.Parse("2006-01-02", dateStr)
				if err != nil {
					return false
				}
			}
		}
	}

	if isAnniversary {
		years := time.Now().Year() - parsed.Year()
		if years <= 0 {
			return false
		}
	}

	return parsed.Month() == currentMonth && parsed.Day() == currentDay
}
