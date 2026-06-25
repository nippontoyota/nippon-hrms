# Architecture Decision Records

## ADR-001 — WhatsApp as Employee Interface (not a chatbot product)

**Date:** 2026-06-25  
**Status:** Accepted

### Context
Nippon Toyota employees frequently contact HR for payslips, leave status, and maintenance requests. The goal is to reduce HR workload without building a native app.

### Decision
Use the company's verified WhatsApp Business account (via DoubleTick) as the employee self-service channel. WhatsApp is only the transport — all logic lives in the Go backend.

### Consequences
- Employees need no app install
- HR team manages via web dashboard
- Phone numbers are **not** primary identity — Employee ID is

---

## ADR-002 — Supabase as the Single Database

**Date:** 2026-06-25  
**Status:** Accepted

### Decision
Use Supabase for PostgreSQL, Auth, and Storage. No self-managed Postgres.

### Consequences
- Managed infra, built-in row-level security
- supabase-go community client on backend
- @supabase/supabase-js on frontend (for future real-time)

---

## ADR-003 — No Microservices, No Message Queue

**Date:** 2026-06-25  
**Status:** Accepted

### Decision
Single Go binary. No Kafka, no RabbitMQ, no Redis (initially). Background work via goroutines + worker pools.

### Consequences
- Simple ops on Railway
- Easier debugging
- Redis can be added later for session store if scale demands

---

## ADR-004 — Feature-Based Package Layout (Go)

**Date:** 2026-06-25  
**Status:** Accepted

### Decision
Each domain (doubletick, whatsapp) owns its types, service, and handler in one package. Shared utilities live in `pkg/`.

### Structure
```
internal/
  doubletick/   ← API client only, no business logic
  whatsapp/     ← session, state machine, handler
  config/       ← env loading
  middleware/   ← JWT auth
  handler/      ← CRUD handlers (wired to DB)
  router/       ← route declarations only
pkg/
  respond/      ← JSON envelope
  logger/       ← slog wrapper
```
