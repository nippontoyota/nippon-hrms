# Nippon HR Connect — Admin Portal

HR admin UI for Nippon HR Connect (Phase 1). Built with React 19, Vite, Tailwind CSS, TanStack Query, and MSW mocks.

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
| `admin@nippon.local` | `admin123` | Super Admin |
| `hr@nippon.local` | `hr123` | HR Admin |

## Mock API (development)

In dev mode, [MSW](https://mswjs.io/) intercepts all `/api/admin/*` requests. Seed data is derived from HR Excel templates in `public/templates/`.

To connect to the real Go API later:

1. Run the backend on `http://localhost:4000`
2. Disable MSW in `src/main.tsx`
3. Vite proxy rewrites `/api` → backend root

## Excel templates

| File | Purpose |
|------|---------|
| `public/templates/employee_template.xlsx` | Employee master (identity + CTC + bank + reporting manager) |
| `public/templates/salary_template.xlsx` | Monthly salary / payslip input |

Regenerate JSON seed from templates (requires `npm install xlsx`):

```bash
node scripts/parse-hr-excel.mjs
```

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Admin sign-in |
| `/admin` | Dashboard KPIs |
| `/admin/employees` | Employee list + bulk upload preview |
| `/admin/salary` | Payroll upload + period list |
| `/admin/salary/:periodId` | Period detail, PDF preview, Generate & Send |
| `/admin/salary/dispatch/:jobId` | Dispatch progress (3s polling) |
| `/admin/attendance` | Attendance upload |
| `/admin/holidays` | Holiday calendar file per year |
| `/admin/logs/dispatch` | Payslip dispatch log |
| `/admin/logs/leave` | Leave requests |
| `/admin/logs/feedback` | Employee feedback |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with MSW mocks |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Oxlint |
