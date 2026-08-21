package healthcard

import (
	"bytes"
	"fmt"
	"time"
	_ "embed"

	"github.com/phpdave11/gofpdf"
	"github.com/nippon-toyota/hrms/internal/employee"
)

//go:embed assets/front_template.jpg
var frontTemplate []byte

//go:embed assets/back_template.jpg
var backTemplate []byte

func GenerateHealthCardPDF(emp *employee.Employee) ([]byte, error) {
	// A4 Portrait is 210 x 297 mm
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

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

	// Load images
	opt := gofpdf.ImageOptions{ImageType: "JPG"}
	pdf.RegisterImageOptionsReader("front", opt, bytes.NewReader(frontTemplate))
	pdf.RegisterImageOptionsReader("back", opt, bytes.NewReader(backTemplate))

	// Card sizes scaled up by ~1.5x for better legibility
	cardW := 130.0
	cardH := 82.0
	
	// Center the cards on A4 Portrait (210 width -> (210 - 130)/2 = 40 padding)
	startX := (210.0 - cardW) / 2.0
	
	// Start at Top
	c1X := startX
	c1Y := 40.0 // Adjusted for taller cards

	// ==========================================
	// CARD 1 (FRONT)
	// ==========================================

	// Draw Front Template
	pdf.ImageOptions("front", c1X, c1Y, cardW, cardH, false, opt, 0, "")

	// "ICICILOMBARD" Subheader
	pdf.SetFont("Arial", "B", 7.5)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(c1X+6, c1Y+18.0)
	pdf.CellFormat(cardW, 6, "ICICILOMBARD", "", 0, "L", false, 0, "")

	// Fields
	fieldsY := c1Y + 23.0
	lineHeight := 4.2

	drawField := func(label, val string, y float64) {
		pdf.SetFont("Arial", "B", 7.5)
		pdf.SetXY(c1X+6, y)
		pdf.CellFormat(30, lineHeight, label, "", 0, "L", false, 0, "")
		
		pdf.SetXY(c1X+36, y)
		pdf.CellFormat(3, lineHeight, ":", "", 0, "L", false, 0, "")
		
		pdf.SetFont("Arial", "", 7.5)
		pdf.SetXY(c1X+40, y)
		pdf.CellFormat(60, lineHeight, val, "", 0, "L", false, 0, "")
	}

	cardValidUpTo := emp.HealthCardValidUpto
	if cardValidUpTo == "" {
		cardValidUpTo = validUpTo
	}

	drawField("Name", emp.Name, fieldsY)
	drawField("Policy No", emp.HealthPolicyNo, fieldsY+lineHeight)
	drawField("Policy Type", "Base Policy", fieldsY+lineHeight*2)
	drawField("Card No", emp.HealthCardNo, fieldsY+lineHeight*3)
	drawField("Relationship", "Self", fieldsY+lineHeight*4)
	drawField("Emp. ID.", emp.EmployeeID, fieldsY+lineHeight*5)
	drawField("Age", ageStr, fieldsY+lineHeight*6)
	drawField("Valid Up to", cardValidUpTo, fieldsY+lineHeight*7)

	// ==========================================
	// CARD 2 (BACK)
	// ==========================================
	c2X := startX
	c2Y := c1Y + cardH + 25.0 // 25mm gap

	// Draw Back Template
	pdf.ImageOptions("back", c2X, c2Y, cardW, cardH, false, opt, 0, "")

	// Text Content
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 4.5) // reduced font slightly to fit perfectly
	txtY := c2Y + 6.0
	lh := 2.8

	drawTextLine := func(txt string, bold bool, isRed bool) {
		if bold {
			pdf.SetFont("Arial", "B", 4.5)
		} else {
			pdf.SetFont("Arial", "", 4.5)
		}
		if isRed {
			pdf.SetTextColor(180, 20, 20)
		} else {
			pdf.SetTextColor(0, 0, 0)
		}
		pdf.SetXY(c2X+4.5, txtY)
		pdf.CellFormat(cardW-9, lh, txt, "", 0, "L", false, 0, "")
		txtY += lh
	}

	drawTextLine("*Health Assistance Helpline: 040-6674205 (8 am to 8 pm Monday to Saturday except public holidays) for services:", false, false)
	drawTextLine("Second opinion, doctor appointment, facilitating hospitalization, post hospitalization care.", false, false)
	drawTextLine("• For services like second opinion, doctor appointment, facilitating hospitalization, post hospitalization care, call our", false, false)
	drawTextLine("  Health Assistance Helpline at 040-6674205.", false, false)
	drawTextLine("• This card is not transferable and is valid at network hospitals only.", false, false)
	drawTextLine("• Use of this card is governed by the policy terms and conditions.", false, false)
	drawTextLine("• Cashless access to the network provider can only be obtained when accompanied with an authorization letter", false, false)
	drawTextLine("  issued by ICICI Lombard Health Care", false, false)
	drawTextLine("• In case of non photo cards, to prove your identity, please produce this card along with any photo id card", false, false)
	drawTextLine("  issued by Government.", false, false)
	drawTextLine("• Valid up to policy expiry date or cancellation date whichever is earlier.", false, false)
	
	txtY += 1.5

	drawTextLine("ICICI Lombard Health Care Pays: Hospitalisation bills for admissible claim, subject to prior approval. In case of", true, true)
	drawTextLine("emergency, approval can be taken within 24 hours of hospitalization.", true, true)
	drawTextLine("Insured Pays: All non-medical hospitalization bills and expenses not covered under the policy.", true, true)
	drawTextLine("Mailing Address: ICICI Lombard Healthcare, 4th, 5th and 6th floors, Varun Towers, Opp. Hyderabad Public", true, true)
	drawTextLine("School, Begumpet, Hyderabad, Telangana - 500 016.", true, true)
	drawTextLine("Registered Address: ICICI Lombard House, 414, P. Balu Marg, Off Veer Savarkar Road, Near Siddhi Vinayak Temple,", true, true)
	drawTextLine("Prabhadevi, Mumbai 400 025.", true, true)

	// Bottom contacts
	txtY = c2Y + cardH - 18.0
	pdf.SetFont("Arial", "B", 4.5)
	pdf.SetTextColor(0, 0, 0)
	
	pdf.SetXY(c2X+4.5, txtY)
	pdf.CellFormat(45, lh, "Fax Number: (040) 6698 9150/51", "", 0, "L", false, 0, "")
	pdf.SetXY(c2X+cardW-45, txtY)
	pdf.CellFormat(45, lh, "Toll Free Number: 1800 2666", "", 0, "L", false, 0, "")

	pdf.SetXY(c2X+4.5, txtY+lh)
	pdf.CellFormat(45, lh, "Email: ihealthcare@icicilombard.com", "", 0, "L", false, 0, "")
	pdf.SetXY(c2X+cardW-45, txtY+lh)
	pdf.CellFormat(45, lh, "Visit us at: www.icicilombard.com", "", 0, "L", false, 0, "")

	txtY += lh + 2.5
	pdf.SetXY(c2X+4.5, txtY)
	pdf.CellFormat(120, lh, "Insurance is the subject matter of the solicitation. IRDA Reg No.: 115. CIN: L67200MH2000PLC129408", "", 0, "L", false, 0, "")
	pdf.SetXY(c2X+4.5, txtY+lh)
	pdf.CellFormat(120, lh, "*The mentioned covers are add-ons by paying additional premium and available only if opted by the policyholders.", "", 0, "L", false, 0, "")

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate health card pdf: %w", err)
	}

	return buf.Bytes(), nil
}
