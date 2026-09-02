package payroll

import (
	"sort"

	"github.com/nippon-toyota/hrms/pkg/employeeid"
)

// ExportHeaders lists the only columns included in salary directory Excel/CSV exports.
// UI-only table columns (Preview, Sl. No., checkboxes, computed totals) must never be added here.
var ExportHeaders = []string{
	"employeeId", "empNameSnapshot", "paidDays", "basicDa",
	"hra", "travel", "childrenHostel", "childrenEducation", "mobile", "conveyance",
	"branchAllowance", "performanceAllowance", "specialAllowance", "training", "incentive",
	"totalEarWithIncen", "pf", "esi075", "tds",
	"salAdv", "additionalDeduction", "loan", "totalDeductions", "actualFinalAmount",
}

// RecordToExportValues returns payroll field values in ExportHeaders order.
func RecordToExportValues(rec Record) []any {
	return []any{
		rec.EmployeeID,
		rec.EmpNameSnapshot,
		rec.Days,
		rec.BasicDA,
		rec.HRA,
		rec.Travel,
		rec.ChildrenHostel,
		rec.ChildrenEducation,
		rec.Mobile,
		rec.Conveyance,
		rec.BranchAllowance,
		rec.PerformanceAllowance,
		rec.SpecialAllowance,
		rec.Training,
		rec.Incentive,
		rec.TotalEarWithIncen,
		rec.PF,
		rec.ESI075,
		rec.TDS,
		rec.SalAdv,
		rec.AdditionalDeduction,
		rec.Loan,
		rec.TotalDeductions,
		rec.ActualFinalAmount,
	}
}

// SortRecordsByEmployeeID sorts payroll records by employee ID ascending for export.
func SortRecordsByEmployeeID(records []Record) {
	sort.Slice(records, func(i, j int) bool {
		return employeeid.Less(records[i].EmployeeID, records[j].EmployeeID)
	})
}
