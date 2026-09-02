package employee_test

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/internal/employee"
)

func TestFindByPhone_liveDB(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := db.NewPostgresPool(ctx, databaseURL)
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	defer pool.Close()

	repo := employee.NewPostgresRepository(pool)
	emp, err := repo.FindByPhone(ctx, "+918590215315")
	if err != nil {
		t.Fatalf("FindByPhone: %v", err)
	}
	if emp == nil || emp.Name != "Krishnanand G" {
		t.Fatalf("unexpected employee: %+v", emp)
	}
	if emp.ManagerID == nil || *emp.ManagerID != "9004" {
		t.Fatalf("expected manager 9004, got %+v", emp.ManagerID)
	}
}

func TestEmployeeDeletionDoesNotDeletePayrollRecords(t *testing.T) {
	source, err := os.ReadFile("postgres.go")
	if err != nil {
		t.Fatal(err)
	}
	deletionStart := strings.Index(string(source), "func (r *PostgresRepository) deleteEmployeesByIDs")
	if deletionStart < 0 {
		t.Fatal("employee deletion helper not found")
	}
	deletionEnd := strings.Index(string(source[deletionStart:]), "func (r *PostgresRepository) Delete(")
	if deletionEnd < 0 {
		t.Fatal("employee deletion helper boundary not found")
	}
	deletionSQL := string(source[deletionStart : deletionStart+deletionEnd])
	if strings.Contains(strings.ToUpper(deletionSQL), "DELETE FROM PAYROLL_RECORDS") {
		t.Fatal("employee deletion must preserve payroll_records")
	}
}
