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
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"github.com/nippon-toyota/hrms/internal/employee"
)

// GenerateHealthCardPDF creates a simple PDF representing the health card.
func GenerateHealthCardPDF(emp *employee.Employee) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(20).
		WithLeftMargin(20).
		WithRightMargin(20).
		Build()

	m := maroto.New(cfg)

	// Brand Colors
	orange := &props.Color{Red: 226, Green: 91, Blue: 28}
	white := &props.Color{Red: 255, Green: 255, Blue: 255}
	darkRed := &props.Color{Red: 180, Green: 20, Blue: 20}
	black := &props.Color{Red: 0, Green: 0, Blue: 0}

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

	// ==========================================
	// FRONT OF CARD
	// ==========================================

	// Card Top Bar
	m.AddRow(12,
		col.New(12).Add(
			text.New("ICICI Lombard Health Care Card", props.Text{
				Top:   3,
				Size:  14,
				Style: fontstyle.Bold,
				Align: align.Left,
				Color: white,
				Left:  5,
			}),
		),
	).WithStyle(&props.Cell{BackgroundColor: orange})

	m.AddRow(5, col.New(12)) // Spacing

	// Add fields in a compact block
	addCardField(m, "Name", emp.Name, black)
	addCardField(m, "Policy No", "", black)
	addCardField(m, "Policy Type", "Base Policy", black)
	addCardField(m, "Card No", "", black)
	addCardField(m, "Relationship", "Self", black)
	addCardField(m, "Emp. ID.", emp.EmployeeID, black)
	addCardField(m, "Age", ageStr, black)
	addCardField(m, "Valid Up to", validUpTo, black)

	m.AddRow(5, col.New(12)) // Spacing

	// Card Bottom Bar
	m.AddRow(12,
		col.New(6).Add(
			text.New("Nibhaye Vaade", props.Text{
				Top:   3.5,
				Size:  10,
				Style: fontstyle.Italic,
				Align: align.Left,
				Color: white,
				Left:  5,
			}),
		),
		col.New(6).Add(
			text.New("Toll Free No.: 1800 2666", props.Text{
				Top:   3.5,
				Size:  11,
				Style: fontstyle.Bold,
				Align: align.Right,
				Color: white,
				Right: 5,
			}),
		),
	).WithStyle(&props.Cell{BackgroundColor: orange})

	// Add gap between Front and Back of the card (for cutting out)
	m.AddRow(15, col.New(12).Add(
		text.New("- - - - - - - - - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - - - - - - - - -", props.Text{
			Size:  8,
			Align: align.Center,
			Color: &props.Color{Red: 150, Green: 150, Blue: 150},
		}),
	))

	// ==========================================
	// BACK OF CARD
	// ==========================================

	// Back Top Bar
	m.AddRow(6, col.New(12)).WithStyle(&props.Cell{BackgroundColor: orange})

	// Terms text
	m.AddRow(10, col.New(12).Add(
		text.New("*Health Assistance Helpline: 040-6674205 (8 am to 8 pm Monday to Saturday except public holidays) for services:", props.Text{Size: 8, Top: 4, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("Second opinion, doctor appointment, facilitating hospitalization, post hospitalization care.", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("• For services like second opinion, doctor appointment, facilitating hospitalization, call our", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("  Health Assistance Helpline at 040-6674205.", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("• This card is not transferable and is valid at network hospitals only.", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("• Use of this card is governed by the policy terms and conditions.", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(8, col.New(12).Add(
		text.New("• Cashless access to the network provider can only be obtained when accompanied with an authorization letter.", props.Text{Size: 8, Left: 2}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("• Valid up to policy expiry date or cancellation date whichever is earlier.", props.Text{Size: 8, Left: 2}),
	))

	m.AddRow(8, col.New(12).Add(
		text.New("ICICI Lombard Health Care Pays: Hospitalisation bills for admissible claim, subject to prior approval.", props.Text{Size: 8, Style: fontstyle.Bold, Color: darkRed, Left: 2, Top: 3}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("Insured Pays: All non-medical hospitalization bills and expenses not covered under the policy.", props.Text{Size: 8, Style: fontstyle.Bold, Color: darkRed, Left: 2}),
	))
	m.AddRow(8, col.New(12).Add(
		text.New("Mailing Address: ICICI Lombard Healthcare, 4th, 5th and 6th floors, Varun Towers, Opp. Hyderabad Public School,", props.Text{Size: 8, Style: fontstyle.Bold, Color: darkRed, Left: 2, Top: 3}),
	))
	m.AddRow(5, col.New(12).Add(
		text.New("Begumpet, Hyderabad, Telangana - 500 016.", props.Text{Size: 8, Style: fontstyle.Bold, Color: darkRed, Left: 2}),
	))
	m.AddRow(8, col.New(12).Add(
		text.New("Registered Address: ICICI Lombard House, 414, P. Balu Marg, Off Veer Savarkar Road, Prabhadevi, Mumbai 400 025.", props.Text{Size: 8, Style: fontstyle.Bold, Color: darkRed, Left: 2, Top: 3}),
	))
	
	m.AddRow(5, col.New(12)) // Spacing

	// Contact details row at bottom of back
	m.AddRow(10,
		col.New(6).Add(
			text.New("Fax Number: (040) 6698 9150/51", props.Text{Size: 8, Left: 2, Style: fontstyle.Bold}),
			text.New("Email: ihealthcare@icicilombard.com", props.Text{Size: 8, Left: 2, Top: 5, Style: fontstyle.Bold}),
		),
		col.New(6).Add(
			text.New("Toll Free Number: 1800 2666", props.Text{Size: 8, Right: 2, Align: align.Right, Style: fontstyle.Bold}),
			text.New("Visit us at: www.icicilombard.com", props.Text{Size: 8, Right: 2, Top: 5, Align: align.Right, Style: fontstyle.Bold}),
		),
	)

	// Back Bottom border
	m.AddRow(4, col.New(12)).WithStyle(&props.Cell{BackgroundColor: orange})

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate health card pdf: %w", err)
	}

	return doc.GetBytes(), nil
}

func addCardField(m core.Maroto, label, value string, txtColor *props.Color) {
	m.AddRow(6,
		col.New(3).Add(
			text.New(label, props.Text{
				Size:  10,
				Style: fontstyle.Bold,
				Color: txtColor,
				Left:  5,
			}),
		),
		col.New(1).Add(
			text.New(":", props.Text{
				Size:  10,
				Style: fontstyle.Bold,
				Color: txtColor,
				Align: align.Center,
			}),
		),
		col.New(8).Add(
			text.New(value, props.Text{
				Size:  10,
				Color: txtColor,
				Left:  2,
			}),
		),
	)
}
