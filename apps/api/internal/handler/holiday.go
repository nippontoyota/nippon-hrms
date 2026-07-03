package handler

import (
	"encoding/json"
	"strconv"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/holiday"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
	"time"
)

type HolidayHandler struct {
	repo holiday.Repository
}

func NewHolidayHandler(repo holiday.Repository) *HolidayHandler {
	return &HolidayHandler{repo: repo}
}

func (h *HolidayHandler) List(w http.ResponseWriter, r *http.Request) {
	var year, month *int
	if y := r.URL.Query().Get("year"); y != "" {
		if v, err := strconv.Atoi(y); err == nil {
			year = &v
		}
	}
	if m := r.URL.Query().Get("month"); m != "" {
		if v, err := strconv.Atoi(m); err == nil {
			month = &v
		}
	}

	holidays, err := h.repo.List(r.Context(), year, month)
	if err != nil {
		logger.Error("failed to list holidays", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, holidays)
}

func (h *HolidayHandler) Create(w http.ResponseWriter, r *http.Request) {
	var hol holiday.Holiday
	if err := json.NewDecoder(r.Body).Decode(&hol); err != nil {
		respond.BadRequest(w, "invalid request payload")
		return
	}

	if hol.Date == "" || hol.Name == "" {
		respond.BadRequest(w, "date and name are required")
		return
	}

	if err := h.repo.Create(r.Context(), &hol); err != nil {
		logger.Error("failed to create holiday", "err", err)
		respond.InternalError(w)
		return
	}
	respond.Created(w, hol)
}

func (h *HolidayHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respond.BadRequest(w, "missing holiday ID")
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		logger.Error("failed to delete holiday", "err", err)
		respond.InternalError(w)
		return
	}
	respond.NoContent(w)
}

func (h *HolidayHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "file too large")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing file")
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		respond.BadRequest(w, "invalid excel file")
		return
	}
	defer f.Close()

	rows, err := f.GetRows(f.GetSheetName(f.GetActiveSheetIndex()))
	if err != nil {
		respond.BadRequest(w, "failed to read rows")
		return
	}

	var holidays []holiday.Holiday
	for i, row := range rows {
		if i == 0 || len(row) < 2 {
			continue // Skip header or empty rows
		}
		dateStr := row[0]
		name := row[1]
		
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			t, err = time.Parse("02-01-2006", dateStr)
			if err != nil {
				t, err = time.Parse("01/02/2006", dateStr)
				if err != nil {
					continue // skip invalid dates
				}
			}
		}

		holidays = append(holidays, holiday.Holiday{
			Date: t.Format("2006-01-02"),
			Name: name,
		})
	}

	if err := h.repo.BulkCreate(r.Context(), holidays); err != nil {
		logger.Error("failed to bulk create holidays", "err", err)
		respond.InternalError(w)
		return
	}

	respond.OK(w, map[string]int{"imported": len(holidays)})
}
