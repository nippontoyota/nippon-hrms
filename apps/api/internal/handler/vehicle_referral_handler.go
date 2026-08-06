package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/nippon-toyota/hrms/internal/vehiclereferral"
)

type VehicleReferralHandler struct {
	repo *vehiclereferral.PostgresRepository
}

func NewVehicleReferralHandler(repo *vehiclereferral.PostgresRepository) *VehicleReferralHandler {
	return &VehicleReferralHandler{repo: repo}
}

func (h *VehicleReferralHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CustomerName  string `json:"customerName"`
		EmployeeID    string `json:"employeeId"`
		ReferredName  string `json:"referredName"`
		ReferredPhone string `json:"referredPhone"`
		Model         string `json:"model"`
		Website       string `json:"website"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Website) != "" {
		w.WriteHeader(http.StatusOK)
		return
	}

	ref, err := vehiclereferral.NormalizeInput(vehiclereferral.Input{
		CustomerName:  req.CustomerName,
		EmployeeID:    req.EmployeeID,
		ReferredName:  req.ReferredName,
		ReferredPhone: req.ReferredPhone,
		Model:         req.Model,
	})
	if err != nil {
		if errors.Is(err, vehiclereferral.ErrInvalidInput) {
			http.Error(w, "Please check the submitted details", http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := h.repo.Create(r.Context(), &ref); err != nil {
		if errors.Is(err, vehiclereferral.ErrDuplicateReferral) {
			http.Error(w, "This person has already been referred", http.StatusConflict)
			return
		}
		http.Error(w, "Could not submit. Please try again.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ref)
}

func (h *VehicleReferralHandler) List(w http.ResponseWriter, r *http.Request) {
	refs, err := h.repo.List(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if refs == nil {
		refs = []vehiclereferral.Referral{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(refs)
}
