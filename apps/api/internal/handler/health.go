// Package handler implements HTTP handlers for the health endpoint.
package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

// HealthHandler handles GET /health.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{
		"status":  "ok",
		"service": "nippon-hrms-api",
	})
}
