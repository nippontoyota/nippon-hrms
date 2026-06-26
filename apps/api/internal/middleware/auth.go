package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/nippon-toyota/hrms/pkg/logger"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type contextKey string

const (
	ClaimsKey contextKey = "jwt_claims"
)

type HRMSClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

func RequireAuth(supaURL, anonKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				respond.Unauthorized(w)
				return
			}

			// Validate token directly with Supabase
			req, err := http.NewRequestWithContext(r.Context(), "GET", supaURL+"/auth/v1/user", nil)
			if err != nil {
				respond.InternalError(w)
				return
			}
			req.Header.Set("Authorization", authHeader)
			req.Header.Set("apikey", anonKey)

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				logger.Error("supabase auth request failed", "err", err)
				respond.Unauthorized(w)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				respond.Unauthorized(w)
				return
			}

			var supaUser struct {
				ID string `json:"id"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&supaUser); err != nil {
				respond.Unauthorized(w)
				return
			}

			claims := &HRMSClaims{
				UserID: supaUser.ID,
				Role:   "HR_ADMIN",
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func ClaimsFromContext(ctx context.Context) (*HRMSClaims, bool) {
	claims, ok := ctx.Value(ClaimsKey).(*HRMSClaims)
	return claims, ok
}
