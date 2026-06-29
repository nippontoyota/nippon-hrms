package payroll

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed seeddata/salary-seed.json
var salarySeedJSON []byte

type salarySeedRow struct {
	EmployeeID   string                 `json:"employeeId"`
	EmployeeName string                 `json:"employeeName"`
	Data         map[string]interface{} `json:"data"`
}

func daysInMonth(month, year int) float64 {
	switch month {
	case 2:
		if year%4 == 0 && (year%100 != 0 || year%400 == 0) {
			return 29
		}
		return 28
	case 4, 6, 9, 11:
		return 30
	default:
		return 31
	}
}

func seedFloat(data map[string]interface{}, keys ...string) float64 {
	for _, key := range keys {
		v, ok := data[key]
		if !ok || v == nil {
			continue
		}
		switch n := v.(type) {
		case float64:
			return n
		case int:
			return float64(n)
		}
	}
	return 0
}

func seedRowToRecord(row salarySeedRow, month, year int) Record {
	d := row.Data
	return Record{
		EmployeeID:                   row.EmployeeID,
		Month:                        month,
		Year:                         year,
		EmpNameSnapshot:              row.EmployeeName,
		Leaves:                       seedFloat(d, "Leaves"),
		LOP:                          seedFloat(d, "LOP"),
		Days:                         daysInMonth(month, year),
		Absents:                      seedFloat(d, "ABSENTS"),
		Basic:                        seedFloat(d, "Basic"),
		DA:                           seedFloat(d, "DA"),
		BasicDA:                      seedFloat(d, "Basic+DA"),
		HRA:                          seedFloat(d, "HRA"),
		Travel:                       seedFloat(d, "Travel"),
		ChildrenHostel:               seedFloat(d, "Children Hostel"),
		ChildrenEducation:            seedFloat(d, "Children Education"),
		Mobile:                       seedFloat(d, "Mobile"),
		Conveyance:                   seedFloat(d, "Convy"),
		BranchAllowance:              seedFloat(d, "Br. Allow"),
		WashAllowance:                seedFloat(d, "W.A."),
		SpecialAllowance:             seedFloat(d, "Spl All"),
		Training:                     seedFloat(d, "Training"),
		Incentive:                    seedFloat(d, "Incentive"),
		TotalEarWithIncen:            seedFloat(d, "Total Ear with incen"),
		GrossSalWithoutIncentives:    seedFloat(d, "Gross Sal-With out Incentives"),
		GrossForPT:                   seedFloat(d, "Gross for PT"),
		PF:                           seedFloat(d, "PF"),
		PF367:                        seedFloat(d, "3.67"),
		PF833:                        seedFloat(d, "8.33"),
		ESI075:                       seedFloat(d, "ESI 0.75"),
		ESI325:                       seedFloat(d, "ESI 3.25"),
		TDS:                          seedFloat(d, "TDS"),
		SalAdv:                       seedFloat(d, "Sal Adv"),
		AdditionalDeduction:          seedFloat(d, "Additional Deduction"),
		Loan:                         seedFloat(d, "Loan"),
		Advance:                      seedFloat(d, "Advance"),
		LOPDeduction:                 seedFloat(d, "LOP"),
		CompanyStatutoryContribution: seedFloat(d, "Company's Statutory contribution"),
		ReimbMedical:                 seedFloat(d, "Reimbursement of Medical Expences"),
		ReimbLTA:                     seedFloat(d, "Reimbursement of LTA"),
		ZetaMealVoucher:              seedFloat(d, "Zeta Meal Voucher / Gift Card / Sudexo"),
		ReimbTravel:                  seedFloat(d, "Reimbursement of Travel Expences"),
		TotalReimbursement:           seedFloat(d, "Total Reimbursement"),
		EPFER:                        seedFloat(d, "EPF ER"),
		NetIncentive:                 seedFloat(d, "Net Incentive"),
		TotalDeductions:              seedFloat(d, "Total Deductions"),
		ActualFinalAmount:            seedFloat(d, "Actual Final Amount"),
	}
}

// SeedSampleMonths inserts dummy payroll rows for each month in [fromMonth, toMonth].
func SeedSampleMonths(ctx context.Context, repo Repository, year, fromMonth, toMonth int) (int, error) {
	if fromMonth < 1 || toMonth > 12 || fromMonth > toMonth {
		return 0, fmt.Errorf("invalid month range %d-%d", fromMonth, toMonth)
	}
	if year < 2000 {
		return 0, fmt.Errorf("invalid year %d", year)
	}

	var rows []salarySeedRow
	if err := json.Unmarshal(salarySeedJSON, &rows); err != nil {
		return 0, fmt.Errorf("parse salary seed: %w", err)
	}

	var records []Record
	for month := fromMonth; month <= toMonth; month++ {
		for _, row := range rows {
			records = append(records, seedRowToRecord(row, month, year))
		}
	}

	if err := repo.BulkInsert(ctx, records); err != nil {
		return 0, err
	}
	return len(records), nil
}
