package employee_test

import (
	"context"
	"os"
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
