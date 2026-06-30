package vault

import (
	"context"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// IsUnlocked checks if the request contains the correct Vault Root Password in the headers.
// The password should be passed in the X-Vault-Token header.
func IsUnlocked(ctx context.Context, pool *pgxpool.Pool, r *http.Request) bool {
	token := r.Header.Get("X-Vault-Token")
	if token == "" {
		return false
	}

	// Read hash from DB
	var hash string
	err := pool.QueryRow(ctx, "SELECT value FROM app_settings WHERE key = 'vault_password_hash'").Scan(&hash)
	if err != nil {
		// Fallback to .env if DB not configured yet
		expectedPassword := os.Getenv("VAULT_ROOT_PASSWORD")
		if expectedPassword != "" && token == expectedPassword {
			return true
		}
		return false
	}

	err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(token))
	return err == nil
}
