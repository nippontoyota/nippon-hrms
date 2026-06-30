package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/internal/vault"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type VaultHandler struct{}

func NewVaultHandler() *VaultHandler {
	return &VaultHandler{}
}

func (h *VaultHandler) Verify(w http.ResponseWriter, r *http.Request) {
	if vault.IsUnlocked(r) {
		respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: "unlocked"})
		return
	}
	respond.Unauthorized(w)
}
