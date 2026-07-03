package payroll

import (
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

	"github.com/nippon-toyota/hrms/internal/holiday"
)

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

// holidayTitleLine returns a subtitle covering the year(s) present in the list.
func holidayTitleLine(holidays []holiday.Holiday) string {
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
		return "Holiday Calendar"
	case minY == maxY:
		return fmt.Sprintf("Holiday Calendar %d", minY)
	default:
		return fmt.Sprintf("Holiday Calendar %d - %d", minY, maxY)
	}
}

// GenerateHolidayCalendarPDF renders the full list of company holidays as a PDF and returns the bytes.
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
	addHolidayTable(m, newHolidayRows(holidays))
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

	m.AddRow(3, col.New(12))
}

func addHolidayTable(m core.Maroto, rows []holidayRow) {
	headText := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Left, Top: 1.5, Left: 2}
	headCenter := props.Text{Size: 10, Style: fontstyle.Bold, Align: align.Center, Top: 1.5}

	m.AddRow(8,
		col.New(1).Add(text.New("#", headCenter)).WithStyle(styleCell(colorGray, border.Full)),
		col.New(3).Add(text.New("Date", headText)).WithStyle(styleCell(colorGray, border.Full)),
		col.New(3).Add(text.New("Day", headText)).WithStyle(styleCell(colorGray, border.Full)),
		col.New(5).Add(text.New("Holiday", headText)).WithStyle(styleCell(colorGray, border.Full)),
	)

	idxProp := props.Text{Size: 9, Align: align.Center, Top: 1, Bottom: 1}
	cellProp := props.Text{Size: 9, Align: align.Left, Top: 1, Bottom: 1, Left: 2}
	nameProp := props.Text{Size: 9, Style: fontstyle.Bold, Align: align.Left, Top: 1, Bottom: 1, Left: 2}

	for i, r := range rows {
		bg := (*props.Color)(nil)
		if i%2 == 1 {
			bg = colorBeige
		}
		m.AddAutoRow(
			col.New(1).Add(text.New(r.Index, idxProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(3).Add(text.New(r.Date, cellProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(3).Add(text.New(r.Day, cellProp)).WithStyle(styleCell(bg, border.Full)),
			col.New(5).Add(text.New(r.Name, nameProp)).WithStyle(styleCell(bg, border.Full)),
		)
	}
}

func addHolidayFooter(m core.Maroto) {
	m.AddRow(10,
		col.New(12).Add(
			text.New("This is a computer generated holiday calendar and does not require any signatures",
				props.Text{Size: 9, Style: fontstyle.Italic, Align: align.Center, Color: colorFooter, Top: 3}),
		),
	)
}
