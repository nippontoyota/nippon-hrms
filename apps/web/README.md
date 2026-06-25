# Payslip Portal — Frontend

HR admin UI for Nippon Toyota Payslip Portal. Built with React 19, Vite, Tailwind CSS, TanStack Query, and MSW mocks.

## Quick start

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173

## Demo login

| Email | Password | Role |
|-------|----------|------|
| `admin@nippon.local` | `admin123` | ADMIN |
| `hr@nippon.local` | `hr123` | HR |

## Mock API (development)

In dev mode, [MSW](https://mswjs.io/) intercepts all `/api/*` requests with realistic seed data. No backend required.

To connect to the real Go API later:

1. Run the backend on `http://localhost:4000`
2. Disable MSW in `src/main.tsx` (or add `VITE_USE_MOCK=false`)
3. Vite proxy rewrites `/api` → backend root

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Admin sign-in |
| `/admin` | Dashboard KPIs + recent activity |
| `/admin/employees` | Employee list, Excel import |
| `/admin/employees/new` | Create employee |
| `/admin/employees/:id/edit` | Edit employee |
| `/admin/payslips` | Pay periods + import |
| `/admin/payslips/:periodId` | Period detail, finalize, PDF preview |
| `/admin/send` | Start bulk WhatsApp send |
| `/admin/send/jobs/:jobId` | Send job progress (3s polling) |
| `/admin/holidays` | Holiday calendar CRUD |
| `/admin/tickets` | Maintenance tickets |
| `/admin/audit` | Audit log |

## Design

Light-mode **Kinetic Precision** styling inspired by nipponstock: Space Grotesk / Manrope / Inter typography, electric blue CTAs, Material Symbols icons.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with MSW mocks |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |
