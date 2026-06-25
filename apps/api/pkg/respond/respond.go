package respond

import (
	"encoding/json"
	"net/http"
)

type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Meta struct {
	Page    int `json:"page,omitempty"`
	PerPage int `json:"per_page,omitempty"`
	Total   int `json:"total,omitempty"`
}

func JSON(w http.ResponseWriter, status int, env Envelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(env)
}

func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, Envelope{Success: true, Data: data})
}

func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, Envelope{Success: true, Data: data})
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func BadRequest(w http.ResponseWriter, message string) {
	JSON(w, http.StatusBadRequest, Envelope{
		Success: false,
		Error:   &APIError{Code: "BAD_REQUEST", Message: message},
	})
}

func Unauthorized(w http.ResponseWriter) {
	JSON(w, http.StatusUnauthorized, Envelope{
		Success: false,
		Error:   &APIError{Code: "UNAUTHORIZED", Message: "authentication required"},
	})
}

func Forbidden(w http.ResponseWriter) {
	JSON(w, http.StatusForbidden, Envelope{
		Success: false,
		Error:   &APIError{Code: "FORBIDDEN", Message: "access denied"},
	})
}

func NotFound(w http.ResponseWriter, resource string) {
	JSON(w, http.StatusNotFound, Envelope{
		Success: false,
		Error:   &APIError{Code: "NOT_FOUND", Message: resource + " not found"},
	})
}

func InternalError(w http.ResponseWriter) {
	JSON(w, http.StatusInternalServerError, Envelope{
		Success: false,
		Error:   &APIError{Code: "INTERNAL_ERROR", Message: "an unexpected error occurred"},
	})
}
