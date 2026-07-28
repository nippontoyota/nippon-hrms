package downloadname_test

import (
	"strings"
	"testing"
	"time"

	"github.com/nippon-toyota/hrms/pkg/downloadname"
)

func TestExportTimestampIST_format(t *testing.T) {
	ts := downloadname.ExportTimestampIST()
	if len(ts) != len("2006-01-02_15-04-05") {
		t.Fatalf("unexpected timestamp length: %q", ts)
	}
	if strings.Count(ts, "-") < 4 || strings.Count(ts, "_") != 1 {
		t.Fatalf("unexpected timestamp format: %q", ts)
	}
}

func TestSalaryImportTemplate(t *testing.T) {
	got := downloadname.SalaryImportTemplate(6, 2026)
	want := "SalaryDirectory_ImportTemplate_06-2026.xlsx"
	if got != want {
		t.Fatalf("SalaryImportTemplate() = %q, want %q", got, want)
	}
}

func TestSalaryExport_containsPeriodAndExtension(t *testing.T) {
	got := downloadname.SalaryExport(6, 2026)
	if !strings.HasPrefix(got, "SalaryDirectory_Export_06-2026_") {
		t.Fatalf("unexpected prefix: %q", got)
	}
	if !strings.HasSuffix(got, ".xlsx") {
		t.Fatalf("expected .xlsx suffix: %q", got)
	}
}

func TestEmployeeImportTemplate_isStatic(t *testing.T) {
	if downloadname.EmployeeImportTemplate() != "EmployeeDirectory_ImportTemplate.xlsx" {
		t.Fatal("employee import template should be static")
	}
}

func TestExportTimestampIST_usesIST(t *testing.T) {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Skip("Asia/Kolkata not available")
	}
	expected := time.Now().In(loc).Format("2006-01-02_15-04-05")
	if downloadname.ExportTimestampIST() != expected {
		t.Fatalf("ExportTimestampIST() = %q, want %q", downloadname.ExportTimestampIST(), expected)
	}
}
