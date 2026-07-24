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

// ParseExcel reads the 6-column EPF compliance template.
// Format: EMP ID | DOA | Years Since DOA | EPF Number | UAN | ESI Number
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

		for len(row) < 6 {
			row = append(row, "")
		}

		id := strings.TrimSpace(row[0])
		if id == "" {
			errs = append(errs, fmt.Sprintf("Row %d: empty EMP ID", i+1))
			continue
		}

		records = append(records, Record{
			EmployeeID:    id,
			Name:          "", // Populated from employees table later
			Department:    "", // Populated from employees table later
			Level:         "", // Populated from employees table later
			DOJ:           "", // Populated from employees table later
			YearsSinceDOJ: 0,  // Populated from employees table later
			DOA:           strings.TrimSpace(row[1]),
			YearsSinceDOA: parseFloat(row[2]),
			EPFNumber:     strings.TrimSpace(row[3]),
			UAN:           strings.TrimSpace(row[4]),
			ESINumber:     strings.TrimSpace(row[5]),
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		})
	}

	return records, errs, nil
}
