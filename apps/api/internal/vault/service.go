package vault

import (
	"net/http"
	"os"
)

// IsUnlocked checks if the request contains the correct Vault Root Password in the headers.
// The password should be passed in the X-Vault-Token header.
func IsUnlocked(r *http.Request) bool {
	expectedPassword := os.Getenv("VAULT_ROOT_PASSWORD")
	// If the vault password is not configured in the environment, the vault is disabled (always locked)
	// to prevent security leaks by default.
	if expectedPassword == "" {
		return false
	}

	token := r.Header.Get("X-Vault-Token")
	return token == expectedPassword
}
