// Package logger provides a thin structured logging wrapper over the std log/slog package.
package logger

import (
	"log/slog"
	"os"
)

var defaultLogger *slog.Logger

func init() {
	defaultLogger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level:     slog.LevelInfo,
		AddSource: false,
	}))
	slog.SetDefault(defaultLogger)
}

// Info logs an informational message.
func Info(msg string, args ...any) { slog.Info(msg, args...) }

// Warn logs a warning message.
func Warn(msg string, args ...any) { slog.Warn(msg, args...) }

// Error logs an error message.
func Error(msg string, args ...any) { slog.Error(msg, args...) }

// Debug logs a debug message.
func Debug(msg string, args ...any) { slog.Debug(msg, args...) }
