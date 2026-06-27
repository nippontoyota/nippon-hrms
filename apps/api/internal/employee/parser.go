package employee

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

// ParseExcel reads an uploaded Excel file and extracts Employee master data.
func ParseExcel(r io.Reader) ([]Employee, []string, error) {
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

	var employees []Employee
	var errors []string

	for i, row := range rows {
		if i == 0 {
			continue // Skip header
		}

		// Pad row to 34 columns to handle trailing empty cells (added EPF fields)
		for len(row) < 34 {
			row = append(row, "")
		}

		id := strings.TrimSpace(row[0])
		if id == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty EMP ID", i+1))
			continue
		}

		employees = append(employees, Employee{
			ID:                        id,
			Name:                      strings.TrimSpace(row[1]),
			Department:                strings.TrimSpace(row[2]),
			MobileNumber:              strings.TrimSpace(row[3]),
			Level:                     strings.TrimSpace(row[4]),
			DOJ:                       strings.TrimSpace(row[5]),
			YearsExperience:           parseFloat(row[6]),
			Branch:                    strings.TrimSpace(row[7]),
			Designation:               strings.TrimSpace(row[8]),
			Basic:                     parseFloat(row[9]),
			DA:                        parseFloat(row[10]),
			RevisedBasicDA:            parseFloat(row[11]),
			HRA:                       parseFloat(row[12]),
			Travel:                    parseFloat(row[13]),
			Hostel:                    parseFloat(row[14]),
			Children:                  parseFloat(row[15]),
			TotalSalary:               parseFloat(row[16]),
			Mobile:                    parseFloat(row[17]),
			Conveyance:                parseFloat(row[18]),
			WashAllowance:             parseFloat(row[19]),
			BranchAllowance:           parseFloat(row[20]),
			SpecialAllowance:          parseFloat(row[21]),
			Training:                  parseFloat(row[22]),
			TotalAllowances:           parseFloat(row[23]),
			TotalSalaryWithAllowances: parseFloat(row[24]),
			BankName:                  strings.TrimSpace(row[25]),
			AccountNumber:             strings.TrimSpace(row[26]),
			BankBranch:                strings.TrimSpace(row[27]),
			IFSCCode:                  strings.TrimSpace(row[28]),
			Zone:                      strings.TrimSpace(row[29]),
			DOA:                       strings.TrimSpace(row[30]),
			EPFNumber:                 strings.TrimSpace(row[31]),
			UAN:                       strings.TrimSpace(row[32]),
			ESINumber:                 strings.TrimSpace(row[33]),
			CreatedAt:                 time.Now(),
			UpdatedAt:                 time.Now(),
		})
	}

	return employees, errors, nil
}

// ParseEPFExcel reads an uploaded Excel file matching the EPF Compliance 12-column template.
// Format: Sl No | EMP | Name | Department | New Level | DOJ | No: of Yrs | DOA | No: of Yrs | KR/KCH/19297/ | UAN | ESI
func ParseEPFExcel(r io.Reader) ([]Employee, []string, error) {
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

	var employees []Employee
	var errs []string

	for i, row := range rows {
		if i == 0 {
			continue // Skip header
		}

		// Pad row to 12 columns
		for len(row) < 12 {
			row = append(row, "")
		}

		id := strings.TrimSpace(row[1])
		if id == "" {
			errs = append(errs, fmt.Sprintf("Row %d: empty EMP ID", i+1))
			continue
		}

		employees = append(employees, Employee{
			ID:        id,
			DOA:       strings.TrimSpace(row[7]),
			EPFNumber: strings.TrimSpace(row[9]),
			UAN:       strings.TrimSpace(row[10]),
			ESINumber: strings.TrimSpace(row[11]),
		})
	}

	return employees, errs, nil
}
