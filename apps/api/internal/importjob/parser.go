package importjob

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/xuri/excelize/v2"
)

type ParseResult struct {
	EmployeeRows []*StagingEmployee
	EPFRows      []*StagingEPF
	PayrollRows  []*StagingPayroll
	Errors       []JobError
	TotalRows    int
}

func DetectFormat(fileName string, _ io.Reader) (FileFormat, error) {
	lower := strings.ToLower(fileName)
	if strings.HasSuffix(lower, ".csv") {
		return FormatCSV, nil
	}
	if strings.HasSuffix(lower, ".xlsx") || strings.HasSuffix(lower, ".xls") {
		return FormatXLSX, nil
	}
	return FormatCSV, fmt.Errorf("unsupported file extension: use .csv or .xlsx")
}

func ParseFile(entity EntityType, format FileFormat, filePath string, month, year int, maxRows int) (*ParseResult, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	switch format {
	case FormatCSV:
		return parseCSV(entity, f, month, year, maxRows)
	case FormatXLSX:
		return parseXLSX(entity, f, month, year, maxRows)
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}
}

func parseCSV(entity EntityType, r io.Reader, month, year, maxRows int) (*ParseResult, error) {
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	rows, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read csv: %w", err)
	}
	return parseRows(entity, rows, month, year, maxRows)
}

func parseXLSX(entity EntityType, r io.Reader, month, year, maxRows int) (*ParseResult, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, fmt.Errorf("open xlsx: %w", err)
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("read xlsx rows: %w", err)
	}
	return parseRows(entity, rows, month, year, maxRows)
}

func parseRows(entity EntityType, rows [][]string, month, year, maxRows int) (*ParseResult, error) {
	res := &ParseResult{}
	seen := make(map[string]int)

	for i, row := range rows {
		if i == 0 {
			continue
		}
		rowNum := i + 1
		if res.TotalRows >= maxRows {
			res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: fmt.Sprintf("exceeds max rows limit (%d)", maxRows)})
			continue
		}

		switch entity {
		case EntityEmployees:
			e, msg := parseEmployeeRow(rowNum, row)
			if msg != "" {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: msg})
				continue
			}
			if prev, ok := seen[e.ID]; ok {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: fmt.Sprintf("duplicate EMP ID %s (first seen row %d)", e.ID, prev)})
				continue
			}
			seen[e.ID] = rowNum
			res.EmployeeRows = append(res.EmployeeRows, e)
			res.TotalRows++

		case EntityEPF:
			e, msg := parseEPFRow(rowNum, row)
			if msg != "" {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: msg})
				continue
			}
			if prev, ok := seen[e.EmployeeID]; ok {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: fmt.Sprintf("duplicate EMP ID %s (first seen row %d)", e.EmployeeID, prev)})
				continue
			}
			seen[e.EmployeeID] = rowNum
			res.EPFRows = append(res.EPFRows, e)
			res.TotalRows++

		case EntityPayroll:
			p, msg := parsePayrollRow(rowNum, row, month, year)
			if msg != "" {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: msg})
				continue
			}
			key := PayrollNaturalKey(p.EmployeeID, p.Month, p.Year)
			if prev, ok := seen[key]; ok {
				res.Errors = append(res.Errors, JobError{RowNum: rowNum, Message: fmt.Sprintf("duplicate payroll key %s (first seen row %d)", key, prev)})
				continue
			}
			seen[key] = rowNum
			res.PayrollRows = append(res.PayrollRows, p)
			res.TotalRows++
		}
	}

	return res, nil
}
