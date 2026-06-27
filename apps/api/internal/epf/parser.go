package epf

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

func parseFloat(val string) float64 {
	v, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
	if err != nil {
		return 0
	}
	return v
}

// ParseExcel reads the 12-column EPF compliance template.
// Format: Sl No | EMP | Name | Department | New Level | DOJ | No: of Yrs | DOA | No: of Yrs | KR/KCH/19297/ | UAN | ESI
func ParseExcel(r io.Reader) ([]Record, []string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open excel: %w", err)
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get rows: %w", err)
	}

	var records []Record
	var errs []string

	for i, row := range rows {
		if i == 0 {
			continue
		}

		for len(row) < 12 {
			row = append(row, "")
		}

		id := strings.TrimSpace(row[1])
		if id == "" {
			errs = append(errs, fmt.Sprintf("Row %d: empty EMP ID", i+1))
			continue
		}

		records = append(records, Record{
			EmployeeID:    id,
			Name:          strings.TrimSpace(row[2]),
			Department:    strings.TrimSpace(row[3]),
			Level:         strings.TrimSpace(row[4]),
			DOJ:           strings.TrimSpace(row[5]),
			YearsSinceDOJ: parseFloat(row[6]),
			DOA:           strings.TrimSpace(row[7]),
			YearsSinceDOA: parseFloat(row[8]),
			EPFNumber:     strings.TrimSpace(row[9]),
			UAN:           strings.TrimSpace(row[10]),
			ESINumber:     strings.TrimSpace(row[11]),
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		})
	}

	return records, errs, nil
}
