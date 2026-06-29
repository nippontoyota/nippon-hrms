# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o api ./cmd/server

# Final stage
FROM alpine:latest

# Add ca-certificates and tzdata for external API calls and time handling
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/api .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./api"]
