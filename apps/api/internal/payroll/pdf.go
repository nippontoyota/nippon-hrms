package payroll

import (
	"fmt"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

func GeneratePDF(record *Record) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(15).
		WithLeftMargin(10).
		WithRightMargin(10).
		Build()

	m := maroto.New(cfg)

	m.AddRows(
		row.New(20).Add(
			col.New(12).Add(
				text.New("Nippon Toyota HRMS", props.Text{
					Top:   5,
					Style: fontstyle.Bold,
					Align: align.Center,
					Size:  16,
				}),
			),
		),
		row.New(10).Add(
			col.New(12).Add(
				text.New(fmt.Sprintf("Payslip for %s %d", time.Month(record.Month).String(), record.Year), props.Text{
					Align: align.Center,
					Size:  12,
				}),
			),
		),
	)

	m.AddRows(
		row.New(10),
		row.New(10).Add(
			col.New(6).Add(
				text.New(fmt.Sprintf("Employee ID: %s", record.EmployeeID), props.Text{Style: fontstyle.Bold}),
			),
			col.New(6).Add(
				text.New(fmt.Sprintf("Generated: %s", time.Now().Format("02 Jan 2006")), props.Text{Align: align.Right}),
			),
		),
		row.New(5),
	)

	headerProp := props.Text{Style: fontstyle.Bold, Size: 10}
	valProp := props.Text{Size: 10, Align: align.Right}

	m.AddRows(

		row.New(10).Add(
			col.New(6).Add(text.New("Description", headerProp)),
			col.New(6).Add(text.New("Amount (INR)", props.Text{Style: fontstyle.Bold, Size: 10, Align: align.Right})),
		),

		row.New(10).Add(
			col.New(6).Add(text.New("Basic Salary", props.Text{Size: 10})),
			col.New(6).Add(text.New(fmt.Sprintf("%.2f", record.BasicSalary), valProp)),
		),

		row.New(10).Add(
			col.New(6).Add(text.New("Allowances", props.Text{Size: 10})),
			col.New(6).Add(text.New(fmt.Sprintf("%.2f", record.Allowances), valProp)),
		),

		row.New(10).Add(
			col.New(6).Add(text.New("Deductions", props.Text{Size: 10})),
			col.New(6).Add(text.New(fmt.Sprintf("- %.2f", record.Deductions), props.Text{Size: 10, Align: align.Right, Color: &props.Color{Red: 200, Green: 0, Blue: 0}})),
		),
		row.New(5),
	)

	m.AddRows(
		row.New(15).Add(
			col.New(6).Add(text.New("Net Payable", props.Text{Style: fontstyle.Bold, Size: 12})),
			col.New(6).Add(text.New(fmt.Sprintf("₹ %.2f", record.NetPay), props.Text{Style: fontstyle.Bold, Size: 12, Align: align.Right})),
		),
	)

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate pdf: %w", err)
	}

	return doc.GetBytes(), nil
}

func UploadToStorage(pdfBytes []byte, filename string) (string, error) {

	url := fmt.Sprintf("https://stub.supabase.co/storage/v1/object/public/payslips/%s", filename)
	return url, nil
}
