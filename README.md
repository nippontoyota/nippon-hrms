# Nippon Toyota HRMS

> Production-grade internal HR operations platform for Nippon Toyota.  
> WhatsApp Business (via DoubleTick) is the primary employee self-service interface.

---

## Monorepo Structure

```
nippon-hrms/
├── apps/
│   ├── web/        # Frontend — React 18 · Vite 5 · TypeScript
│   └── api/        # Backend  — Go 1.22+ · Chi v5
├── docs/           # Architecture, API specs, ADRs
└── README.md
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm / npm | latest |
| Go | ≥ 1.22 |
| PostgreSQL | ≥ 15 |
| Air (Go live-reload) | latest |

### Frontend

```bash
cd apps/web
npm install
npm run dev          # http://localhost:5173
```

### Backend

```bash
cd apps/api
cp .env.example .env  # fill in your values
go mod download
air                   # http://localhost:8080  (live-reload)
# or: go run ./cmd/server
```

---

## Team Convention

| Team | Directory | Branch prefix |
|------|-----------|---------------|
| Frontend | `apps/web/` | `fe/` |
| Backend | `apps/api/` | `be/` |

Pull requests must target `develop`. `main` is protected.

---

## Environment Variables

See [`apps/api/.env.example`](apps/api/.env.example) for all backend variables.

---

## Architecture

- **WhatsApp layer** — Inbound/outbound messages via DoubleTick webhook (`POST /api/v1/whatsapp/webhook`)
- **HR Services** — Employee, Leave, Payroll domains with REST endpoints consumed by the web dashboard
- **Auth** — JWT-based (HS256), short-lived access tokens + refresh tokens

---

## License

Internal use only — Nippon Toyota © 2026
