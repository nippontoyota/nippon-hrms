package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Host string
	Port int
	Env  string

	AllowedOrigins []string

	SupabaseURL            string
	SupabaseServiceRoleKey string
	SupabaseAnonKey        string

	DatabaseURL string

	JWTSecret        string
	JWTExpiryMinutes int
	JWTRefreshDays   int

	DoubleTickAPIKey        string
	DoubleTickWebhookSecret string
	WABAPhoneNumberID       string

	DispatchWorkers   int
	DispatchItemDelay int
}

func Load() (*Config, error) {

	// Try loading from project root first, then current directory
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load()

	cfg := &Config{
		Host: getEnv("HOST", "0.0.0.0"),
		Port: getEnvInt("PORT", 8080),
		Env:  getEnv("APP_ENV", "development"),

		AllowedOrigins: parseAllowedOrigins(getEnv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")),

		SupabaseURL:            getEnv("SUPABASE_URL", ""),
		SupabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseAnonKey:        getEnv("SUPABASE_ANON_KEY", ""),

		DatabaseURL: mustGetEnv("DATABASE_URL"),

		JWTSecret:        mustGetEnv("JWT_SECRET"),
		JWTExpiryMinutes: getEnvInt("JWT_EXPIRY_MINUTES", 60),
		JWTRefreshDays:   getEnvInt("JWT_REFRESH_DAYS", 7),

		DoubleTickAPIKey:        getEnv("DOUBLETICK_API_KEY", ""),
		DoubleTickWebhookSecret: getEnv("DOUBLETICK_WEBHOOK_SECRET", ""),
		WABAPhoneNumberID:       getEnv("WABA_PHONE_NUMBER_ID", ""),

		DispatchWorkers:   getEnvInt("DISPATCH_WORKERS", 30),
		DispatchItemDelay: getEnvInt("DISPATCH_ITEM_DELAY_MS", 50),
	}

	return cfg, nil
}

func (c *Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

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

func parseAllowedOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		out = append(out, "http://localhost:5173")
	}
	// Always allow the production and preview pages
	out = append(out, "https://nippon-hrms.pages.dev")
	out = append(out, "https://*.nippon-hrms.pages.dev")
	return out
}
