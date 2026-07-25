package payroll

import (
	_ "embed"
	"fmt"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
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

var (
	colorBlack  = &props.Color{Red: 0, Green: 0, Blue: 0}
	colorBeige  = &props.Color{Red: 234, Green: 232, Blue: 220}
	colorGray   = &props.Color{Red: 132, Green: 132, Blue: 132}
	colorBlue   = &props.Color{Red: 31, Green: 78, Blue: 140}
	colorFooter = &props.Color{Red: 150, Green: 150, Blue: 150}
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
}

// money renders a rupee amount as a plain integer (matching the reference payslip, no separators).
func money(v float64) string {
	return fmt.Sprintf("%.0f", v)
}

func formatDays(v float64) string {
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
	paidDays := rec.Days - lop
	if paidDays < 0 {
		paidDays = 0
	}

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

		WorkingDays: formatDays(rec.Days),
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
		{"Washing Allowances", money(rec.WashAllowance)},
		{"Branch Allowances", money(rec.BranchAllowance)},
		{"Special Allowances", money(rec.SpecialAllowance)},
		{"Training Allowances", money(rec.Training)},
		{"Others", money(rec.Incentive)},
	}

	v.Deductions = []lineItem{
		{"PF", money(rec.PF)},
		{"ESI", money(rec.ESI075)},
		{"TDS", money(rec.TDS)},
		{"Salary Advance", money(rec.SalAdv)},
		{"Additional Deduction", money(rec.AdditionalDeduction)},
		{"Loan", money(rec.Loan)},
	}

	v.TotalEarnings = money(rec.TotalEarWithIncen)
	v.TotalDeductions = money(rec.TotalDeductions)
	v.NetPay = money(rec.ActualFinalAmount)

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
			Add(image.NewFromBytes(logoBytes, extension.Png, props.Rect{Percent: 46, Center: true})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	// Company name.
	m.AddRow(8,
		col.New(12).
			Add(text.New(v.CompanyName, props.Text{Size: 16, Style: fontstyle.Bold, Align: align.Center, Color: colorBlue})).
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
	type kv struct{ left, right [2]string }
	rows := []kv{
		{[2]string{"Employee ID :", v.EmployeeID}, [2]string{"PF Number :", v.PFNumber}},
		{[2]string{"Employee Name :", v.EmployeeName}, [2]string{"UAN :", v.UAN}},
		{[2]string{"Designation :", v.Designation}, [2]string{"ESIC IP Number :", v.ESICIP}},
		{[2]string{"Department :", v.Department}, [2]string{"Working Days :", v.WorkingDays}},
		{[2]string{"Bank Account Number :", v.AccountNumber}, [2]string{"Paid Days :", v.PaidDays}},
		{[2]string{"Bank Name :", v.BankName}, [2]string{"LOP Days :", v.LOPDays}},
		{[2]string{"Bank IFSC Code :", v.IFSCCode}, [2]string{"Employee Location", v.Location}},
	}

	labelProp := props.Text{Size: 9, Align: align.Left, Top: 1, Left: 1, Bottom: 1}
	valueProp := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Left, Top: 1, Left: 1, Bottom: 1}

	for i, r := range rows {
		leftBorder := border.Left
		rightBorder := border.Right
		if i == len(rows)-1 {
			leftBorder |= border.Bottom
			rightBorder |= border.Bottom
		}

		bottom := border.None
		if i == len(rows)-1 {
			bottom = border.Bottom
		}

		m.AddAutoRow(
			col.New(3).
				Add(text.New(r.left[0], labelProp)).
				WithStyle(styleCell(colorBeige, leftBorder)),
			col.New(3).
				Add(text.New(r.left[1], valueProp)).
				WithStyle(styleCell(colorBeige, bottom)),
			col.New(3).
				Add(text.New(r.right[0], labelProp)).
				WithStyle(styleCell(colorBeige, bottom)),
			col.New(3).
				Add(text.New(r.right[1], valueProp)).
				WithStyle(styleCell(colorBeige, rightBorder)),
		)
	}
}

func addEarningsDeductions(m core.Maroto, v PayslipView) {
	// Section header (dark gray band).
	headLabel := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Left, Top: 1, Left: 1}
	headAmt := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Right, Top: 1, Right: 1}

	m.AddRow(7,
		col.New(4).Add(text.New("Earnings", headLabel)).WithStyle(styleCell(colorGray, border.Left|border.Top|border.Bottom)),
		col.New(2).Add(text.New("Amount", headAmt)).WithStyle(styleCell(colorGray, border.Top|border.Bottom|border.Right)),
		col.New(4).Add(text.New("Deduction", headLabel)).WithStyle(styleCell(colorGray, border.Top|border.Bottom)),
		col.New(2).Add(text.New("Amount", headAmt)).WithStyle(styleCell(colorGray, border.Top|border.Bottom|border.Right)),
	)

	descProp := props.Text{Size: 9, Align: align.Left, Top: 0.5, Left: 1, Bottom: 0.5}
	amtProp := props.Text{Size: 9, Align: align.Right, Top: 0.5, Right: 1, Bottom: 0.5}

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
	totLabel := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Left, Top: 1, Left: 1}
	totAmt := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Right, Top: 1, Right: 1}

	m.AddRow(6.5,
		col.New(4).Add(text.New("Total Earnings", totLabel)).WithStyle(styleCell(nil, border.Left|border.Top|border.Bottom)),
		col.New(2).Add(text.New(v.TotalEarnings, totAmt)).WithStyle(styleCell(nil, border.Top|border.Bottom|border.Right)),
		col.New(4).Add(text.New("Total Deductions", totLabel)).WithStyle(styleCell(nil, border.Top|border.Bottom)),
		col.New(2).Add(text.New(v.TotalDeductions, totAmt)).WithStyle(styleCell(nil, border.Top|border.Bottom|border.Right)),
	)

	netLabel := props.Text{Size: 9, Align: align.Left, Top: 1, Left: 1}
	netVal := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Left, Top: 1}

	m.AddRow(7,
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
