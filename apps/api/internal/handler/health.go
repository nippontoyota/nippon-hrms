package handler

import (
	"net/http"

	"github.com/nippon-toyota/hrms/pkg/respond"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	respond.OK(w, map[string]string{
		"status":  "ok",
		"service": "nippon-hrms-api",
	})
}
