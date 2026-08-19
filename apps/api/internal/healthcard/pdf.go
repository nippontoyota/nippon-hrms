package healthcard

import (
	"fmt"
	"time"

	"github.com/johnfercher/maroto/v2"
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/config"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"github.com/nippon-toyota/hrms/internal/employee"
)

func GenerateHealthCardPDF(emp *employee.Employee) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(15).
		WithLeftMargin(10).
		WithRightMargin(10).
		Build()

	m := maroto.New(cfg)

	// Brand Colors
	orange := &props.Color{Red: 226, Green: 91, Blue: 28}
	white := &props.Color{Red: 255, Green: 255, Blue: 255}
	darkRed := &props.Color{Red: 180, Green: 20, Blue: 20}
	black := &props.Color{Red: 0, Green: 0, Blue: 0}
	borderColor := orange

	// Calculate Age
	ageStr := ""
	if emp.Birthday != "" {
		var dob time.Time
		layouts := []string{"2006-01-02", "02-01-2006", "02/01/2006"}
		for _, layout := range layouts {
			if parsed, e := time.Parse(layout, emp.Birthday); e == nil {
				dob = parsed
				break
			}
		}
		if !dob.IsZero() {
			age := int(time.Since(dob).Hours() / 24 / 365)
			ageStr = fmt.Sprintf("%d", age)
		}
	}
	validUpTo := time.Now().AddDate(1, 0, 0).Format("2006-01-02")

	// Helper for fields
	addField := func(label, value string) {
		m.AddRow(5,
			col.New(3),
			col.New(2).Add(
				text.New(label, props.Text{Size: 8, Style: fontstyle.Bold, Color: black, Left: 2}),
			).WithStyle(&props.Cell{BorderType: border.Left, BorderColor: borderColor, BorderThickness: 0.5}),
			col.New(4).Add(
				text.New(": "+value, props.Text{Size: 8, Color: black, Left: 1}),
			).WithStyle(&props.Cell{BorderType: border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
			col.New(3),
		)
	}

	// ==========================================
	// FRONT OF CARD
	// ==========================================

	// Card Top Bar
	m.AddRow(12,
		col.New(3),
		col.New(6).Add(
			text.New("ICICI Lombard Health Care Card", props.Text{
				Top:   3,
				Size:  10,
				Style: fontstyle.Bold,
				Align: align.Left,
				Color: white,
				Left:  2,
			}),
		).WithStyle(&props.Cell{BackgroundColor: orange, BorderType: border.Top | border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3),
	)

	// Spacer row
	m.AddRow(4, col.New(3), col.New(6).WithStyle(&props.Cell{BorderType: border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}), col.New(3))

	// Fields
	addField("Name", emp.Name)
	addField("Policy No", "")
	addField("Policy Type", "Base Policy")
	addField("Card No", "")
	addField("Relationship", "Self")
	addField("Emp. ID.", emp.EmployeeID)
	addField("Age", ageStr)
	addField("Valid Up to", validUpTo)

	// Spacer row
	m.AddRow(4, col.New(3), col.New(6).WithStyle(&props.Cell{BorderType: border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}), col.New(3))

	// Card Bottom Bar
	m.AddRow(10,
		col.New(3),
		col.New(3).Add(
			text.New("Nibhaye Vaade", props.Text{Top: 2.5, Size: 8, Style: fontstyle.Italic, Align: align.Left, Color: white, Left: 2}),
		).WithStyle(&props.Cell{BackgroundColor: orange, BorderType: border.Bottom | border.Left, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3).Add(
			text.New("Toll Free No.: 1800 2666", props.Text{Top: 2.5, Size: 8, Style: fontstyle.Bold, Align: align.Right, Color: white, Right: 2}),
		).WithStyle(&props.Cell{BackgroundColor: orange, BorderType: border.Bottom | border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3),
	)

	// Add gap between Front and Back of the card (for cutting out)
	m.AddRow(15, col.New(12).Add(
		text.New("- - - - - - - - - - - - - - - - - - - - - - FOLD HERE - - - - - - - - - - - - - - - - - - - - - -", props.Text{
			Size:  8,
			Align: align.Center,
			Color: &props.Color{Red: 150, Green: 150, Blue: 150},
		}),
	))

	// ==========================================
	// BACK OF CARD
	// ==========================================
	
	addBackTextRow := func(txt string, height float64, size float64, clr *props.Color, style fontstyle.Type, top float64) {
		m.AddRow(height,
			col.New(3),
			col.New(6).Add(
				text.New(txt, props.Text{Size: size, Left: 2, Right: 2, Color: clr, Style: style, Top: top}),
			).WithStyle(&props.Cell{BorderType: border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
			col.New(3),
		)
	}

	// Back Top Bar
	m.AddRow(6,
		col.New(3),
		col.New(6).WithStyle(&props.Cell{BackgroundColor: orange, BorderType: border.Top | border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3),
	)

	// Terms text
	addBackTextRow("*Health Assistance Helpline: 040-6674205 (8 am to 8 pm Monday to Saturday except public holidays) for services:", 6, 6, black, fontstyle.Normal, 2)
	addBackTextRow("Second opinion, doctor appointment, facilitating hospitalization, post hospitalization care.", 4, 6, black, fontstyle.Normal, 0)
	addBackTextRow("• For services like second opinion, doctor appointment, facilitating hospitalization, call our", 4, 6, black, fontstyle.Normal, 0)
	addBackTextRow("  Health Assistance Helpline at 040-6674205.", 4, 6, black, fontstyle.Normal, 0)
	addBackTextRow("• This card is not transferable and is valid at network hospitals only.", 4, 6, black, fontstyle.Normal, 0)
	addBackTextRow("• Use of this card is governed by the policy terms and conditions.", 4, 6, black, fontstyle.Normal, 0)
	addBackTextRow("• Cashless access to the network provider can only be obtained when accompanied with an authorization letter.", 6, 6, black, fontstyle.Normal, 0)
	addBackTextRow("• Valid up to policy expiry date or cancellation date whichever is earlier.", 4, 6, black, fontstyle.Normal, 0)

	addBackTextRow("ICICI Lombard Health Care Pays: Hospitalisation bills for admissible claim, subject to prior approval.", 6, 6, darkRed, fontstyle.Bold, 2)
	addBackTextRow("Insured Pays: All non-medical hospitalization bills and expenses not covered under the policy.", 4, 6, darkRed, fontstyle.Bold, 0)
	addBackTextRow("Mailing Address: ICICI Lombard Healthcare, 4th, 5th and 6th floors, Varun Towers, Opp. Hyderabad Public School,", 6, 6, darkRed, fontstyle.Bold, 2)
	addBackTextRow("Begumpet, Hyderabad, Telangana - 500 016.", 4, 6, darkRed, fontstyle.Bold, 0)
	addBackTextRow("Registered Address: ICICI Lombard House, 414, P. Balu Marg, Off Veer Savarkar Road, Prabhadevi, Mumbai 400 025.", 6, 6, darkRed, fontstyle.Bold, 2)

	m.AddRow(4, col.New(3), col.New(6).WithStyle(&props.Cell{BorderType: border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}), col.New(3))

	// Contact details row at bottom of back
	m.AddRow(8,
		col.New(3),
		col.New(3).Add(
			text.New("Fax Number: (040) 6698 9150/51", props.Text{Size: 6, Left: 2, Style: fontstyle.Bold}),
			text.New("Email: ihealthcare@icicilombard.com", props.Text{Size: 6, Left: 2, Top: 4, Style: fontstyle.Bold}),
		).WithStyle(&props.Cell{BorderType: border.Left, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3).Add(
			text.New("Toll Free Number: 1800 2666", props.Text{Size: 6, Right: 2, Align: align.Right, Style: fontstyle.Bold}),
			text.New("Visit us at: www.icicilombard.com", props.Text{Size: 6, Right: 2, Top: 4, Align: align.Right, Style: fontstyle.Bold}),
		).WithStyle(&props.Cell{BorderType: border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3),
	)

	// Spacer row
	m.AddRow(2, col.New(3), col.New(6).WithStyle(&props.Cell{BorderType: border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}), col.New(3))

	// Back Bottom border
	m.AddRow(4,
		col.New(3),
		col.New(6).WithStyle(&props.Cell{BackgroundColor: orange, BorderType: border.Bottom | border.Left | border.Right, BorderColor: borderColor, BorderThickness: 0.5}),
		col.New(3),
	)

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate health card pdf: %w", err)
	}

	return doc.GetBytes(), nil
}
