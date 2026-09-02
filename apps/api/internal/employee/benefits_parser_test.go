package employee

import (
	"bytes"
	"testing"

	"github.com/xuri/excelize/v2"
)

func workbookBytes(t *testing.T, headers []string, rows [][]string) []byte {
	t.Helper()
	f := excelize.NewFile()
	defer f.Close()
	for i, value := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		if err := f.SetCellValue("Sheet1", cell, value); err != nil {
			t.Fatal(err)
		}
	}
	for rowIndex, row := range rows {
		for colIndex, value := range row {
			cell, _ := excelize.CoordinatesToCellName(colIndex+1, rowIndex+2)
			if err := f.SetCellValue("Sheet1", cell, value); err != nil {
				t.Fatal(err)
			}
		}
	}
	var out bytes.Buffer
	if err := f.Write(&out); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}

func TestParseBenefitsWorkbook(t *testing.T) {
	data := workbookBytes(t,
		[]string{"Sr No", "EMP ID", "Name", "Bonus 2026", "Leave Encashment 2025-26"},
		[][]string{{"1", "EMP001", "Asha", "1234.567", "0"}, {"2", "EMP002", "Bala", "", ""}},
	)
	result, err := ParseBenefitsWorkbook(bytes.NewReader(data), "benefits.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	if result.TotalRows != 2 || len(result.Rows) != 4 || result.BlankValues != 2 || len(result.Errors) != 0 {
		t.Fatalf("unexpected import result: %+v", result)
	}
	if result.Rows[0].Amount == nil || *result.Rows[0].Amount != 1234.57 || result.Rows[0].Period != "2026" {
		t.Fatalf("unexpected bonus row: %+v", result.Rows[0])
	}
}

func TestParseBenefitsWorkbookRejectsDuplicateIDs(t *testing.T) {
	data := workbookBytes(t,
		[]string{"EMP ID", "Bonus 2026", "Leave Encashment 2025-26"},
		[][]string{{"EMP001", "1", "2"}, {"EMP001", "3", "4"}},
	)
	result, err := ParseBenefitsWorkbook(bytes.NewReader(data), "benefits.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Errors) != 1 {
		t.Fatalf("expected duplicate error, got %+v", result.Errors)
	}
}
