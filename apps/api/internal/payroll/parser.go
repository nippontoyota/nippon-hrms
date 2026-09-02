package payroll

/*
import (
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)
*/

/*
var numericRegex = regexp.MustCompile(`[^0-9\.\-]`)

func parseFloat(val string) float64 {
	// Remove all commas first
	cleanVal := strings.ReplaceAll(val, ",", "")
	// Remove any currency symbols, spaces, etc
	cleanVal = numericRegex.ReplaceAllString(cleanVal, "")
	cleanVal = strings.TrimSpace(cleanVal)
	if cleanVal == "" || cleanVal == "-" || cleanVal == "." {
		return 0
	}
	v, err := strconv.ParseFloat(cleanVal, 64)
	if err != nil {
		return 0
	}
	return v
}

// ParseExcel reads an uploaded Excel file and extracts Payroll data.
// Expects the exact 48 columns defined by the business schema.
// Deprecated: Replaced by the dynamic parser in apps/api/internal/importjob/rows.go
func ParseExcel(r io.Reader, month, year int) ([]Record, []string, error) {
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
			continue // Skip header
		}

		// Pad row to 47 columns to handle trailing empty cells from Excel
		for len(row) < 47 {
			row = append(row, "")
		}

		empID := strings.TrimSpace(row[0])
		if empID == "" {
			errors = append(errors, fmt.Sprintf("Row %d: empty Employee ID", i+1))
			continue
		}

		records = append(records, Record{
			EmployeeID:                   empID,
			Month:                        month,
			Year:                         year,
			EmpNameSnapshot:              strings.TrimSpace(row[1]),
			Leaves:                       parseFloat(row[2]),
			LOP:                          parseFloat(row[3]),
			Days:                         parseFloat(row[4]),
			Basic:                        parseFloat(row[5]),
			DA:                           parseFloat(row[6]),
			BasicDA:                      parseFloat(row[7]),
			HRA:                          parseFloat(row[8]),
			Travel:                       parseFloat(row[9]),
			ChildrenHostel:               parseFloat(row[10]),
			ChildrenEducation:            parseFloat(row[11]),
			Mobile:                       parseFloat(row[12]),
			Conveyance:                   parseFloat(row[13]),
			BranchAllowance:              parseFloat(row[14]),
			PerformanceAllowance:                parseFloat(row[15]),
			SpecialAllowance:             parseFloat(row[16]),
			Training:                     parseFloat(row[17]),
			Incentive:                    parseFloat(row[18]),
			TotalEarWithIncen:            parseFloat(row[19]),
			GrossSalWithoutIncentives:    parseFloat(row[20]),
			PF:                           parseFloat(row[21]),
			PF367:                        parseFloat(row[22]),
			PF833:                        parseFloat(row[23]),
			ESI075:                       parseFloat(row[24]),
			ESI325:                       parseFloat(row[25]),
			TDS:                          parseFloat(row[26]),
			SalAdv:                       parseFloat(row[27]),
			AdditionalDeduction:          parseFloat(row[28]),
			Loan:                         parseFloat(row[29]),
			CompanyStatutoryContribution: parseFloat(row[30]),
			ReimbMedical:                 parseFloat(row[31]),
			ReimbLTA:                     parseFloat(row[32]),
			ZetaMealVoucher:              parseFloat(row[33]),
			ReimbTravel:                  parseFloat(row[34]),
			TotalReimbursement:           parseFloat(row[35]),
			NetIncentive:                 parseFloat(row[36]),
			TotalDeductions:              parseFloat(row[37]),
			ActualFinalAmount:            parseFloat(row[38]),
			LOPDeduction:                 parseFloat(row[39]),
			EPFER:                        parseFloat(row[40]),
			GrossForPT:                   parseFloat(row[41]),
			Advance:                      parseFloat(row[42]),
			// skipping duplicates 3.67 (43) and 8.33 (44) based on assumption
			// total at 45
			Absents:   parseFloat(row[46]),
			CreatedAt: time.Now(),
		})
	}

	return records, errors, nil
}
*/
