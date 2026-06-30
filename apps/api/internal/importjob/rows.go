package importjob

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/nippon-toyota/hrms/internal/employee"
)

var numericRegex = regexp.MustCompile(`[^0-9\.\-]`)

func parseFloat(val string) float64 {
	cleanVal := strings.ReplaceAll(val, ",", "")
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

func parseFloatStrict(val string) float64 {
	v, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
	if err != nil {
		return 0
	}
	return v
}

func padRow(row []string, n int) []string {
	for len(row) < n {
		row = append(row, "")
	}
	return row
}

type StagingEmployee struct {
	RowNum                    int
	RowHash                   string
	ID                        string
	Name                      string
	Department                string
	MobileNumber              string
	Level                     string
	DOJ                       string
	DOJDate                   interface{}
	YearsExperience           float64
	Branch                    string
	Designation               string
	Zone                      string
	Basic                     float64
	DA                        float64
	RevisedBasicDA            float64
	HRA                       float64
	Travel                    float64
	Hostel                    float64
	Children                  float64
	TotalSalary               float64
	Mobile                    float64
	Conveyance                float64
	WashAllowance             float64
	BranchAllowance           float64
	SpecialAllowance          float64
	Training                  float64
	TotalAllowances           float64
	TotalSalaryWithAllowances float64
	BankName                  string
	AccountNumber             string
	BankBranch                string
	IFSCCode                  string
}

func parseEmployeeRow(rowNum int, row []string) (*StagingEmployee, string) {
	row = padRow(row, 30)
	id := strings.TrimSpace(row[0])
	if id == "" {
		return nil, "empty EMP ID"
	}
	doj := strings.TrimSpace(row[5])
	e := &StagingEmployee{
		RowNum:                    rowNum,
		ID:                        id,
		Name:                      strings.TrimSpace(row[1]),
		Department:                strings.TrimSpace(row[2]),
		MobileNumber:              strings.TrimSpace(row[3]),
		Level:                     strings.TrimSpace(row[4]),
		DOJ:                       doj,
		DOJDate:                   employee.ParseDOJ(doj),
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
	}
	e.RowHash = EmployeeRowHash(
		e.ID, e.Name, e.Department, e.MobileNumber, e.Level, e.Branch, e.Designation, e.Zone,
		e.DOJ, e.YearsExperience,
		e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel, e.Hostel, e.Children, e.TotalSalary,
		e.Mobile, e.Conveyance, e.WashAllowance, e.BranchAllowance, e.SpecialAllowance,
		e.Training, e.TotalAllowances, e.TotalSalaryWithAllowances,
		e.BankName, e.AccountNumber, e.BankBranch, e.IFSCCode,
	)
	return e, ""
}

type StagingEPF struct {
	RowNum        int
	RowHash       string
	EmployeeID    string
	Name          string
	Department    string
	Level         string
	DOJ           string
	DOJDate       interface{}
	YearsSinceDOJ float64
	DOA           string
	DOADate       interface{}
	YearsSinceDOA float64
	EPFNumber     string
	UAN           string
	ESINumber     string
}

func parseEPFRow(rowNum int, row []string) (*StagingEPF, string) {
	row = padRow(row, 12)
	id := strings.TrimSpace(row[1])
	if id == "" {
		return nil, "empty EMP ID"
	}
	doj := strings.TrimSpace(row[5])
	doa := strings.TrimSpace(row[7])
	r := &StagingEPF{
		RowNum:        rowNum,
		EmployeeID:    id,
		Name:          strings.TrimSpace(row[2]),
		Department:    strings.TrimSpace(row[3]),
		Level:         strings.TrimSpace(row[4]),
		DOJ:           doj,
		DOJDate:       employee.ParseDOJ(doj),
		YearsSinceDOJ: parseFloatStrict(row[6]),
		DOA:           doa,
		DOADate:       employee.ParseDOJ(doa),
		YearsSinceDOA: parseFloatStrict(row[8]),
		EPFNumber:     strings.TrimSpace(row[9]),
		UAN:           strings.TrimSpace(row[10]),
		ESINumber:     strings.TrimSpace(row[11]),
	}
	r.RowHash = EpfRowHash(
		r.EmployeeID, r.Name, r.Department, r.Level, r.DOJ, r.DOA,
		r.YearsSinceDOJ, r.YearsSinceDOA, r.EPFNumber, r.UAN, r.ESINumber,
	)
	return r, ""
}

type StagingPayroll struct {
	RowNum                       int
	RowHash                      string
	EmployeeID                   string
	Month                        int
	Year                         int
	EmpNameSnapshot              string
	Leaves                       float64
	LOP                          float64
	Days                         float64
	Absents                      float64
	Basic                        float64
	DA                           float64
	BasicDA                      float64
	HRA                          float64
	Travel                       float64
	ChildrenHostel               float64
	ChildrenEducation            float64
	Mobile                       float64
	Conveyance                   float64
	BranchAllowance              float64
	WashAllowance                float64
	SpecialAllowance             float64
	Training                     float64
	Incentive                    float64
	TotalEarWithIncen            float64
	GrossSalWithoutIncentives    float64
	GrossForPT                   float64
	PF                           float64
	PF367                        float64
	PF833                        float64
	ESI075                       float64
	ESI325                       float64
	TDS                          float64
	SalAdv                       float64
	AdditionalDeduction          float64
	Loan                         float64
	Advance                      float64
	LOPDeduction                 float64
	CompanyStatutoryContribution float64
	ReimbMedical                 float64
	ReimbLTA                     float64
	ZetaMealVoucher              float64
	ReimbTravel                  float64
	TotalReimbursement           float64
	EPFER                        float64
	NetIncentive                 float64
	TotalDeductions              float64
	ActualFinalAmount            float64
}

func parsePayrollRow(rowNum int, row []string, month, year int) (*StagingPayroll, string) {
	row = padRow(row, 47)
	empID := strings.TrimSpace(row[0])
	if empID == "" {
		return nil, "empty Employee ID"
	}
	r := &StagingPayroll{
		RowNum:                       rowNum,
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
		WashAllowance:                parseFloat(row[15]),
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
		Absents:                      parseFloat(row[46]),
	}
	r.RowHash = PayrollRowHash(
		r.EmployeeID, r.Month, r.Year, r.EmpNameSnapshot,
		r.Leaves, r.LOP, r.Days, r.Absents,
		r.Basic, r.DA, r.BasicDA, r.HRA, r.Travel, r.ChildrenHostel, r.ChildrenEducation,
		r.Mobile, r.Conveyance, r.BranchAllowance, r.WashAllowance, r.SpecialAllowance,
		r.Training, r.Incentive, r.TotalEarWithIncen, r.GrossSalWithoutIncentives, r.GrossForPT,
		r.PF, r.PF367, r.PF833, r.ESI075, r.ESI325, r.TDS, r.SalAdv, r.AdditionalDeduction,
		r.Loan, r.Advance, r.LOPDeduction, r.CompanyStatutoryContribution,
		r.ReimbMedical, r.ReimbLTA, r.ZetaMealVoucher, r.ReimbTravel, r.TotalReimbursement,
		r.EPFER, r.NetIncentive, r.TotalDeductions, r.ActualFinalAmount,
	)
	return r, ""
}
