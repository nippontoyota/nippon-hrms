package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/employee"
	"github.com/nippon-toyota/hrms/internal/referral"
	"github.com/nippon-toyota/hrms/pkg/phone"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type ReferralHandler struct {
	referralRepo referral.Repository
	empRepo      employee.Repository
	dtClient     *doubletick.Client
}

func NewReferralHandler(rr referral.Repository, er employee.Repository, dtClient *doubletick.Client) *ReferralHandler {
	return &ReferralHandler{
		referralRepo: rr,
		empRepo:      er,
		dtClient:     dtClient,
	}
}

func (h *ReferralHandler) SubmitApplication(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		respond.BadRequest(w, "file too large or invalid multipart form")
		return
	}

	code := r.FormValue("referralCode")
	if code == "" {
		respond.BadRequest(w, "missing referral code")
		return
	}

	emp, err := h.empRepo.FindByReferralCode(r.Context(), code)
	if err != nil {
		respond.BadRequest(w, "invalid referral code")
		return
	}

	name := r.FormValue("candidateName")
	phoneRaw := r.FormValue("candidatePhone")
	email := r.FormValue("candidateEmail")
	role := r.FormValue("role")

	phoneNorm := phone.NormalizeIndian(phoneRaw)
	if name == "" || phoneNorm == "" || role == "" {
		respond.BadRequest(w, "name, valid phone number, and role are required")
		return
	}

	var emailPtr *string
	if email != "" {
		emailPtr = &email
	}

	var resumeURL *string
	file, header, err := r.FormFile("resume")
	if err == nil {
		defer file.Close()
		uploadsDir := filepath.Join("uploads", "resumes")
		os.MkdirAll(uploadsDir, os.ModePerm)
		
		destPath := filepath.Join(uploadsDir, header.Filename)
		destFile, err := os.Create(destPath)
		if err != nil {
			slog.Error("failed to create resume file", "err", err)
			respond.InternalError(w)
			return
		}
		defer destFile.Close()
		
		if _, err := io.Copy(destFile, file); err != nil {
			slog.Error("failed to save resume file", "err", err)
			respond.InternalError(w)
			return
		}
		url := "/api/v1/uploads/resumes/" + header.Filename
		resumeURL = &url
	}

	ref := &referral.Referral{
		EmployeeID:     emp.ID,
		CandidateName:  name,
		CandidatePhone: phoneNorm,
		CandidateEmail: emailPtr,
		Role:           role,
		ResumeURL:      resumeURL,
		Status:         referral.StatusPending,
	}

	if err := h.referralRepo.Create(r.Context(), ref); err != nil {
		if errors.Is(err, referral.ErrDuplicatePhone) {
			respond.JSON(w, http.StatusConflict, respond.Envelope{
				Success: false,
				Error:   &respond.APIError{Code: "CONFLICT", Message: "Candidate with this phone number already referred."},
			})
			return
		}
		slog.Error("failed to create referral", "err", err)
		respond.InternalError(w)
		return
	}

	// Notify Employee (Fire and Forget)
	go func() {
		if h.dtClient != nil && h.dtClient.Configured() {
			msg := "Great news! Your referral for " + name + " has been received successfully."
			h.dtClient.SendText(context.Background(), emp.MobileNumber, msg)
		}
	}()

	respond.Created(w, ref)
}

func (h *ReferralHandler) List(w http.ResponseWriter, r *http.Request) {
	refs, err := h.referralRepo.ListAll(r.Context())
	if err != nil {
		slog.Error("failed to list referrals", "err", err)
		respond.InternalError(w)
		return
	}
	respond.OK(w, refs)
}

func (h *ReferralHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Status referral.Status `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid payload")
		return
	}

	if err := h.referralRepo.UpdateStatus(r.Context(), id, req.Status); err != nil {
		if errors.Is(err, referral.ErrNotFound) {
			respond.NotFound(w, "referral")
			return
		}
		slog.Error("failed to update referral status", "err", err)
		respond.InternalError(w)
		return
	}

	// Fetch referral to notify employee
	ref, err := h.referralRepo.GetByID(r.Context(), id)
	if err == nil && ref.Employee != nil {
		go func() {
			if h.dtClient != nil && h.dtClient.Configured() {
				msg := "Update: The status for your referral " + ref.CandidateName + " has been changed to " + string(req.Status) + "."
				h.dtClient.SendText(context.Background(), ref.Employee.MobileNumber, msg)
			}
		}()
	}

	respond.OK(w, map[string]string{"message": "status updated successfully"})
}
