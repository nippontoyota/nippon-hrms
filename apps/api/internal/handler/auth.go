package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	appMiddleware "github.com/nippon-toyota/hrms/internal/middleware"
	"github.com/nippon-toyota/hrms/pkg/respond"
)

type AuthHandler struct {
	jwtSecret string
	expiryMin int
}

func NewAuthHandler(jwtSecret string, expiryMin int) *AuthHandler {
	return &AuthHandler{jwtSecret: jwtSecret, expiryMin: expiryMin}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.BadRequest(w, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		respond.BadRequest(w, "email and password are required")
		return
	}

	userID := "usr_admin_001"
	userName := "HR Admin"
	role := "admin"

	claims := &appMiddleware.HRMSClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(h.expiryMin) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		respond.InternalError(w)
		return
	}

	respond.OK(w, map[string]interface{}{
		"access_token": signed,
		"user": map[string]string{
			"id":   userID,
			"name": userName,
			"role": role,
		},
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{"message": "refresh token endpoint — not yet implemented"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := appMiddleware.ClaimsFromContext(r.Context())
	if !ok {
		respond.Unauthorized(w)
		return
	}
	respond.OK(w, map[string]string{
		"user_id": claims.UserID,
		"role":    claims.Role,
	})
}
