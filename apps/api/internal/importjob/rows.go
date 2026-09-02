package importjob

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

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
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return v
}

func parseFloatStrict(val string) float64 {
	v, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
	if err != nil {
		return 0
	}
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return 0
	}
	return v
}

func NormalizeHeader(h string) string {
	h = strings.ToLower(h)
	for _, char := range []string{" ", "_", "-", ".", "/", ":", "(", ")"} {
		h = strings.ReplaceAll(h, char, "")
	}
	return h
}

func getValue(row []string, headerMap map[string]int, keys ...string) string {
	if headerMap == nil {
		return ""
	}
	for _, key := range keys {
		if idx, ok := headerMap[NormalizeHeader(key)]; ok && idx < len(row) {
			return strings.TrimSpace(row[idx])
		}
	}
	return ""
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
	Birthday                  string
	BirthdayDate              interface{}
	YearsExperience           float64
	Branch                    string
	Designation               string
	Zone                      string
	ManagerID                 string
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
	PerformanceAllowance      float64
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

func parseEmployeeRow(rowNum int, row []string, headerMap map[string]int) (*StagingEmployee, string) {
	id := getValue(row, headerMap, "employeeid", "empid", "id")
	if id == "" {
		return nil, "empty EMP ID"
	}
	doj := getValue(row, headerMap, "doj", "dateofjoining")
	birthday := getValue(row, headerMap, "birthday", "dob", "dateofbirth")
	name := getValue(row, headerMap, "name", "employeename")
	if name == "" {
		name = "Unknown"
	}
	mobile := getValue(row, headerMap, "mobilenumber", "mobileno", "mobile", "phone")
	if mobile == "" {
		mobile = "N/A-" + id
	}

	e := &StagingEmployee{
		RowNum:                    rowNum,
		ID:                        id,
		Name:                      name,
		Department:                getValue(row, headerMap, "department", "dept"),
		MobileNumber:              mobile,
		Level:                     getValue(row, headerMap, "level", "emplevel"),
		DOJ:                       doj,
		DOJDate:                   employee.ParseDOJ(doj),
		Birthday:                  birthday,
		BirthdayDate:              employee.ParseDOJ(birthday),
		YearsExperience:           parseFloat(getValue(row, headerMap, "noofyrs", "yearsexperience", "yearsofexperience", "experience")),
		Branch:                    getValue(row, headerMap, "branch", "location"),
		Designation:               getValue(row, headerMap, "designatior", "designation", "role"),
		Zone:                      getValue(row, headerMap, "zone"),
		ManagerID:                 getValue(row, headerMap, "manager", "managerid", "reportingmanager"),
		Basic:                     parseFloat(getValue(row, headerMap, "basic", "basicsalary")),
		DA:                        parseFloat(getValue(row, headerMap, "da")),
		RevisedBasicDA:            parseFloat(getValue(row, headerMap, "revisedbas", "revisedbasicda")),
		HRA:                       parseFloat(getValue(row, headerMap, "hra")),
		Travel:                    parseFloat(getValue(row, headerMap, "travel", "travelallowance")),
		Hostel:                    parseFloat(getValue(row, headerMap, "hostel", "hostelallowance")),
		Children:                  parseFloat(getValue(row, headerMap, "children", "childrenallowance")),
		TotalSalary:               parseFloat(getValue(row, headerMap, "totalsalary")),
		Mobile:                    parseFloat(getValue(row, headerMap, "mobileallowance", "mobile")),
		Conveyance:                parseFloat(getValue(row, headerMap, "convy", "conveyance")),
		PerformanceAllowance:      parseFloat(getValue(row, headerMap, "performanceallowance", "performanceallowance")),
		BranchAllowance:           parseFloat(getValue(row, headerMap, "branallo", "branchallowance")),
		SpecialAllowance:          parseFloat(getValue(row, headerMap, "splall", "specialallowance")),
		Training:                  parseFloat(getValue(row, headerMap, "training", "trainingallowance")),
		TotalAllowances:           parseFloat(getValue(row, headerMap, "totalallow", "totalallowances")),
		TotalSalaryWithAllowances: parseFloat(getValue(row, headerMap, "totalsalary_2", "totalsalarywithallowances", "totalsalwithallowances")),
		BankName:                  getValue(row, headerMap, "bank", "bankname"),
		AccountNumber:             getValue(row, headerMap, "acno", "accountnumber"),
		BankBranch:                getValue(row, headerMap, "bankbranc", "bankbranch"),
		IFSCCode:                  getValue(row, headerMap, "ifsccode", "ifsc"),
	}
	if e.Mobile == 0 {
		e.Mobile = parseFloat(getValue(row, headerMap, "mobile", "mobileallowance"))
	}
	e.RowHash = EmployeeRowHash(
		e.ID, e.Name, e.Department, e.MobileNumber, e.Level, e.Branch, e.Designation, e.Zone, e.ManagerID,
		e.DOJ, e.Birthday, e.YearsExperience,
		e.Basic, e.DA, e.RevisedBasicDA, e.HRA, e.Travel, e.Hostel, e.Children, e.TotalSalary,
		e.Mobile, e.Conveyance, e.PerformanceAllowance, e.BranchAllowance, e.SpecialAllowance,
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

func parseEPFRow(rowNum int, row []string, headerMap map[string]int) (*StagingEPF, string) {
	id := getValue(row, headerMap, "employeeid", "empid", "id")
	if id == "" {
		return nil, "empty EMP ID"
	}
	doj := getValue(row, headerMap, "doj", "dateofjoining")
	doa := getValue(row, headerMap, "doa", "dateofadmission")
	r := &StagingEPF{
		RowNum:        rowNum,
		EmployeeID:    id,
		Name:          getValue(row, headerMap, "name", "employeename"),
		Department:    getValue(row, headerMap, "department", "dept"),
		Level:         getValue(row, headerMap, "level", "emplevel"),
		DOJ:           doj,
		DOJDate:       employee.ParseDOJ(doj),
		YearsSinceDOJ: parseFloatStrict(getValue(row, headerMap, "yearssincedoj", "yearsincejoining")),
		DOA:           doa,
		DOADate:       employee.ParseDOJ(doa),
		YearsSinceDOA: parseFloatStrict(getValue(row, headerMap, "yearssincedoa", "yearsincdoa")),
		EPFNumber:     getValue(row, headerMap, "epfnumber", "epfno"),
		UAN:           getValue(row, headerMap, "uan"),
		ESINumber:     getValue(row, headerMap, "esinumber", "esino"),
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
	PerformanceAllowance         float64
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

func parsePayrollRow(rowNum int, row []string, month, year int, headerMap map[string]int) (*StagingPayroll, string) {
	empID := getValue(row, headerMap, "employeeid", "empid", "id")
	if empID == "" {
		return nil, "empty Employee ID"
	}

	paidDays := parseFloat(getValue(row, headerMap, "paiddays", "days", "workingdays"))
	totalDays := float64(time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC).Day())
	lop := totalDays - paidDays
	if lop < 0 {
		lop = 0
	}

	r := &StagingPayroll{
		RowNum:                       rowNum,
		EmployeeID:                   empID,
		Month:                        month,
		Year:                         year,
		EmpNameSnapshot:              getValue(row, headerMap, "empnamesnapshot", "name", "employeename"),
		Leaves:                       0,
		LOP:                          lop,
		Days:                         paidDays,
		Basic:                        parseFloat(getValue(row, headerMap, "basic")),
		DA:                           parseFloat(getValue(row, headerMap, "da")),
		BasicDA:                      parseFloat(getValue(row, headerMap, "basicda")),
		HRA:                          parseFloat(getValue(row, headerMap, "hra")),
		Travel:                       parseFloat(getValue(row, headerMap, "travel")),
		ChildrenHostel:               parseFloat(getValue(row, headerMap, "childrenhostel")),
		ChildrenEducation:            parseFloat(getValue(row, headerMap, "childreneducation")),
		Mobile:                       parseFloat(getValue(row, headerMap, "mobile", "mobileallowance")),
		Conveyance:                   parseFloat(getValue(row, headerMap, "conveyance")),
		BranchAllowance:              parseFloat(getValue(row, headerMap, "branchallowance")),
		PerformanceAllowance:         parseFloat(getValue(row, headerMap, "performanceallowance")),
		SpecialAllowance:             parseFloat(getValue(row, headerMap, "specialallowance")),
		Training:                     parseFloat(getValue(row, headerMap, "training")),
		Incentive:                    parseFloat(getValue(row, headerMap, "incentive")),
		TotalEarWithIncen:            parseFloat(getValue(row, headerMap, "totalearwithincen", "totalearnings")),
		GrossSalWithoutIncentives:    0,
		PF:                           parseFloat(getValue(row, headerMap, "pf", "providentfund")),
		PF367:                        parseFloat(getValue(row, headerMap, "pf367")),
		PF833:                        parseFloat(getValue(row, headerMap, "pf833")),
		ESI075:                       parseFloat(getValue(row, headerMap, "esi075")),
		ESI325:                       parseFloat(getValue(row, headerMap, "esi325")),
		TDS:                          parseFloat(getValue(row, headerMap, "tds", "tax")),
		SalAdv:                       parseFloat(getValue(row, headerMap, "saladv", "salaryadvance")),
		AdditionalDeduction:          parseFloat(getValue(row, headerMap, "additionaldeduction")),
		Loan:                         parseFloat(getValue(row, headerMap, "loan")),
		CompanyStatutoryContribution: parseFloat(getValue(row, headerMap, "companystatutorycontribution")),
		ReimbMedical:                 parseFloat(getValue(row, headerMap, "reimbmedical", "medicalreimbursement")),
		ReimbLTA:                     parseFloat(getValue(row, headerMap, "reimblta", "ltareimbursement")),
		ZetaMealVoucher:              parseFloat(getValue(row, headerMap, "zetamealvoucher")),
		ReimbTravel:                  parseFloat(getValue(row, headerMap, "reimbtravel", "travelreimbursement")),
		TotalReimbursement:           parseFloat(getValue(row, headerMap, "totalreimbursement")),
		NetIncentive:                 parseFloat(getValue(row, headerMap, "netincentive")),
		TotalDeductions:              parseFloat(getValue(row, headerMap, "totaldeductions")),
		ActualFinalAmount:            parseFloat(getValue(row, headerMap, "actualfinalamount", "netpay", "netsalary")),
		LOPDeduction:                 parseFloat(getValue(row, headerMap, "lopdeduction")),
		EPFER:                        parseFloat(getValue(row, headerMap, "epfer")),
		GrossForPT:                   parseFloat(getValue(row, headerMap, "grossforpt")),
		Advance:                      parseFloat(getValue(row, headerMap, "advance")),
		Absents:                      parseFloat(getValue(row, headerMap, "absents", "absentdays")),
	}
	r.RowHash = PayrollRowHash(
		r.EmployeeID, r.Month, r.Year, r.EmpNameSnapshot,
		r.Leaves, r.LOP, r.Days, r.Absents,
		r.Basic, r.DA, r.BasicDA, r.HRA, r.Travel, r.ChildrenHostel, r.ChildrenEducation,
		r.Mobile, r.Conveyance, r.BranchAllowance, r.PerformanceAllowance, r.SpecialAllowance,
		r.Training, r.Incentive, r.TotalEarWithIncen, r.GrossSalWithoutIncentives, r.GrossForPT,
		r.PF, r.PF367, r.PF833, r.ESI075, r.ESI325, r.TDS, r.SalAdv, r.AdditionalDeduction,
		r.Loan, r.Advance, r.LOPDeduction, r.CompanyStatutoryContribution,
		r.ReimbMedical, r.ReimbLTA, r.ZetaMealVoucher, r.ReimbTravel, r.TotalReimbursement,
		r.EPFER, r.NetIncentive, r.TotalDeductions, r.ActualFinalAmount,
	)
	return r, ""
}
