// Package config loads application configuration from environment variables.
package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration.
type Config struct {
	// Server
	Host string
	Port int
	Env  string // "development" | "production"

	// Supabase
	SupabaseURL            string
	SupabaseServiceRoleKey string
	SupabaseAnonKey        string // used only when calling Supabase Auth on behalf of users

	// JWT (HRMS-issued tokens — separate from Supabase Auth)
	JWTSecret          string
	JWTExpiryMinutes   int
	JWTRefreshDays     int

	// DoubleTick / WhatsApp
	DoubleTickAPIKey        string
	DoubleTickWebhookSecret string
	WABAPhoneNumberID       string
}

// Load reads .env (if present) then environment variables and returns Config.
func Load() (*Config, error) {
	// .env is optional — only used locally.
	_ = godotenv.Load()

	cfg := &Config{
		Host: getEnv("HOST", "0.0.0.0"),
		Port: getEnvInt("PORT", 8080),
		Env:  getEnv("APP_ENV", "development"),

		// Supabase — required at runtime, optional during local dev without DB
		SupabaseURL:            getEnv("SUPABASE_URL", ""),
		SupabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseAnonKey:        getEnv("SUPABASE_ANON_KEY", ""),

		// JWT
		JWTSecret:          mustGetEnv("JWT_SECRET"),
		JWTExpiryMinutes:   getEnvInt("JWT_EXPIRY_MINUTES", 60),
		JWTRefreshDays:     getEnvInt("JWT_REFRESH_DAYS", 7),

		// DoubleTick / WhatsApp
		DoubleTickAPIKey:        getEnv("DOUBLETICK_API_KEY", ""),
		DoubleTickWebhookSecret: getEnv("DOUBLETICK_WEBHOOK_SECRET", ""),
		WABAPhoneNumberID:       getEnv("WABA_PHONE_NUMBER_ID", ""),
	}

	return cfg, nil
}

// Addr returns the combined "host:port" listen address.
func (c *Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// ─── helpers ────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %q is not set", key))
	}
	return v
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
