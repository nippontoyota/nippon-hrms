package employee

import (
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/xuri/excelize/v2"
)

type BenefitsImport struct {
	Rows        []EmployeeBenefit
	TotalRows   int
	BlankValues int
	Errors      []string
}

func ParseBenefitsWorkbook(r io.Reader, sourceFile string) (BenefitsImport, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return BenefitsImport{}, fmt.Errorf("open benefits workbook: %w", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	rows, err := f.GetRows(sheet)
	if err != nil {
		return BenefitsImport{}, fmt.Errorf("read benefits workbook: %w", err)
	}
	if len(rows) == 0 {
		return BenefitsImport{}, fmt.Errorf("benefits workbook is empty")
	}

	header := make(map[string]int)
	for i, value := range rows[0] {
		header[normalizeBenefitsHeader(value)] = i
	}
	required := []string{"emp id", "bonus 2026", "leave encashment 2025-26"}
	for _, name := range required {
		if _, ok := header[name]; !ok {
			return BenefitsImport{}, fmt.Errorf("missing required column %q", name)
		}
	}

	result := BenefitsImport{}
	seen := make(map[string]int)
	for i, row := range rows[1:] {
		rowNumber := i + 2
		if allBlank(row) {
			continue
		}
		result.TotalRows++
		id := cell(row, header["emp id"])
		if id == "" {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: missing EMP ID", rowNumber))
			continue
		}
		if previous, ok := seen[id]; ok {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: duplicate EMP ID %s, first seen on row %d", rowNumber, id, previous))
			continue
		}
		seen[id] = rowNumber

		bonus, bonusPresent, err := parseBenefitAmount(cell(row, header["bonus 2026"]))
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d EMP ID %s: invalid Bonus 2026: %v", rowNumber, id, err))
		}
		encashment, encashmentPresent, err := parseBenefitAmount(cell(row, header["leave encashment 2025-26"]))
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("row %d EMP ID %s: invalid Leave Encashment 2025-26: %v", rowNumber, id, err))
		}
		var bonusAmount, encashmentAmount *float64
		if bonusPresent {
			bonusAmount = &bonus
		} else {
			result.BlankValues++
		}
		if encashmentPresent {
			encashmentAmount = &encashment
		} else {
			result.BlankValues++
		}
		result.Rows = append(result.Rows,
			EmployeeBenefit{EmployeeID: id, BenefitType: BenefitApprovedBonus, Period: "2026", Amount: bonusAmount, SourceFile: sourceFile},
			EmployeeBenefit{EmployeeID: id, BenefitType: BenefitLeaveEncashment, Period: "2025-26", Amount: encashmentAmount, SourceFile: sourceFile},
		)
	}
	return result, nil
}

func normalizeBenefitsHeader(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(value)), " "))
}

func cell(row []string, index int) string {
	if index < 0 || index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func allBlank(row []string) bool {
	for _, value := range row {
		if strings.TrimSpace(value) != "" {
			return false
		}
	}
	return true
}

func parseBenefitAmount(value string) (float64, bool, error) {
	if strings.TrimSpace(value) == "" {
		return 0, false, nil
	}
	amount, err := strconv.ParseFloat(strings.ReplaceAll(strings.TrimSpace(value), ",", ""), 64)
	if err != nil || amount < 0 {
		return 0, false, fmt.Errorf("amount must be a non-negative number")
	}
	return roundBenefitAmount(amount), true, nil
}

func roundBenefitAmount(amount float64) float64 {
	return float64(int64(amount*100+0.5)) / 100
}
