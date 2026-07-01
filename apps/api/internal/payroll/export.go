package payroll

import (
	"sort"

	"github.com/nippon-toyota/hrms/pkg/employeeid"
)

// ExportHeaders lists the only columns included in salary directory Excel/CSV exports.
// UI-only table columns (Preview, Sl. No., checkboxes, computed totals) must never be added here.
var ExportHeaders = []string{
	"employeeId", "empNameSnapshot", "leaves", "lop", "days", "basic", "da", "basicDa",
	"hra", "travel", "childrenHostel", "childrenEducation", "mobile", "conveyance",
	"branchAllowance", "washAllowance", "specialAllowance", "training", "incentive",
	"totalEarWithIncen", "grossSalWithoutIncentives", "pf", "pf367", "pf833",
	"esi075", "esi325", "tds", "salAdv", "additionalDeduction", "loan",
	"companyStatutoryContribution", "reimbMedical", "reimbLTA", "zetaMealVoucher",
	"reimbTravel", "totalReimbursement", "netIncentive", "totalDeductions",
	"actualFinalAmount", "lopDeduction", "epfER", "grossForPT", "advance",
	"pf367_1", "pf833_1", "absents",
}

// RecordToExportValues returns payroll field values in ExportHeaders order.
func RecordToExportValues(rec Record) []any {
	return []any{
		rec.EmployeeID,
		rec.EmpNameSnapshot,
		rec.Leaves,
		rec.LOP,
		rec.Days,
		rec.Basic,
		rec.DA,
		rec.BasicDA,
		rec.HRA,
		rec.Travel,
		rec.ChildrenHostel,
		rec.ChildrenEducation,
		rec.Mobile,
		rec.Conveyance,
		rec.BranchAllowance,
		rec.WashAllowance,
		rec.SpecialAllowance,
		rec.Training,
		rec.Incentive,
		rec.TotalEarWithIncen,
		rec.GrossSalWithoutIncentives,
		rec.PF,
		rec.PF367,
		rec.PF833,
		rec.ESI075,
		rec.ESI325,
		rec.TDS,
		rec.SalAdv,
		rec.AdditionalDeduction,
		rec.Loan,
		rec.CompanyStatutoryContribution,
		rec.ReimbMedical,
		rec.ReimbLTA,
		rec.ZetaMealVoucher,
		rec.ReimbTravel,
		rec.TotalReimbursement,
		rec.NetIncentive,
		rec.TotalDeductions,
		rec.ActualFinalAmount,
		rec.LOPDeduction,
		rec.EPFER,
		rec.GrossForPT,
		rec.Advance,
		rec.PF367,
		rec.PF833,
		rec.Absents,
	}
}

// SortRecordsByEmployeeID sorts payroll records by employee ID ascending for export.
func SortRecordsByEmployeeID(records []Record) {
	sort.Slice(records, func(i, j int) bool {
		return employeeid.Less(records[i].EmployeeID, records[j].EmployeeID)
	})
}
