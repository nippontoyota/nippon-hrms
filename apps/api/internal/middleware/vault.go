package middleware

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/vault"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

func RequireVault(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			if !vault.IsUnlocked(r.Context(), pool, r) {
				respond.JSON(w, http.StatusForbidden, respond.Envelope{
					Success: false,
					Error:   &respond.APIError{Code: "VAULT_LOCKED", Message: "vault must be unlocked to import sensitive data"},
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
