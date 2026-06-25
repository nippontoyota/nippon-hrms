package payroll

import (
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

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
	var errors []string

	for i, row := range rows {
		if i == 0 {
			continue
		}

		if len(row) < 6 {
			errors = append(errors, fmt.Sprintf("Row %d: missing columns", i+1))
			continue
		}

		empID := strings.TrimSpace(row[0])
		if empID == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty Employee ID", i+1))
			continue
		}

		month, err := strconv.Atoi(strings.TrimSpace(row[1]))
		if err != nil || month < 1 || month > 12 {
			errors = append(errors, fmt.Sprintf("Row %d: invalid Month", i+1))
			continue
		}

		year, err := strconv.Atoi(strings.TrimSpace(row[2]))
		if err != nil || year < 2000 || year > 2100 {
			errors = append(errors, fmt.Sprintf("Row %d: invalid Year", i+1))
			continue
		}

		basic, err := strconv.ParseFloat(strings.TrimSpace(row[3]), 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: invalid BasicSalary", i+1))
			continue
		}

		allowances, err := strconv.ParseFloat(strings.TrimSpace(row[4]), 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: invalid Allowances", i+1))
			continue
		}

		deductions, err := strconv.ParseFloat(strings.TrimSpace(row[5]), 64)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: invalid Deductions", i+1))
			continue
		}

		netPay := (basic + allowances) - deductions

		records = append(records, Record{
			EmployeeID:  empID,
			Month:       month,
			Year:        year,
			BasicSalary: basic,
			Allowances:  allowances,
			Deductions:  deductions,
			NetPay:      netPay,
		})
	}

	return records, errors, nil
}
