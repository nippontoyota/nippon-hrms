package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/referral"
)

type ReferralHandler struct {
	svc *referral.Service
}

func NewReferralHandler(svc *referral.Service) *ReferralHandler {
	return &ReferralHandler{svc: svc}
}

func (h *ReferralHandler) GenerateLink(w http.ResponseWriter, r *http.Request) {
	var req struct {
		EmployeeID string `json:"employeeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	link, err := h.svc.GenerateLink(r.Context(), req.EmployeeID)
	if err != nil {
		if errors.Is(err, referral.ErrEmployeeNotFound) || errors.Is(err, referral.ErrEmployeeInactive) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(link)
}

func (h *ReferralHandler) GetLinkDetails(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	link, err := h.svc.GetLinkDetails(r.Context(), code)
	if err != nil {
		if errors.Is(err, referral.ErrLinkNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(link)
}

func (h *ReferralHandler) SubmitCandidate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		Phone       string `json:"phone"`
		ResumeURL   string `json:"resumeUrl"`
		Designation string `json:"designation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	candidate, err := h.svc.SubmitCandidate(r.Context(), req.Code, req.Name, req.Phone, req.ResumeURL, req.Designation)
	if err != nil {
		if errors.Is(err, referral.ErrDuplicateCandidate) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		if errors.Is(err, referral.ErrLinkExpired) || errors.Is(err, referral.ErrLinkNotFound) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(candidate)
}

func (h *ReferralHandler) ListCandidates(w http.ResponseWriter, r *http.Request) {
	candidates, err := h.svc.ListCandidates(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(candidates)
}

func (h *ReferralHandler) UpdateCandidateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.svc.UpdateCandidateStatus(r.Context(), id, req.Status); err != nil {
		if errors.Is(err, referral.ErrScreeningIncomplete) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ReferralHandler) UpdateCandidateCompletion(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TechnicalTestCompleted          bool `json:"technicalTestCompleted"`
		BackgroundVerificationCompleted bool `json:"backgroundVerificationCompleted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.UpdateCandidateCompletion(r.Context(), chi.URLParam(r, "id"), req.TechnicalTestCompleted, req.BackgroundVerificationCompleted); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ReferralHandler) SendCandidateToHeadOffice(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.SendCandidateToHeadOffice(r.Context(), chi.URLParam(r, "id")); err != nil {
		if errors.Is(err, referral.ErrScreeningIncomplete) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
