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
	seenMobile := make(map[string]string)

	for i, row := range rows {
		if i == 0 {
			continue // Skip header
		}

		// Pad row to 31 columns to handle trailing empty cells
		for len(row) < 31 {
			row = append(row, "")
		}

		id := strings.TrimSpace(row[0])
		if id == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty EMP ID", i+1))
			continue
		}

		mobile := strings.TrimSpace(row[3])
		if mobile != "" {
			if ownerID, exists := seenMobile[mobile]; exists {
				errors = append(errors, fmt.Sprintf("Row %d: Mobile number %s is a duplicate of employee %s in this sheet.", i+1, mobile, ownerID))
				continue
			}
			seenMobile[mobile] = id
		}

		employees = append(employees, Employee{
			ID:                        id,
			Name:                      strings.TrimSpace(row[1]),
			Department:                strings.TrimSpace(row[2]),
			MobileNumber:              mobile,
			Level:                     strings.TrimSpace(row[4]),
			DOJ:                       strings.TrimSpace(row[5]),
			Birthday:                  strings.TrimSpace(row[6]),
			YearsExperience:           parseFloat(row[7]),
			Branch:                    strings.TrimSpace(row[8]),
			Designation:               strings.TrimSpace(row[9]),
			Basic:                     parseFloat(row[10]),
			DA:                        parseFloat(row[11]),
			RevisedBasicDA:            parseFloat(row[12]),
			HRA:                       parseFloat(row[13]),
			Travel:                    parseFloat(row[14]),
			Hostel:                    parseFloat(row[15]),
			Children:                  parseFloat(row[16]),
			TotalSalary:               parseFloat(row[17]),
			Mobile:                    parseFloat(row[18]),
			Conveyance:                parseFloat(row[19]),
			WashAllowance:             parseFloat(row[20]),
			BranchAllowance:           parseFloat(row[21]),
			SpecialAllowance:          parseFloat(row[22]),
			Training:                  parseFloat(row[23]),
			TotalAllowances:           parseFloat(row[24]),
			TotalSalaryWithAllowances: parseFloat(row[25]),
			BankName:                  strings.TrimSpace(row[26]),
			AccountNumber:             strings.TrimSpace(row[27]),
			BankBranch:                strings.TrimSpace(row[28]),
			IFSCCode:                  strings.TrimSpace(row[29]),
			Zone:                      strings.TrimSpace(row[30]),
			CreatedAt:                 time.Now(),
			UpdatedAt:                 time.Now(),
		})
	}

	return employees, errors, nil
}
