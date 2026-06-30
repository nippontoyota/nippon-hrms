# Railway + Vercel setup checklist

Use this after code changes for production hosting. Check boxes as you go.

---

## 1. Supabase (you)

- [ ] Go to https://supabase.com → **New project** → name `payslip-portal-prod` → save database password
- [ ] **SQL Editor** → **New query** → paste entire file [supabase-production-migrations.sql](./supabase-production-migrations.sql) → **Run**
- [ ] **Table Editor** — confirm tables: `employees`, `payroll_records`, `leaves`, `dispatch_jobs`, etc.
- [ ] **Authentication** → **Users** → **Add user** → create HR login(s)
- [ ] **Project Settings** → **API** — copy **Project URL** and **anon public** key
- [ ] **Project Settings** → **Database** — copy **URI** connection string → this is `DATABASE_URL`

---

## 2. Railway API (you)

- [ ] https://railway.app → **New Project** → **Deploy from GitHub** → select `PayslipPortal`
- [ ] Service **Settings** → **Root Directory** → `apps/api`
- [ ] **Deploy** → Custom Build Command: `go build -o server ./cmd/server`
- [ ] **Deploy** → Custom Start Command: `./server`
- [ ] **Variables** — add every row below (use production values, not dev placeholders):

| Variable | Example / notes |
|----------|-----------------|
| `HOST` | `0.0.0.0` |
| `PORT` | `8080` |
| `APP_ENV` | `production` |
| `DATABASE_URL` | Supabase URI from step 1 |
| `JWT_SECRET` | New random string, 32+ chars (not your dev secret) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `DOUBLETICK_API_KEY` | From DoubleTick dashboard |
| `WABA_PHONE_NUMBER_ID` | Country code + number, **no** `+` (e.g. `917594086900`) |
| `DOUBLETICK_WEBHOOK_SECRET` | Strong secret — same value goes in DoubleTick later |
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://YOUR-VERCEL-URL.vercel.app` (add custom domain too if used) |

- [ ] **Settings** → **Networking** → **Generate Domain**
- [ ] Test: open `https://YOUR-RAILWAY-URL/health` → success JSON
- [ ] Copy Railway URL for next steps

---

## 3. Generate Vercel API proxy (you or agent)

From project root in PowerShell:

```
node scripts/generate-vercel-json.mjs https://YOUR-RAILWAY-URL.up.railway.app
git add apps/web/vercel.json
git commit -m "Configure Vercel API proxy for production"
git push
```

---

## 4. Vercel website (you)

- [ ] https://vercel.com → **Add New** → **Project** → import `PayslipPortal`
- [ ] **Root Directory** → `apps/web`
- [ ] **Environment Variables** (Production):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

- [ ] **Deploy** → copy live URL (e.g. `https://payslip-portal-xxx.vercel.app`)
- [ ] Update Railway `ALLOWED_ORIGINS` to include that exact Vercel URL → redeploy API
- [ ] Supabase → **Authentication** → **URL Configuration**:
  - **Site URL:** `https://YOUR-VERCEL-URL.vercel.app`
  - **Redirect URLs:** same URL and `https://YOUR-VERCEL-URL.vercel.app/**`

---

## 5. DoubleTick + Meta (you)

- [ ] DoubleTick → **Webhooks** → URL:
  ```
  https://YOUR-RAILWAY-URL/api/v1/whatsapp/webhook
  ```
- [ ] Webhook secret = same as `DOUBLETICK_WEBHOOK_SECRET` on Railway
- [ ] Meta Business Manager → **Settings** → **WhatsApp accounts** → **Payment settings** → add card
- [ ] Approve `notification_of_payslip` template (see [getting-started-simple.md](./getting-started-simple.md))

---

## 6. Go-live tests

| # | Test | Pass? |
|---|------|-------|
| 1 | `https://RAILWAY-URL/health` | |
| 2 | Vercel URL shows login page | |
| 3 | Log in with Supabase HR user | |
| 4 | **Employees** page loads | |
| 5 | Upload payroll → preview PDF | |
| 6 | Send payslip → WhatsApp PDF received | |
| 7 | Employee sends **Hi** → bot menu reply | |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login fails on Vercel only | Supabase Site URL + Redirect URLs; `VITE_*` on Vercel |
| Pages load but API errors | `ALLOWED_ORIGINS` on Railway must include Vercel URL exactly |
| `/api` 404 on Vercel | Regenerate `vercel.json` with correct Railway URL and redeploy |
| WhatsApp inbound silent | DoubleTick webhook URL + secret; Railway logs |
