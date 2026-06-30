package handler

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/vault"
	"golang.org/x/crypto/bcrypt"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type VaultHandler struct {
	pool *pgxpool.Pool
}

func NewVaultHandler(pool *pgxpool.Pool) *VaultHandler {
	return &VaultHandler{pool: pool}
}

func (h *VaultHandler) Verify(w http.ResponseWriter, r *http.Request) {
	if vault.IsUnlocked(r.Context(), h.pool, r) {
		respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: "unlocked"})
		return
	}
	respond.Unauthorized(w)
}

func (h *VaultHandler) UpdatePassword(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respond.BadRequest(w, "invalid json")
		return
	}

	// Read current hash
	var currentHash string
	err := h.pool.QueryRow(r.Context(), "SELECT value FROM app_settings WHERE key = 'vault_password_hash'").Scan(&currentHash)
	if err != nil {
		respond.InternalError(w)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(payload.CurrentPassword)); err != nil {
		respond.Unauthorized(w)
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		respond.InternalError(w)
		return
	}

	_, err = h.pool.Exec(r.Context(), "UPDATE app_settings SET value = $1 WHERE key = 'vault_password_hash'", string(newHash))
	if err != nil {
		respond.InternalError(w)
		return
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: "password updated"})
}
