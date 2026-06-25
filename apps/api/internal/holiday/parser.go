package holiday

import (
	"fmt"
	"io"
	"strings"

	"github.com/xuri/excelize/v2"
)

// ParseExcel reads an uploaded Excel file and extracts Holiday data.
// Expects columns: Date (YYYY-MM-DD), Name, IsOptional (Yes/No).
func ParseExcel(r io.Reader) ([]Holiday, []string, error) {
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

	var holidays []Holiday
	var errors []string

	for i, row := range rows {
		if i == 0 {
			continue // Skip header
		}

		if len(row) < 2 {
			errors = append(errors, fmt.Sprintf("Row %d: missing columns", i+1))
			continue
		}

		date := strings.TrimSpace(row[0])
		if date == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty Date", i+1))
			continue
		}

		name := strings.TrimSpace(row[1])
		if name == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty Name", i+1))
			continue
		}

		isOptional := false
		if len(row) >= 3 {
			optStr := strings.ToLower(strings.TrimSpace(row[2]))
			if optStr == "yes" || optStr == "true" || optStr == "y" {
				isOptional = true
			}
		}

		holidays = append(holidays, Holiday{
			Date:       date,
			Name:       name,
			IsOptional: isOptional,
		})
	}

	return holidays, errors, nil
}
