package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nippon-toyota/hrms/internal/db"
	"github.com/nippon-toyota/hrms/pkg/respond"
	"github.com/supabase-community/gotrue-go/types"
	"github.com/google/uuid"
)

type AdminHandler struct {
	pool *pgxpool.Pool
	supa *db.Client
}

func NewAdminHandler(pool *pgxpool.Pool, supa *db.Client) *AdminHandler {
	return &AdminHandler{pool: pool, supa: supa}
}

type UserPayload struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AdminHandler) CreateHRUser(w http.ResponseWriter, r *http.Request) {
	var payload UserPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respond.BadRequest(w, "invalid json")
		return
	}

	// Create user in Supabase
	userParams := types.AdminCreateUserRequest{
		Email:        payload.Email,
		Password:     &payload.Password,
		EmailConfirm: true,
	}

	user, err := h.supa.Auth.AdminCreateUser(userParams)
	if err != nil {
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{Success: false, Data: err.Error()})
		return
	}

	// Insert into hr_profiles
	_, err = h.pool.Exec(r.Context(), "INSERT INTO hr_profiles (user_id, email, role) VALUES ($1, $2, 'hr_admin')", user.ID, user.Email)
	if err != nil {
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{Success: false, Data: err.Error()})
		return
	}

	respond.JSON(w, http.StatusCreated, respond.Envelope{Success: true, Data: user})
}

func (h *AdminHandler) ListHRUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), "SELECT user_id, email, role, created_at FROM hr_profiles")
	if err != nil {
		respond.InternalError(w)
		return
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, email, role, createdAt string
		if err := rows.Scan(&id, &email, &role, &createdAt); err != nil {
			continue
		}
		users = append(users, map[string]interface{}{
			"id":         id,
			"email":      email,
			"role":       role,
			"created_at": createdAt,
		})
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{Success: true, Data: users})
}

func (h *AdminHandler) DeleteHRUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respond.BadRequest(w, "missing id")
		return
	}

	uid, err := uuid.Parse(id)
	if err != nil {
		respond.BadRequest(w, "invalid uuid")
		return
	}

	err = h.supa.Auth.AdminDeleteUser(types.AdminDeleteUserRequest{UserID: uid})
	if err != nil {
		respond.JSON(w, http.StatusInternalServerError, respond.Envelope{Success: false, Data: err.Error()})
		return
	}

	_, err = h.pool.Exec(r.Context(), "DELETE FROM hr_profiles WHERE user_id = $1", id)
	if err != nil {
		respond.InternalError(w)
		return
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{Success: true})
}

func (h *AdminHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	user, err := h.supa.Auth.GetUser(token)
	if err != nil || user == nil {
		respond.Unauthorized(w)
		return
	}

	var role string
	err = h.pool.QueryRow(r.Context(), "SELECT role FROM hr_profiles WHERE user_id = $1", user.ID).Scan(&role)
	if err != nil {
		// Default to hr_admin if not found
		role = "hr_admin"
	}

	respond.JSON(w, http.StatusOK, respond.Envelope{
		Success: true,
		Data: map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"role":  role,
		},
	})
}
