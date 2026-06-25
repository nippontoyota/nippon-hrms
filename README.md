# Nippon Toyota Payslip Portal

> HR admin for employees, monthly payslips, and bulk WhatsApp delivery.

---

## Monorepo Structure

```
PayslipPortal/
├── apps/
│   ├── web/        # Frontend — React · Vite · Tailwind (Payslip Portal UI)
│   └── api/        # Backend  — Go (separate dev; not required for frontend mocks)
├── docs/
└── package.json    # Root scripts → apps/web
```

---

## Quick Start (frontend)

From the repo root:

```bash
npm install
npm run dev          # http://localhost:5173
```

Or from `apps/web` directly:

```bash
cd apps/web
npm install
npm run dev
```

**Demo login:** `admin@nippon.local` / `admin123`

See [`apps/web/README.md`](apps/web/README.md) for routes, MSW mocks, and API notes.

---

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
