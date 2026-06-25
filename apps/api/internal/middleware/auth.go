// Package middleware provides custom Chi middleware for the HRMS API.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

// contextKey is an unexported type for context keys in this package.
type contextKey string

const (
	// ClaimsKey is the context key for JWT claims.
	ClaimsKey contextKey = "jwt_claims"
)

// HRMSClaims extends jwt.RegisteredClaims with user fields.
type HRMSClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// RequireAuth validates the Bearer token from the Authorization header.
// On success it stores HRMSClaims in the request context.
func RequireAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				respond.Unauthorized(w)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &HRMSClaims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				respond.Unauthorized(w)
				return
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ClaimsFromContext extracts HRMSClaims from the context.
func ClaimsFromContext(ctx context.Context) (*HRMSClaims, bool) {
	claims, ok := ctx.Value(ClaimsKey).(*HRMSClaims)
	return claims, ok
}
