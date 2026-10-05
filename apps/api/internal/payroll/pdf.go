package payroll

import (
	_ "embed"
	"fmt"
	"strings"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/breakline"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/epf"
)

//go:embed assets/nippon-logo.png
var logoBytes []byte

//go:embed assets/river-logo.png
var riverLogoBytes []byte

var (
	colorBlack       = &props.Color{Red: 0, Green: 0, Blue: 0}
	colorBeige       = &props.Color{Red: 234, Green: 232, Blue: 220}
	colorGray             = &props.Color{Red: 132, Green: 132, Blue: 132}
	colorBlue             = &props.Color{Red: 31, Green: 78, Blue: 140}
	colorFooter           = &props.Color{Red: 150, Green: 150, Blue: 150}
	colorRiverBlue        = &props.Color{Red: 26, Green: 130, Blue: 163}
	colorRiverYellow      = &props.Color{Red: 244, Green: 196, Blue: 48}
	colorRiverLightYellow = &props.Color{Red: 254, Green: 250, Blue: 224} // subtle light yellow for bg
	colorRiverLightBlue   = &props.Color{Red: 224, Green: 244, Blue: 249} // subtle light blue for headers
)

type lineItem struct {
	Label  string
	Amount string
}

// PayslipView holds the already-formatted display values for the FORM XIII layout.
type PayslipView struct {
	FormCode    string
	CompanyName string
	CompanyAddr string
	PeriodLine  string

	EmployeeID    string
	EmployeeName  string
	Designation   string
	Department    string
	AccountNumber string
	BankName      string
	IFSCCode      string

	PFNumber    string
	UAN         string
	ESICIP      string
	WorkingDays string
	PaidDays    string
	LOPDays     string
	Location    string

	Earnings   []lineItem
	Deductions []lineItem

	TotalEarnings   string
	TotalDeductions string
	NetPay          string

	LogoBytes      []byte
	LogoPercent    float64
	ThemePrimary   *props.Color
	ThemeSecondary *props.Color
	ThemeTertiary  *props.Color
}

// money renders a rupee amount as a plain integer (matching the reference payslip, no separators).
func money(v float64) string {
	return fmt.Sprintf("%.0f", v)
}

func moneyBlankZero(v float64) string {
	if v == 0 {
		return ""
	}
	return fmt.Sprintf("%.0f", v)
}

func formatDays(v float64) string {
	if v == 0 {
		return ""
	}
	if v == float64(int64(v)) {
		return fmt.Sprintf("%.0f", v)
	}
	return fmt.Sprintf("%.1f", v)
}

func newPayslipView(emp *employee.Employee, rec *Record, epfRec *epf.Record) PayslipView {
	name := rec.EmpNameSnapshot

	lop := rec.LOP
	if lop < 0 {
		lop = 0
	}
	paidDays := rec.Days
	if paidDays < 0 {
		paidDays = 0
	}

	totalDaysInMonth := daysInMonth(rec.Month, rec.Year)

	v := PayslipView{
		FormCode:    "FORM XIII [RULE 29(2)]",
		CompanyName: "Nippon Motor Corporation Pvt Ltd",
		CompanyAddr: "XIX/9C, Nippon Towers NH-544, HMT Junction Kalamassery",
		PeriodLine:  fmt.Sprintf("Pay slip for the month of %s %d", time.Month(rec.Month).String(), rec.Year),

		EmployeeID:   rec.EmployeeID,
		EmployeeName: name,

		PFNumber: "N/A",
		UAN:      "N/A",
		ESICIP:   "N/A",

		WorkingDays: formatDays(totalDaysInMonth),
		PaidDays:    formatDays(paidDays),
		LOPDays:     formatDays(lop),
	}

	if epfRec != nil {
		v.PFNumber = epf.FormatPFNumber(epfRec.EPFNumber)
		v.UAN = epf.FormatUAN(epfRec.UAN)
		v.ESICIP = epf.FormatESINumber(epfRec.ESINumber)
	}

	if emp != nil {
		v.Designation = emp.Designation
		v.Department = emp.Department
		v.AccountNumber = emp.AccountNumber
		v.BankName = emp.BankName
		v.IFSCCode = emp.IFSCCode
		v.Location = emp.Branch
	}

	if v.Department == "" && epfRec != nil {
		v.Department = epfRec.Department
	}

	v.Earnings = []lineItem{
		{"Basic+DA", money(rec.BasicDA)},
		{"HRA", money(rec.HRA)},
		{"Travel Allowance", money(rec.Travel)},
		{"Children Hostel Allowances", money(rec.ChildrenHostel)},
		{"Children Education Allowances", money(rec.ChildrenEducation)},
		{"Mobile Allowances", money(rec.Mobile)},
		{"Conveyance", money(rec.Conveyance)},
		{"Performance Allowance", money(rec.PerformanceAllowance)},
		{"Branch Allowances", money(rec.BranchAllowance)},
		{"Special Allowances", money(rec.SpecialAllowance)},
		{"Training Allowances", money(rec.Training)},
		{"Others", money(rec.Incentive)},
		{"Washing Allowances", money(rec.WashAllowance)},
		{"Fixed Incentive", money(rec.FixedIncentive)},
	}

	var filteredEarnings []lineItem
	for _, e := range v.Earnings {
		if e.Amount != "0" {
			filteredEarnings = append(filteredEarnings, e)
		}
	}
	v.Earnings = filteredEarnings

	v.Deductions = []lineItem{
		{"PF", money(rec.PF)},
		{"ESI", money(rec.ESI075)},
		{"TDS", money(rec.TDS)},
		{"Salary Advance", money(rec.SalAdv)},
		{"Additional Deduction", money(rec.AdditionalDeduction)},
		{"Loan", money(rec.Loan)},
	}

	var filteredDeductions []lineItem
	for _, d := range v.Deductions {
		if d.Amount != "0" {
			filteredDeductions = append(filteredDeductions, d)
		}
	}
	v.Deductions = filteredDeductions

	v.TotalEarnings = money(rec.TotalEarWithIncen)
	v.TotalDeductions = moneyBlankZero(rec.TotalDeductions)
	v.NetPay = moneyBlankZero(rec.ActualFinalAmount)

	if strings.HasPrefix(v.EmployeeID, "IMR") {
		v.CompanyName = "INCHEON MOBILITY LLP"
		v.CompanyAddr = "Building No. 13/C, NH 544, Chengamanad, Nedumbassery P O, Ernakulam - 683 585"
		v.LogoBytes = riverLogoBytes
		v.LogoPercent = 65
		v.ThemePrimary = colorRiverBlue
		v.ThemeSecondary = colorRiverLightYellow
		v.ThemeTertiary = colorRiverLightBlue
	} else {
		v.LogoBytes = logoBytes
		v.LogoPercent = 46
		v.ThemePrimary = colorBlue
		v.ThemeSecondary = colorBeige
		v.ThemeTertiary = colorGray
	}

	return v
}

func styleCell(bg *props.Color, bt border.Type) *props.Cell {
	return &props.Cell{
		BackgroundColor: bg,
		BorderType:      bt,
		BorderColor:     colorBlack,
		BorderThickness: 0.3,
	}
}

// GeneratePayslipPDF renders the FORM XIII payslip for an employee/record and returns the PDF bytes.
// epfRec may be nil when no EPF compliance record exists for the employee.
func GeneratePayslipPDF(emp *employee.Employee, rec *Record, epfRec *epf.Record) ([]byte, error) {
	v := newPayslipView(emp, rec, epfRec)

	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(10).
		WithLeftMargin(10).
		WithRightMargin(10).
		WithBottomMargin(10).
		Build()

	m := maroto.New(cfg)

	addHeaderBand(m, v)
	addIdentityBlock(m, v)
	addEarningsDeductions(m, v)
	addTotalsAndNet(m, v)
	addFooter(m)

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate payslip pdf: %w", err)
	}
	return doc.GetBytes(), nil
}

func addHeaderBand(m core.Maroto, v PayslipView) {
	// FORM code above the box.
	m.AddRow(6,
		col.New(12).Add(
			text.New(v.FormCode, props.Text{Size: 8, Align: align.Left, Top: 1}),
		),
	)

	// Spacer (top of box) to push the logo down toward the company name line.
	m.AddRow(7,
		col.New(12).WithStyle(styleCell(nil, border.Left|border.Top|border.Right)),
	)

	// Logo, centered horizontally on the page.
	m.AddRow(11,
		col.New(12).
			Add(image.NewFromBytes(v.LogoBytes, extension.Png, props.Rect{Percent: v.LogoPercent, Center: true})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	// Company name.
	m.AddRow(8,
		col.New(12).
			Add(text.New(v.CompanyName, props.Text{Size: 16, Style: fontstyle.Bold, Align: align.Center, Color: v.ThemePrimary})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	// Address.
	m.AddRow(5,
		col.New(12).
			Add(text.New(v.CompanyAddr, props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Center})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	// Period line (bottom rule separates from identity block).
	m.AddRow(6,
		col.New(12).
			Add(text.New(v.PeriodLine, props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Center})).
			WithStyle(styleCell(nil, border.Left|border.Right|border.Bottom)),
	)
}

func addIdentityBlock(m core.Maroto, v PayslipView) {
	type field struct{ label, value string }

	rawLeft := []field{
		{"Employee ID :", v.EmployeeID},
		{"Employee Name :", v.EmployeeName},
		{"Designation :", v.Designation},
		{"Department :", v.Department},
		{"Bank Account Number :", v.AccountNumber},
		{"Bank Name :", v.BankName},
		{"Bank IFSC Code :", v.IFSCCode},
	}

	rawRight := []field{
		{"PF Number :", v.PFNumber},
		{"UAN :", v.UAN},
		{"ESIC IP Number :", v.ESICIP},
		{"Working Days :", v.WorkingDays},
		{"Paid Days :", v.PaidDays},
		{"LOP Days :", v.LOPDays},
		{"Employee Location", v.Location},
	}

	var leftFields, rightFields []field
	for _, f := range rawLeft {
		v := strings.TrimSpace(f.value)
		if v != "" && v != "N/A" && v != "0" && v != "0.0" {
			leftFields = append(leftFields, f)
		}
	}
	for _, f := range rawRight {
		v := strings.TrimSpace(f.value)
		if v != "" && v != "N/A" && v != "0" && v != "0.0" {
			rightFields = append(rightFields, f)
		}
	}

	maxLen := len(leftFields)
	if len(rightFields) > maxLen {
		maxLen = len(rightFields)
	}

	type kv struct{ left, right [2]string }
	var rows []kv

	for i := 0; i < maxLen; i++ {
		var row kv
		if i < len(leftFields) {
			row.left = [2]string{leftFields[i].label, leftFields[i].value}
		}
		if i < len(rightFields) {
			row.right = [2]string{rightFields[i].label, rightFields[i].value}
		}
		rows = append(rows, row)
	}

	labelProp := props.Text{Size: 10, Align: align.Left, Top: 1.5, Left: 1, Bottom: 1.5}
	valueProp := props.Text{Size: 10, Align: align.Left, Top: 1.5, Left: 1, Bottom: 1.5, BreakLineStrategy: breakline.DashStrategy}

	for i, r := range rows {
		leftBorder := border.Left
		rightBorder := border.Right
		if i == len(rows)-1 {
			leftBorder |= border.Bottom
			rightBorder |= border.Bottom
		}

		m.AddRow(5,
			col.New(3).Add(text.New(r.left[0], labelProp)).WithStyle(styleCell(colorRiverLightYellow, leftBorder)),
			col.New(3).Add(text.New(r.left[1], valueProp)).WithStyle(styleCell(colorRiverLightYellow, border.None)),
			col.New(3).Add(text.New(r.right[0], labelProp)).WithStyle(styleCell(colorRiverLightYellow, border.None)),
			col.New(3).Add(text.New(r.right[1], valueProp)).WithStyle(styleCell(colorRiverLightYellow, rightBorder)),
		)
	}
}

func addEarningsDeductions(m core.Maroto, v PayslipView) {
	// Section header (dark gray band).
	headLabel := props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Left, Top: 1.5, Left: 1, Bottom: 1.5}
	headAmt := props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Right, Top: 1.5, Right: 1, Bottom: 1.5}

	m.AddAutoRow(
		col.New(4).Add(text.New("Earnings", headLabel)).WithStyle(styleCell(v.ThemeTertiary, border.Left|border.Top|border.Bottom)),
		col.New(2).Add(text.New("Amount", headAmt)).WithStyle(styleCell(v.ThemeTertiary, border.Top|border.Bottom|border.Right)),
		col.New(4).Add(text.New("Deduction", headLabel)).WithStyle(styleCell(v.ThemeTertiary, border.Top|border.Bottom)),
		col.New(2).Add(text.New("Amount", headAmt)).WithStyle(styleCell(v.ThemeTertiary, border.Top|border.Bottom|border.Right)),
	)

	descProp := props.Text{Size: 10, Align: align.Left, Top: 1, Left: 1, Bottom: 1}
	amtProp := props.Text{Size: 10, Align: align.Right, Top: 1, Right: 1, Bottom: 1}

	n := len(v.Earnings)
	if len(v.Deductions) > n {
		n = len(v.Deductions)
	}

	for i := 0; i < n; i++ {
		var eLabel, eAmt, dLabel, dAmt string
		if i < len(v.Earnings) {
			eLabel = v.Earnings[i].Label
			eAmt = v.Earnings[i].Amount
		}
		if i < len(v.Deductions) {
			dLabel = v.Deductions[i].Label
			dAmt = v.Deductions[i].Amount
		}

		m.AddAutoRow(
			col.New(4).Add(text.New(eLabel, descProp)).WithStyle(styleCell(nil, border.Left)),
			col.New(2).Add(text.New(eAmt, amtProp)).WithStyle(styleCell(nil, border.Right)),
			col.New(4).Add(text.New(dLabel, descProp)),
			col.New(2).Add(text.New(dAmt, amtProp)).WithStyle(styleCell(nil, border.Right)),
		)
	}
}

func addTotalsAndNet(m core.Maroto, v PayslipView) {
	totLabel := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Left, Top: 1.5, Left: 1, Bottom: 1.5}
	totAmt := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Right, Top: 1.5, Right: 1, Bottom: 1.5}

	m.AddAutoRow(
		col.New(4).Add(text.New("Total Earnings", totLabel)).WithStyle(styleCell(nil, border.Left|border.Top|border.Bottom)),
		col.New(2).Add(text.New(v.TotalEarnings, totAmt)).WithStyle(styleCell(nil, border.Top|border.Bottom|border.Right)),
		col.New(4).Add(text.New("Total Deductions", totLabel)).WithStyle(styleCell(nil, border.Top|border.Bottom)),
		col.New(2).Add(text.New(v.TotalDeductions, totAmt)).WithStyle(styleCell(nil, border.Top|border.Bottom|border.Right)),
	)

	netLabel := props.Text{Size: 10, Align: align.Left, Top: 2, Left: 1, Bottom: 2}
	netVal := props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Left, Top: 2, Bottom: 2}

	m.AddAutoRow(
		col.New(7).
			Add(text.New("Net Pay for the month (Total Earnings - Total Deductions) :", netLabel)).
			WithStyle(styleCell(nil, border.Left|border.Bottom)),
		col.New(5).
			Add(text.New(v.NetPay, netVal)).
			WithStyle(styleCell(nil, border.Right|border.Bottom)),
	)
}

func addFooter(m core.Maroto) {
	m.AddRow(10,
		col.New(12).Add(
			text.New("This is Computer generated pay slip does not require any signatures",
				props.Text{Size: 9, Style: fontstyle.Italic, Align: align.Center, Color: colorFooter, Top: 3}),
		),
	)
}

// GeneratePDF is kept for backward compatibility with callers that only have a payroll Record.
func GeneratePDF(record *Record) ([]byte, error) {
	return GeneratePayslipPDF(nil, record, nil)
}
