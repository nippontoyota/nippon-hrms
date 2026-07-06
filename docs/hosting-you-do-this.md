# YOU host Payslip Portal (caveman edition)

**You click. Code on `main` already done.** Stack: Railway = API, Vercel = web, Supabase = DB + login, DoubleTick = WhatsApp.

**Need accounts:** Supabase, Railway, Vercel, DoubleTick, Meta Business, GitHub (`nippon-hrms`).

**Never:** commit `.env`, paste secrets in chat, put keys in git.

---

## quick map (what talks to what)

```
HR browser → VERCEL_URL → /api/* → RAILWAY_URL → Supabase
Employee WhatsApp → DoubleTick → webhook → RAILWAY_URL/api/v1/whatsapp/webhook
```

Write on paper as you go: `RAILWAY_URL`, `VERCEL_URL`.

---

## 0 — fix `apps/api/.env` before Railway copy

Open `apps/api/.env` on PC. Fix these **before** paste to Railway:

| var | now | Railway must be |
|-----|-----|-----------------|
| `APP_ENV` | `development` | `production` |
| `WABA_PHONE_NUMBER_ID` | `+917594086900` | `917594086900` (no `+`) |
| `DOUBLETICK_WEBHOOK_SECRET` | empty | long random string — same in DoubleTick later |
| `JWT_SECRET` | set | ok — reuse or new prod-only |
| `SUPABASE_SERVICE_ROLE_KEY` | set | optional on Railway — storage only |

`ALLOWED_ORIGINS` — not in local `.env`. Add on Railway **after** Vercel URL known (step 4e).

Optional Railway var: `VAULT_ROOT_PASSWORD` — HR privacy mode password on hosted site.

---

## 1 — Supabase

### 1a — pick project

1. go https://supabase.com → sign in
2. **your existing project** `urtbiaobabeyexsfdjhw` = ok for prod if HR ok with same DB
3. OR **New project** → name `payslip-portal-prod` → region Mumbai/Singapore → **generate password** → save password in password manager

### 1b — tables exist?

1. left sidebar → **Table Editor**
2. look for: `employees`, `payroll_records`, `leaves`, `dispatch_jobs`, `epf_records`
3. all there? skip 1c bulk SQL — only run `000016` below if missing `app_settings`

### 1c — run SQL (if fresh or missing tables)

1. sidebar → **SQL Editor**
2. top right → **+ New query**
3. PC: open `E:\Projects\NipponToyota\PayslipPortal\docs\supabase-production-migrations.sql`
4. Notepad: Ctrl+A, Ctrl+C
5. Supabase editor: Ctrl+V
6. bottom right green **Run** (or Ctrl+Enter)
7. bottom panel say Success — if "already exists" usually fine

**Settings tables (required on latest `main`):**

1. **+ New query** again
2. open `apps\api\migrations\000016_create_settings_and_profiles.sql`
3. paste → **Run**
4. Table Editor → confirm `app_settings`, `hr_profiles`

### 1d — HR login

1. sidebar → **Authentication**
2. sub-menu → **Users**
3. top right green **Add user** → **Create new user**
4. fill email (e.g. `hr@company.com`) + password
5. toggle **Auto Confirm User** = ON
6. **Create user**
7. more HR people? repeat 3–6

### 1e — copy keys to Notepad

**API keys:**

1. sidebar bottom → **Project Settings** (gear)
2. left → **API**
3. row **Project URL** → click **Copy** → Notepad label `SUPABASE_URL`
4. section **Project API keys** → row **anon** **public** → **Copy** → label `SUPABASE_ANON_KEY`

**Database URL:**

1. still Project Settings → left **Database**
2. scroll **Connection string**
3. click tab **URI**
4. **Copy** full string → label `DATABASE_URL`
5. string has `[YOUR-PASSWORD]`? replace with DB password from project create
6. password has `@` `#` `~` etc? URL-encode (`@` → `%40`, `#` → `%23`, `~` stays or encode per Supabase docs)

**Site URL for login** — wait until step 4f (need Vercel URL).

---

## 2 — Railway (Go API, runs 24/7)

### 2a — connect repo

1. https://railway.app → **Login** → **Login with GitHub**
2. authorize if GitHub asks
3. dashboard → purple **New Project**
4. **Deploy from GitHub repo**
5. popup **Configure GitHub App**? → pick account → **Only select repositories** → check `nippon-hrms` → **Save**
6. list → click **nippon-hrms**

Deploy may fail first time — normal until step 2b–2d.

### 2b — root folder = API

1. click the service box (says nippon-hrms or similar)
2. top tabs → **Settings**
3. scroll **Source**
4. **Root Directory** → click **Add** or pencil → type exactly: `apps/api`
5. confirm / checkmark

### 2c — build + start commands

same **Settings** tab, scroll **Deploy**:

1. **Custom Build Command** → add:
   ```
   go build -o server ./cmd/server
   ```
2. **Custom Start Command** → add:
   ```
   ./server
   ```

### 2d — paste env vars

tab **Variables** (next to Settings):

1. click **Raw Editor** (fastest) OR **+ New Variable** one by one
2. paste block below — replace `<...>` with Notepad values from step 1e + fixed values from step 0:

```
HOST=0.0.0.0
PORT=8080
APP_ENV=production
DATABASE_URL=<paste from 1e>
JWT_SECRET=<from apps/api/.env>
SUPABASE_URL=<paste from 1e>
SUPABASE_ANON_KEY=<paste from 1e>
DOUBLETICK_API_KEY=<from apps/api/.env>
WABA_PHONE_NUMBER_ID=917594086900
DOUBLETICK_WEBHOOK_SECRET=<invent strong secret — NOT empty>
ALLOWED_ORIGINS=http://localhost:5173
VAULT_ROOT_PASSWORD=<optional — HR privacy unlock password>
```

3. **Save** or click out — Railway auto-redeploys
4. tab **Deployments** → wait latest = **Active** / green

`ALLOWED_ORIGINS` incomplete until Vercel URL — step 4e fixes.

### 2e — public domain

1. **Settings** → scroll **Networking**
2. **Public Networking** → **Generate Domain**
3. Railway shows `https://xxxx.up.railway.app` → **Copy** → Notepad `RAILWAY_URL`

### 2f — smoke test

1. browser new tab
2. go `https://YOUR-RAILWAY-URL/health` (paste real URL)
3. **good:** JSON like `{"status":"ok"}` or similar
4. **bad:** error page → Railway **Deployments** → latest → **View Logs**
   - common: wrong `DATABASE_URL`, missing `JWT_SECRET`, password not URL-encoded

---

## 3 — link Vercel → Railway (`vercel.json`)

Vercel site calls `/api/...` — must proxy to Railway. One-time on PC:

1. Windows key → type `PowerShell` → Enter
2. run:

```
cd E:\Projects\NipponToyota\PayslipPortal
node scripts/generate-vercel-json.mjs https://YOUR-RAILWAY-URL.up.railway.app
```

3. replace URL with real `RAILWAY_URL` from 2e — **no trailing slash**
4. script prints `Wrote apps/web/vercel.json` — good
5. push so Vercel picks it up:

```
git add apps/web/vercel.json
git commit -m "Set production API proxy URL"
git push origin main
```

---

## 4 — Vercel (React website)

### 4a — import repo

1. https://vercel.com → sign in GitHub
2. top **Add New…** → **Project**
3. **Import** next to `nippon-hrms` (grant access if repo hidden)
4. **Configure Project** screen:
   - **Framework Preset:** Vite (auto)
   - **Root Directory:** click **Edit** → type `apps/web` → **Continue**
   - **Build Command:** `npm run build` (default ok)
   - **Output Directory:** `dist` (default ok)

### 4b — env vars BEFORE deploy

scroll **Environment Variables**:

| Key | Value | Environments |
|-----|-------|--------------|
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` from 1e | Production ✓ |
| `VITE_SUPABASE_ANON_KEY` | same as `SUPABASE_ANON_KEY` from 1e | Production ✓ |

click **Add** for each.

### 4c — deploy

1. click **Deploy**
2. wait 1–3 min — log scrolls
3. **Congratulations** screen → **Visit** or copy domain
4. Notepad label `VERCEL_URL` e.g. `https://nippon-hrms-abc.vercel.app`

### 4d — login page only

browser → `VERCEL_URL` → should see Payslip Portal login. Login may fail until 4e+4f.

### 4e — Railway CORS (critical)

1. Railway → API service → **Variables**
2. find `ALLOWED_ORIGINS` → edit to:

```
http://localhost:5173,https://YOUR-EXACT-VERCEL-URL.vercel.app
```

3. must match `VERCEL_URL` exactly — `https`, no `/` at end
4. save → wait redeploy

### 4f — Supabase allow hosted login

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** field → paste `VERCEL_URL` (no trailing slash)
3. **Redirect URLs** → **Add URL** → paste same `VERCEL_URL`
4. **Add URL** again → paste `VERCEL_URL/**` (with `/**`)
5. **Save changes** at bottom

### 4g — full login test

1. browser → `VERCEL_URL`
2. login email/password from step 1d
3. dashboard loads?
4. left sidebar → **Employees** — list or empty, no red error toast
5. F12 → **Console** tab — no CORS errors
6. F12 → **Network** — `/api/v1/...` calls = 200 not 404/403

---

## 5 — DoubleTick (WhatsApp)

### 5a — webhook URL

1. login DoubleTick (https://app.doubletick.io or team portal)
2. find menu: **Settings**, **Developer**, **Webhooks**, or **Integrations** (name varies)
3. **Webhook URL** field → paste:

```
https://YOUR-RAILWAY-URL/api/v1/whatsapp/webhook
```

4. use `RAILWAY_URL` from 2e — must end with `/api/v1/whatsapp/webhook`
5. **Webhook secret** field → paste **exact same** string as `DOUBLETICK_WEBHOOK_SECRET` on Railway
6. **Save**

### 5b — outbound (payslip send)

Already have `DOUBLETICK_API_KEY` + `WABA_PHONE_NUMBER_ID` on Railway from step 2d.

### 5c — inbound test

1. `employees` table must have test employee with real mobile
2. from that phone → WhatsApp business number → send: `Hi`
3. **good:** bot menu reply
4. **bad:** Railway **Deployments** → **View Logs** — look for webhook POST; recheck URL + secret

---

## 6 — Meta Business (billing for templates)

Bulk payslip send needs Meta payment — not just DoubleTick wallet.

1. https://business.facebook.com → login
2. bottom left **Settings** (gear)
3. left **Accounts** → **WhatsApp accounts**
4. click your WABA / number (`917594086900`)
5. **Payment settings** (or ⋮ menu → Payment settings)
6. **Add payment method** → card details
7. set **default** for this WhatsApp account
8. **Business info:** timezone + currency **INR**

### 6b — template `notification_of_payslip` (bulk ~2000 employees)

Submit in DoubleTick / Meta Business Manager:

| field | value |
|-------|-------|
| Name | `notification_of_payslip` |
| Language | `en` |
| Category | UTILITY |
| Header type | DOCUMENT (dynamic PDF) |

Body text — **exactly 5 variables:**

```
📄 *Payslip - {{1}} {{2}}*

Dear *{{3}}*,

Please find attached your payslip for the month of *{{4}} {{5}}*.

For any discrepancies, please reach out to HR.
```

Variable order: `{{1}}` month, `{{2}}` year, `{{3}}` employee name, `{{4}}` month, `{{5}}` year.

Submit → wait Meta approval (hours to days). Test single send before bulk.

---

## 7 — go-live checklist (tick each)

| # | action | ✓ |
|---|--------|---|
| 1 | `RAILWAY_URL/health` returns OK | |
| 2 | `VERCEL_URL` shows login | |
| 3 | HR user logs in | |
| 4 | **Employees** page loads | |
| 5 | add/upload test employee | |
| 6 | **Salary** → upload payroll month | |
| 7 | unlock **Privacy Mode** (vault) → preview payslip PDF | |
| 8 | send payslip to one employee → PDF on WhatsApp | |
| 9 | employee phone sends **Hi** → bot menu | |
| 10 | DoubleTick shows utility charge not payment error | |

Pass all → send `VERCEL_URL` to HR. Turn off laptop tunnel. Done.

---

## when broken

| symptom | fix |
|---------|-----|
| login works local, fails Vercel | Supabase Site URL + Redirect URLs; Vercel `VITE_*` match prod Supabase |
| login ok, pages red errors | Railway `ALLOWED_ORIGINS` missing exact `VERCEL_URL` |
| `/api` 404 on Vercel | re-run `generate-vercel-json.mjs` with right Railway URL, push, Vercel redeploy |
| payslip preview blocked | unlock Privacy Mode on dashboard first |
| WhatsApp send fail | `WABA` no `+`; Meta card linked; template approved |
| WhatsApp inbound dead | webhook URL path; `DOUBLETICK_WEBHOOK_SECRET` match both sides |
| Railway crash on start | logs → `DATABASE_URL` encoding; `JWT_SECRET` present |

---

## strict order (no skip)

```
1. Supabase — tables + HR user + keys (1a–1e)
2. Railway — deploy + vars + domain + /health (2a–2f)
3. PC — generate-vercel-json.mjs + git push (3)
4. Vercel — deploy + ALLOWED_ORIGINS + Supabase URLs (4a–4g)
5. DoubleTick webhook (5)
6. Meta payment + template (6)
7. Checklist (7)
```

**~3–5 hours** your clicks. Meta template approval = extra wait.

*Internal — Nippon Toyota Payslip Portal*
