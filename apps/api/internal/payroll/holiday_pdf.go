package payroll

import (
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
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/consts/pagesize"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"

	"github.com/nippon-toyota/hrms/internal/holiday"
)

var (
	colorHolidayBand   = &props.Color{Red: 31, Green: 78, Blue: 140}   // deep blue section band
	colorHolidayHead   = &props.Color{Red: 219, Green: 231, Blue: 246} // light blue column header
	colorHolidayStripe = &props.Color{Red: 240, Green: 246, Blue: 253} // pale blue zebra stripe
	colorWhite         = &props.Color{Red: 255, Green: 255, Blue: 255}
)

// nationalHolidayNames identifies which holidays belong to the "National Holidays"
// section of the Kerala Labour Commissionerate notice; everything else is a festival holiday.
var nationalHolidayNames = map[string]bool{
	"republic day":           true,
	"may day":                true,
	"independence day":       true,
	"gandhi jayanthi":        true,
	"gandhi jayanti":         true,
	"mahatma gandhi jayanti": true,
}

type holidayRow struct {
	Index string
	Date  string
	Day   string
	Name  string
}

func newHolidayRows(holidays []holiday.Holiday) []holidayRow {
	rows := make([]holidayRow, 0, len(holidays))
	i := 1
	for _, h := range holidays {
		d, err := time.Parse("2006-01-02", h.Date)
		if err != nil {
			continue
		}
		rows = append(rows, holidayRow{
			Index: fmt.Sprintf("%d", i),
			Date:  d.Format("02 Jan 2006"),
			Day:   d.Format("Monday"),
			Name:  h.Name,
		})
		i++
	}
	return rows
}

func splitHolidays(holidays []holiday.Holiday) (national, festival []holiday.Holiday) {
	for _, h := range holidays {
		if nationalHolidayNames[strings.ToLower(strings.TrimSpace(h.Name))] {
			national = append(national, h)
		} else {
			festival = append(festival, h)
		}
	}
	return national, festival
}

// holidayYearLine returns the year(s) covered by the list, e.g. "2026" or "2026 - 2027".
func holidayYearLine(holidays []holiday.Holiday) string {
	var minY, maxY int
	for _, h := range holidays {
		d, err := time.Parse("2006-01-02", h.Date)
		if err != nil {
			continue
		}
		y := d.Year()
		if minY == 0 || y < minY {
			minY = y
		}
		if y > maxY {
			maxY = y
		}
	}
	switch {
	case minY == 0:
		return ""
	case minY == maxY:
		return fmt.Sprintf("%d", minY)
	default:
		return fmt.Sprintf("%d - %d", minY, maxY)
	}
}

func holidayTitleLine(holidays []holiday.Holiday) string {
	if years := holidayYearLine(holidays); years != "" {
		return "Holiday Calendar " + years
	}
	return "Holiday Calendar"
}

// GenerateHolidayCalendarPDF renders the company holidays as a PDF with separate
// National and Festival sections and returns the bytes.
func GenerateHolidayCalendarPDF(holidays []holiday.Holiday) ([]byte, error) {
	cfg := config.NewBuilder().
		WithPageSize(pagesize.A4).
		WithTopMargin(10).
		WithLeftMargin(10).
		WithRightMargin(10).
		WithBottomMargin(10).
		Build()

	m := maroto.New(cfg)

	addHolidayHeader(m, holidayTitleLine(holidays))

	national, festival := splitHolidays(holidays)
	years := holidayYearLine(holidays)

	sectionTitle := func(kind string) string {
		if years != "" {
			return fmt.Sprintf("List of %s Holidays for the year %s", kind, years)
		}
		return fmt.Sprintf("List of %s Holidays", kind)
	}

	if len(national) > 0 {
		addHolidaySection(m, sectionTitle("National"), newHolidayRows(national))
	}
	if len(festival) > 0 {
		addHolidaySection(m, sectionTitle("Festival"), newHolidayRows(festival))
	}

	addHolidayFooter(m)

	doc, err := m.Generate()
	if err != nil {
		return nil, fmt.Errorf("failed to generate holiday calendar pdf: %w", err)
	}
	return doc.GetBytes(), nil
}

func addHolidayHeader(m core.Maroto, subtitle string) {
	m.AddRow(7,
		col.New(12).WithStyle(styleCell(nil, border.Left|border.Top|border.Right)),
	)

	m.AddRow(11,
		col.New(12).
			Add(image.NewFromBytes(logoBytes, extension.Png, props.Rect{Percent: 46, Center: true})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	m.AddRow(8,
		col.New(12).
			Add(text.New("Nippon Motor Corporation Pvt Ltd", props.Text{Size: 16, Style: fontstyle.Bold, Align: align.Center, Color: colorBlue})).
			WithStyle(styleCell(nil, border.Left|border.Right)),
	)

	m.AddRow(6,
		col.New(12).
			Add(text.New(subtitle, props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Center})).
			WithStyle(styleCell(nil, border.Left|border.Right|border.Bottom)),
	)

	m.AddRow(4, col.New(12))
}

func addHolidaySection(m core.Maroto, title string, rows []holidayRow) {
	// Section band: deep blue with white bold text.
	m.AddRow(9,
		col.New(12).
			Add(text.New(title, props.Text{Size: 11, Style: fontstyle.Bold, Align: align.Center, Top: 2, Color: colorWhite})).
			WithStyle(&props.Cell{BackgroundColor: colorHolidayBand, BorderType: border.Full, BorderColor: colorBlack, BorderThickness: 0.3}),
	)

	headText := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Left, Top: 1.5, Left: 2, Color: colorHolidayBand}
	headCenter := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Center, Top: 1.5, Color: colorHolidayBand}

	m.AddRow(8,
		col.New(1).Add(text.New("#", headCenter)).WithStyle(styleCell(colorHolidayHead, border.Full)),
		col.New(3).Add(text.New("Date", headText)).WithStyle(styleCell(colorHolidayHead, border.Full)),
		col.New(3).Add(text.New("Day", headText)).WithStyle(styleCell(colorHolidayHead, border.Full)),
		col.New(5).Add(text.New("Holiday", headText)).WithStyle(styleCell(colorHolidayHead, border.Full)),
	)

	idxProp := props.Text{Size: 9, Align: align.Center, Top: 1.2, Bottom: 1.2}
	cellProp := props.Text{Size: 9, Align: align.Left, Top: 1.2, Bottom: 1.2, Left: 2}
	nameProp := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Left, Top: 1.2, Bottom: 1.2, Left: 2}

	for i, r := range rows {
		bg := (*props.Color)(nil)
		if i%2 == 1 {
			bg = colorHolidayStripe
		}
		m.AddAutoRow(
			col.New(1).Add(text.New(r.Index, idxProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(3).Add(text.New(r.Date, cellProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(3).Add(text.New(r.Day, cellProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(5).Add(text.New(r.Name, nameProp)).WithStyle(styleCell(bg, border.Full)),
		)
	}

	// Gap before the next section.
	m.AddRow(5, col.New(12))
}

func addHolidayFooter(m core.Maroto) {
	m.AddRow(10,
		col.New(12).Add(
			text.New("This is a computer generated holiday calendar and does not require any signatures",
				props.Text{Size: 9, Style: fontstyle.Italic, Align: align.Center, Color: colorFooter, Top: 3}),
		),
	)
}
