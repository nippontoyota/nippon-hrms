package healthcard

import (
	"bytes"
	"fmt"
	"time"

	"github.com/phpdave11/gofpdf"
	"github.com/nippon-toyota/hrms/internal/employee"
)

func GenerateHealthCardPDF(emp *employee.Employee) ([]byte, error) {
	// A4 Landscape is 297 x 210 mm
	pdf := gofpdf.New("L", "mm", "A4", "")
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

	// Colors
	pdf.SetDrawColor(226, 91, 28)
	pdf.SetFillColor(226, 91, 28) // Orange
	
	// Card sizes (Credit card is 85.6 x 54, but let's make it 95 x 60 for better text fit)
	cardW := 95.0
	cardH := 60.0
	
	// Center the two cards on A4 (297 width -> (297 - 190)/2 = 53.5 padding)
	startX := 50.0
	startY := 75.0

	// ==========================================
	// CARD 1 (FRONT)
	// ==========================================
	c1X := startX
	c1Y := startY

	// Card 1 Border
	pdf.SetLineWidth(0.3)
	pdf.RoundedRect(c1X, c1Y, cardW, cardH, 3, "1234", "D")

	// Card 1 Header (Orange)
	pdf.SetFillColor(226, 91, 28)
	// We can't clip rounded corners easily without paths, so we draw a rect and overlay
	pdf.Rect(c1X, c1Y, cardW, 8, "F")
	
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(c1X+2, c1Y+2)
	pdf.CellFormat(cardW, 4, "ICICI Lombard Health Care Card", "", 0, "L", false, 0, "")

	// "ICICILOMBARD" Subheader
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetXY(c1X+2, c1Y+10)
	pdf.CellFormat(cardW, 4, "ICICILOMBARD", "", 0, "L", false, 0, "")

	// Fields
	pdf.SetFont("Arial", "B", 6)
	fieldsY := c1Y + 16
	lineHeight := 4.0

	drawField := func(label, val string, y float64) {
		pdf.SetFont("Arial", "B", 6)
		pdf.SetXY(c1X+2, y)
		pdf.CellFormat(20, lineHeight, label, "", 0, "L", false, 0, "")
		
		pdf.SetXY(c1X+23, y)
		pdf.CellFormat(2, lineHeight, ":", "", 0, "L", false, 0, "")
		
		pdf.SetFont("Arial", "", 6)
		pdf.SetXY(c1X+26, y)
		pdf.CellFormat(40, lineHeight, val, "", 0, "L", false, 0, "")
	}

	drawField("Name", emp.Name, fieldsY)
	drawField("Policy No", "", fieldsY+lineHeight)
	drawField("Policy Type", "Base Policy", fieldsY+lineHeight*2)
	drawField("Card No", "", fieldsY+lineHeight*3)
	drawField("Relationship", "Self", fieldsY+lineHeight*4)
	drawField("Emp. ID.", emp.EmployeeID, fieldsY+lineHeight*5)
	drawField("Age", ageStr, fieldsY+lineHeight*6)
	drawField("Valid Up to", validUpTo, fieldsY+lineHeight*7)

	// Card 1 Footer (Orange)
	pdf.SetFillColor(226, 91, 28)
	pdf.Rect(c1X, c1Y+cardH-8, cardW, 8, "F")
	
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetXY(c1X+2, c1Y+cardH-6)
	pdf.CellFormat(40, 4, "Nibhaye Vaade", "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "B", 8)
	pdf.SetXY(c1X+cardW-42, c1Y+cardH-6)
	pdf.CellFormat(40, 4, "Toll Free No.: 1800 2666", "", 0, "R", false, 0, "")

	// ==========================================
	// CARD 2 (BACK)
	// ==========================================
	c2X := startX + cardW + 5 // 5mm gap
	c2Y := startY

	// Card 2 Border
	pdf.SetDrawColor(226, 91, 28)
	pdf.RoundedRect(c2X, c2Y, cardW, cardH, 3, "1234", "D")

	// Card 2 Top Orange bar
	pdf.SetFillColor(226, 91, 28)
	pdf.Rect(c2X, c2Y, cardW, 2, "F")

	// Text Content
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 4) // very tiny font for fine print
	txtY := c2Y + 4
	lh := 2.5

	drawTextLine := func(txt string, bold bool, isRed bool) {
		if bold {
			pdf.SetFont("Arial", "B", 4)
		} else {
			pdf.SetFont("Arial", "", 4)
		}
		if isRed {
			pdf.SetTextColor(180, 20, 20)
		} else {
			pdf.SetTextColor(0, 0, 0)
		}
		pdf.SetXY(c2X+2, txtY)
		pdf.CellFormat(cardW-4, lh, txt, "", 0, "L", false, 0, "")
		txtY += lh
	}

	drawTextLine("*Health Assistance Helpline: 040-6674205 (8 am to 8 pm Monday to Saturday except public holidays) for services:", false, false)
	drawTextLine("Second opinion, doctor appointment, facilitating hospitalization, post hospitalization care.", false, false)
	drawTextLine("• For services like second opinion, doctor appointment, facilitating hospitalization, post hospitalization care, call our", false, false)
	drawTextLine("  Health Assistance Helpline at 040-6674205.", false, false)
	drawTextLine("• This card is not transferable and is valid at network hospitals only.", false, false)
	drawTextLine("• Use of this card is governed by the policy terms and conditions.", false, false)
	drawTextLine("• Cashless access to the network provider can only be obtained when accompanied with an authorization letter.", false, false)
	drawTextLine("• Valid up to policy expiry date or cancellation date whichever is earlier.", false, false)
	
	txtY += 1

	drawTextLine("ICICI Lombard Health Care Pays: Hospitalisation bills for admissible claim, subject to prior approval.", true, true)
	drawTextLine("Insured Pays: All non-medical hospitalization bills and expenses not covered under the policy.", true, true)
	drawTextLine("Mailing Address: ICICI Lombard Healthcare, 4th, 5th and 6th floors, Varun Towers, Opp. Hyderabad Public School,", true, true)
	drawTextLine("Begumpet, Hyderabad, Telangana - 500 016.", true, true)
	drawTextLine("Registered Address: ICICI Lombard House, 414, P. Balu Marg, Off Veer Savarkar Road, Prabhadevi, Mumbai 400 025.", true, true)

	// Bottom contacts
	txtY = c2Y + cardH - 8
	pdf.SetFont("Arial", "B", 4)
	pdf.SetTextColor(0, 0, 0)
	
	pdf.SetXY(c2X+2, txtY)
	pdf.CellFormat(30, lh, "Fax Number: (040) 6698 9150/51", "", 0, "L", false, 0, "")
	pdf.SetXY(c2X+cardW-32, txtY)
	pdf.CellFormat(30, lh, "Toll Free Number: 1800 2666", "", 0, "R", false, 0, "")

	pdf.SetXY(c2X+2, txtY+lh)
	pdf.CellFormat(30, lh, "Email: ihealthcare@icicilombard.com", "", 0, "L", false, 0, "")
	pdf.SetXY(c2X+cardW-32, txtY+lh)
	pdf.CellFormat(30, lh, "Visit us at: www.icicilombard.com", "", 0, "R", false, 0, "")

	// Red bottom curve (faked with a line)
	pdf.SetDrawColor(180, 20, 20)
	pdf.SetLineWidth(0.5)
	pdf.Line(c2X, c2Y+cardH-0.5, c2X+cardW, c2Y+cardH-0.5)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate health card pdf: %w", err)
	}

	return buf.Bytes(), nil
}
