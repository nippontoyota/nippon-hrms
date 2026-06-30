package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/epf"
	"github.com/nippon-toyota/hrms/internal/vault"
	"github.com/nippon-toyota/hrms/pkg/downloadname"
	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/xuri/excelize/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type EpfHandler struct {
	repo epf.Repository
	pool *pgxpool.Pool
}

func NewEpfHandler(repo epf.Repository, pool *pgxpool.Pool) *EpfHandler {
	return &EpfHandler{repo: repo, pool: pool}
}

func (h *EpfHandler) BulkUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respond.BadRequest(w, "failed to parse multipart form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		respond.BadRequest(w, "missing 'file' field")
		return
	}
	defer file.Close()

	records, errs, err := epf.ParseExcel(file)
	if err != nil {
		logger.Error("epf excel parsing failed", "err", err.Error())
		respond.JSON(w, http.StatusUnprocessableEntity, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "PARSE_ERROR", Message: "failed to read excel file: " + err.Error()},
		})
		return
	}

	if err := h.repo.DeleteAll(r.Context()); err != nil {
		logger.Error("failed to clear existing epf records", "err", err.Error())
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "DB_ERROR", Message: "failed to clear existing epf records: " + err.Error()},
		})
		return
	}

	if len(records) > 0 {
		if err := h.repo.BulkInsert(r.Context(), records); err != nil {
			logger.Error("epf bulk insert failed", "err", err.Error())
			respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "DB_ERROR", Message: "bulk insert failed: " + err.Error()},
			})
			return
		}
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data: epf.UploadResponse{
			TotalProcessed: len(records) + len(errs),
			SuccessCount:   len(records),
			ErrorCount:     len(errs),
			Errors:         errs,
		},
	})
}

func (h *EpfHandler) List(w http.ResponseWriter, r *http.Request) {
	records, err := h.repo.List(r.Context())
	if err != nil {
		logger.Error("failed to list epf records", "err", err)
		respond.InternalError(w)
		return
	}
	if records == nil {
		records = []epf.Record{}
	}

	if !vault.IsUnlocked(r.Context(), h.pool, r) {
		for i := range records {
			rec := &records[i]
			if rec.EPFNumber != "" {
				rec.EPFNumber = "********"
			}
			if rec.UAN != "" {
				rec.UAN = "********"
			}
			if rec.ESINumber != "" {
				rec.ESINumber = "********"
			}
		}
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: records})
}

func (h *EpfHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rec, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		respond.NotFound(w, "epf record not found")
		return
	}
	respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: rec})
}

func (h *EpfHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var rec epf.Record
	if err := json.NewDecoder(r.Body).Decode(&rec); err != nil {
		respond.BadRequest(w, "invalid request body")
		return
	}
	if err := h.repo.Update(r.Context(), id, &rec); err != nil {
		logger.Error("failed to update epf record", "err", err)
		respond.InternalError(w)
		return
	}
	respond.NoContent(w)
}

func (h *EpfHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.repo.Delete(r.Context(), id); err != nil {
		logger.Error("failed to delete epf record", "err", err)
		respond.InternalError(w)
		return
	}
	respond.NoContent(w)
}

var epfTemplateHeaders = []string{
	"Sl No", "employeeId", "name", "department", "level", "doj", "yearsSinceDoj",
	"doa", "yearsSinceDoa", "epfNumber", "uan", "esiNumber",
}

func (h *EpfHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	records, err := h.repo.List(r.Context())
	if err != nil {
		logger.Error("failed to list epf records for export", "err", err)
		respond.InternalError(w)
		return
	}
	if records == nil {
		records = []epf.Record{}
	}
	epf.SortByEmployeeID(records)

	f := excelize.NewFile()
	sheet := "EPF"
	f.SetSheetName("Sheet1", sheet)

	for i, hdr := range epfTemplateHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, hdr)
	}

	for rowIdx, rec := range records {
		row := rowIdx + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), rowIdx+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), rec.EmployeeID)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), rec.Name)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), rec.Department)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), rec.Level)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), rec.DOJ)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), rec.YearsSinceDOJ)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), rec.DOA)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), rec.YearsSinceDOA)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), rec.EPFNumber)
		f.SetCellValue(sheet, fmt.Sprintf("K%d", row), rec.UAN)
		f.SetCellValue(sheet, fmt.Sprintf("L%d", row), rec.ESINumber)
	}

	for i := range epfTemplateHeaders {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetColWidth(sheet, col, col, 16)
	}

	filename := downloadname.EpfExport()

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	if err := f.Write(w); err != nil {
		logger.Error("failed to write epf excel file", "err", err)
	}
}

func (h *EpfHandler) DownloadTemplate(w http.ResponseWriter, r *http.Request) {
	filename := downloadname.EpfImportTemplate()

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))

	for i, hdr := range epfTemplateHeaders {
		if i > 0 {
			w.Write([]byte(","))
		}
		w.Write([]byte(hdr))
	}
	w.Write([]byte("\n"))
}
