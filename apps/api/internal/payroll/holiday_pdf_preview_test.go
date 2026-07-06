package payroll

import (
	"os"
	"testing"

	"github.com/nippon-toyota/hrms/internal/holiday"
)

// TestGenerateHolidayCalendarPDF_preview writes a sample PDF when
// HOLIDAY_PDF_OUT is set, for manual visual inspection.
func TestGenerateHolidayCalendarPDF_preview(t *testing.T) {
	hs := []holiday.Holiday{
		{Date: "2026-01-26", Name: "Republic Day"},
		{Date: "2026-03-20", Name: "Ramzan"},
		{Date: "2026-04-03", Name: "Good Friday"},
		{Date: "2026-04-04", Name: "Easter Saturday"},
		{Date: "2026-04-15", Name: "Vishu"},
		{Date: "2026-05-01", Name: "May Day"},
		{Date: "2026-05-27", Name: "Bakrid"},
		{Date: "2026-08-15", Name: "Independence Day"},
		{Date: "2026-08-26", Name: "Thiruvonam"},
		{Date: "2026-08-27", Name: "Third Onam"},
		{Date: "2026-10-02", Name: "Gandhi Jayanthi"},
		{Date: "2026-10-21", Name: "Vijayadasami"},
		{Date: "2026-12-25", Name: "Christmas"},
	}

	pdf, err := GenerateHolidayCalendarPDF(hs)
	if err != nil {
		t.Fatalf("GenerateHolidayCalendarPDF: %v", err)
	}
	if len(pdf) == 0 {
		t.Fatal("empty pdf output")
	}

	if out := os.Getenv("HOLIDAY_PDF_OUT"); out != "" {
		if err := os.WriteFile(out, pdf, 0o644); err != nil {
			t.Fatalf("write pdf: %v", err)
		}
	}
}
