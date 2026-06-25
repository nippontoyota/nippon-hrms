// Package respond provides standardised JSON response helpers for Chi handlers.
package respond

import (
	"encoding/json"
	"net/http"
)

// Envelope is the standard API response wrapper.
type Envelope struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// APIError holds a machine-readable code and human-readable message.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Meta carries optional pagination data.
type Meta struct {
	Page    int `json:"page,omitempty"`
	PerPage int `json:"per_page,omitempty"`
	Total   int `json:"total,omitempty"`
}

// JSON writes an Envelope as JSON with the given status code.
func JSON(w http.ResponseWriter, status int, env Envelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(env)
}

// OK sends a 200 success response.
func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, Envelope{Success: true, Data: data})
}

// Created sends a 201 success response.
func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, Envelope{Success: true, Data: data})
}

// NoContent sends a 204 response.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// BadRequest sends a 400 error response.
func BadRequest(w http.ResponseWriter, message string) {
	JSON(w, http.StatusBadRequest, Envelope{
		Success: false,
		Error:   &APIError{Code: "BAD_REQUEST", Message: message},
	})
}

// Unauthorized sends a 401 error response.
func Unauthorized(w http.ResponseWriter) {
	JSON(w, http.StatusUnauthorized, Envelope{
		Success: false,
		Error:   &APIError{Code: "UNAUTHORIZED", Message: "authentication required"},
	})
}

// Forbidden sends a 403 error response.
func Forbidden(w http.ResponseWriter) {
	JSON(w, http.StatusForbidden, Envelope{
		Success: false,
		Error:   &APIError{Code: "FORBIDDEN", Message: "access denied"},
	})
}

// NotFound sends a 404 error response.
func NotFound(w http.ResponseWriter, resource string) {
	JSON(w, http.StatusNotFound, Envelope{
		Success: false,
		Error:   &APIError{Code: "NOT_FOUND", Message: resource + " not found"},
	})
}

// InternalError sends a 500 error response.
func InternalError(w http.ResponseWriter) {
	JSON(w, http.StatusInternalServerError, Envelope{
		Success: false,
		Error:   &APIError{Code: "INTERNAL_ERROR", Message: "an unexpected error occurred"},
	})
}
