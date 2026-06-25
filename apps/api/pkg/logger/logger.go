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

func Info(msg string, args ...any) { slog.Info(msg, args...) }

func Warn(msg string, args ...any) { slog.Warn(msg, args...) }

func Error(msg string, args ...any) { slog.Error(msg, args...) }

func Debug(msg string, args ...any) { slog.Debug(msg, args...) }
