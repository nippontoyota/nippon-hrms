package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/internal/dashboard"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type DashboardHandler struct {
	repo *dashboard.PostgresRepository
}

func NewDashboardHandler(repo *dashboard.PostgresRepository) *DashboardHandler {
	return &DashboardHandler{repo: repo}
}

func (h *DashboardHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	stats, err := h.repo.GetStats(ctx)
	if err != nil {
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{
			Success: false,
			Error:   &respond.APIError{Code: "INTERNAL_ERROR", Message: "failed to get dashboard stats: " + err.Error()},
		})
		return
	}

	respond.OK(w, stats)
}
