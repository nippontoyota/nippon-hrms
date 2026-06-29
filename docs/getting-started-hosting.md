# Nippon Toyota Payslip Portal
## How to Host It Online (Simple Guide)

This guide explains how to put the Payslip Portal on the internet so HR can use it from any browser, employees get WhatsApp messages, and you do **not** need a Cloudflare tunnel on your laptop anymore.

You do **not** need to be a programmer to understand the plan. Your developer (or you, with patience) will do the technical steps. This document tells you **what** to set up and **in what order**.

---

## Quick checklist (hosting go-live)

- [ ] Production Supabase project ready (database + HR login users)
- [ ] API hosted online with a permanent URL (example: `https://api.yourcompany.com`)
- [ ] Website hosted online (example: `https://payslip.yourcompany.com`)
- [ ] All environment variables set on the host (secrets, not in Git)
- [ ] Database migrations run on production Supabase
- [ ] Developer updated CORS so the website can talk to the API
- [ ] Developer set up API forwarding from the website (so `/api` works)
- [ ] DoubleTick webhook points to `https://YOUR-API-URL/api/v1/whatsapp/webhook`
- [ ] Meta payment method linked to your WhatsApp Business account
- [ ] End-to-end test: login, upload payroll, send payslip, WhatsApp reply

---

## How to do each checklist item (simple steps)

Work through these in order. Tick each box when done.

### 1. Production Supabase project ready (database + HR login users)

**What this means:** You have a live online database and HR people can log in. This is separate from your dev/test Supabase if you use one locally.

**How to do it:**

1. Go to https://supabase.com and sign in.
2. Click **New project**. Name it something like `payslip-portal-prod`.
3. Pick a region close to India (e.g. Mumbai/Singapore) and set a strong database password. Save the password somewhere safe.
4. Wait until the project finishes creating (a few minutes).
5. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
6. Add one account per HR person (email + password). These are the logins for the hosted website.
7. From **Settings** → **API**, copy and save:
   - Project URL
   - anon public key
8. From **Settings** → **Database**, copy the **Connection string** (URI). You will need it for Railway later.

**Done when:** Project exists, at least one HR user created, and you have URL + keys saved.

---

### 2. API hosted online with a permanent URL

**What this means:** The Go backend runs on a server on the internet 24/7, not on your laptop. It has a URL anyone can reach, like `https://payslip-api-production.up.railway.app`.

**How to do it:**

1. Sign up at https://railway.app (or use Render if your team prefers).
2. Click **New Project** → connect your GitHub repo (PayslipPortal).
3. Add a service for the API. Point it at the `apps/api` folder.
4. Set the start command (your developer may help):
   - Build: `go build -o server ./cmd/server`
   - Start: `./server`
5. Click **Deploy** and wait until the status is green/running.
6. Open **Settings** → **Networking** → **Generate domain**. Railway gives you a URL like `https://something.up.railway.app`.
7. Test in a browser: open `https://YOUR-RAILWAY-URL/health`. You should see a success message.

**Optional:** Add a custom domain like `api-payslip.yourcompany.com` in Railway and point DNS to it.

**Done when:** `/health` works on a public URL and the service stays running without your laptop.

---

### 3. Website hosted online

**What this means:** The HR dashboard (React app) is built and published so people open it in a browser from anywhere.

**How to do it:**

1. Sign up at https://vercel.com or https://pages.cloudflare.com.
2. **Import** your GitHub repo (same PayslipPortal project).
3. Set the project root to `apps/web`.
4. Build settings:
   - Build command: `npm install && npm run build`
   - Output folder: `dist`
5. Add build environment variables (from production Supabase):
   - `VITE_SUPABASE_URL` = your production Project URL
   - `VITE_SUPABASE_ANON_KEY` = your production anon key
6. Click **Deploy**. Wait for the build to finish.
7. You get a URL like `https://payslip-portal.vercel.app` or `https://something.pages.dev`.
8. Open it in a browser. You should see the login page (login may not work fully until steps 6, 7, and Supabase URL config are done).

**Optional:** Connect a custom domain like `payslip.yourcompany.com`.

**Done when:** Login page loads on a public HTTPS URL.

---

### 4. All environment variables set on the host (secrets, not in Git)

**What this means:** Passwords and API keys live in Railway/Vercel dashboards, never committed to GitHub.

**How to do it:**

**On Railway (API service)** → **Variables**, add:

| Variable | Where to get the value |
|----------|------------------------|
| `HOST` | `0.0.0.0` |
| `PORT` | `8080` (or whatever Railway expects) |
| `APP_ENV` | `production` |
| `DATABASE_URL` | Supabase → Settings → Database → connection URI |
| `JWT_SECRET` | Make up a long random string (32+ characters). New for production. |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `DOUBLETICK_API_KEY` | DoubleTick → Settings → Developer → API key |
| `WABA_PHONE_NUMBER_ID` | Your business WhatsApp number, country code, no plus (e.g. `917594086900`) |
| `DOUBLETICK_WEBHOOK_SECRET` | Pick a strong secret; same value goes in DoubleTick webhook settings |

**On Vercel/Cloudflare (website)** → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Production Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Production anon key |

After changing variables, **redeploy** both API and website.

**Done when:** No secrets are in GitHub; both platforms show all variables filled in.

---

### 5. Database migrations run on production Supabase

**What this means:** All tables (employees, payroll, leaves, etc.) exist in the production database.

**How to do it:**

1. On your PC, open the folder `E:\Projects\NipponToyota\PayslipPortal\apps\api\migrations\`.
2. In Supabase (production project), open **SQL Editor**.
3. Open each `.sql` file below, copy all text, paste into SQL Editor, click **Run**. Do them **one at a time, in order**:

   | Order | File |
   |-------|------|
   | 1 | `000001_create_employees.sql` |
   | 2 | `000002_create_leaves.sql` |
   | 3 | `000003_create_whatsapp.sql` |
   | 4 | `000004_drop_epf_employee_columns.sql` |
   | 5 | `000005_create_epf_records.sql` |
   | 6 | `000008_create_dispatch_jobs.sql` |

4. Skip test seed files (`000006`, `000007`) in real production unless you want sample data.

**Done when:** SQL Editor runs each file without errors and the **Table Editor** shows tables like `employees`, `payroll_records`, etc.

---

### 6. Developer updated CORS so the website can talk to the API

**What this means:** The API only accepts browser requests from allowed website addresses. Right now it only allows `localhost`. Your live website URL must be added.

**How to do it (developer):**

1. Open `apps/api/internal/router/router.go` in the code.
2. Find `AllowedOrigins`. It currently lists `http://localhost:5173`.
3. Add your hosted website URL, for example:
   - `https://payslip.yourcompany.com`
   - or `https://payslip-portal.vercel.app` (your real Vercel URL)
4. Commit, push, and redeploy the API on Railway.

**How you know it worked:** Website loads and the Employees page shows data without CORS errors in the browser console (F12 → Console).

**Done when:** HR dashboard pages load data from the API on the hosted URL.

---

### 7. Developer set up API forwarding from the website (so `/api` works)

**What this means:** On your laptop, `/api` secretly forwards to `localhost:8080`. Online, the website host must forward `/api` to your Railway API URL.

**How to do it (developer):**

**If using Vercel:** Create `apps/web/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-RAILWAY-API-URL/api/:path*"
    }
  ]
}
```

Replace `YOUR-RAILWAY-API-URL` with your real API host (no trailing slash).

**If using Cloudflare Pages:** Set up a similar rewrite/proxy rule in Pages settings or `_redirects` / Functions (developer chooses per Cloudflare docs).

Commit, push, redeploy the website.

**How you know it worked:** Log in on the hosted site. If employee list loads, forwarding works.

**Done when:** Browser calls go to `https://your-website.com/api/v1/...` and reach Railway successfully.

---

### 8. DoubleTick webhook points to your production API

**What this means:** When an employee sends a WhatsApp message, DoubleTick notifies your **hosted** API, not a laptop tunnel.

**How to do it:**

1. Log into DoubleTick dashboard.
2. Go to **Webhooks** or **Integration settings** (exact menu name may vary).
3. Set webhook URL to:

   ```
   https://YOUR-RAILWAY-API-URL/api/v1/whatsapp/webhook
   ```

   Example:
   ```
   https://payslip-api-production.up.railway.app/api/v1/whatsapp/webhook
   ```

4. Set the **webhook secret** to the same string as `DOUBLETICK_WEBHOOK_SECRET` in Railway.
5. Save. Redeploy API if you just added the secret.

**How you know it worked:** Send **Hi** from an employee phone to the business WhatsApp number. The bot replies. Railway logs show incoming webhook activity.

**Done when:** Inbound WhatsApp works without Cloudflare tunnel on any laptop.

---

### 9. Meta payment method linked to your WhatsApp Business account

**What this means:** Meta (Facebook) can bill your WhatsApp account for template messages. DoubleTick wallet balance alone is not enough. Without Meta payment, sends fail with "Business eligibility payment issue."

**How to do it:**

1. Go to https://business.facebook.com
2. **Settings** (gear) → **Accounts** → **WhatsApp accounts**
3. Click your business number (e.g. the one ending in your WABA ID)
4. Open **Payment settings** (or three dots → Payment settings)
5. Click **Add payment method** if none is linked
6. Add a credit/debit card. Make sure it is linked to **this WhatsApp account**, not only to Business Manager in general
7. Set it as **default** for this WABA
8. Check **Business info**: timezone and currency (INR) are set

**How you know it worked:** Send a test template from DoubleTick or the API. Message delivers to a phone and wallet shows a utility charge (~₹0.11), not a payment error.

**Done when:** Template messages deliver and DoubleTick chat history does not show "Business eligibility payment issue."

---

### 10. End-to-end test: login, upload payroll, send payslip, WhatsApp reply

**What this means:** The whole system works together on production URLs before HR relies on it.

**How to do it (run through this list on the hosted site):**

| Step | Action | Pass? |
|------|--------|-------|
| A | Open your website URL. Log in with an HR Supabase user. | Dashboard appears |
| B | Go to **Employees**. List loads (or empty list, no error). | |
| C | Upload or add test employee data if needed. | Saves OK |
| D | Go to **Salary** / payroll. Upload payroll for a month. | Records appear |
| E | Preview one payslip PDF. | PDF opens |
| F | Send payslip to one employee with a valid mobile number. | PDF arrives on WhatsApp |
| G | From that employee phone, send **Hi** to the business WhatsApp number. | Bot menu replies |
| H | Check DoubleTick wallet after a template send. | Utility charge, not failed |

**Done when:** All steps pass on production. Tell HR the website URL and turn off dependence on local laptops/tunnels.

---

## Local vs hosted: what changes?

| When running on your laptop | When fully hosted |
|-----------------------------|-------------------|
| Website at `localhost:5173` | Website at a real URL like `https://payslip.yourcompany.com` |
| API at `localhost:8080` | API at a real URL like `https://api.yourcompany.com` |
| Cloudflare tunnel needed for WhatsApp | **No tunnel.** DoubleTick talks to your API URL directly |
| Only you can open the site | HR team opens the site from office or home |
| `.env` files on your PC | Secrets stored in Railway / Vercel / Cloudflare dashboard |

**What stays the same:**

- **Supabase** (database + login) stays on supabase.com
- **DoubleTick** (WhatsApp) stays on doubletick.io
- The same Go API and React website code, just built and deployed

---

## The full picture (hosted)

Think of five online pieces:

| Piece | What it does | Where to host |
|-------|--------------|---------------|
| **Website** | HR dashboard in the browser | Cloudflare Pages, Vercel, or Netlify (static hosting) |
| **API** | Backend: database, PDFs, WhatsApp logic | Railway or Render (runs the Go server 24/7) |
| **Supabase** | PostgreSQL database + HR authentication | supabase.com (already cloud) |
| **DoubleTick** | Send/receive WhatsApp | doubletick.io (already cloud) |
| **Domain (optional)** | Pretty URLs instead of random Railway names | Cloudflare, GoDaddy, Namecheap, etc. |

**Traffic flow:**

1. HR opens `https://payslip.yourcompany.com` in Chrome.
2. Website loads from Cloudflare Pages (or similar).
3. When HR clicks something, the browser calls `/api/v1/...` which forwards to your hosted API.
4. API reads/writes Supabase and sends WhatsApp via DoubleTick.
5. When an employee replies on WhatsApp, DoubleTick calls your API webhook URL on the internet.

**No laptop needs to stay on.** The API runs on Railway (or similar) all the time.

---

## Recommended setup for this project

This matches how the project was designed (single Go server, Supabase, simple ops):

| Service | Suggested provider | Why |
|---------|-------------------|-----|
| API | **Railway** (railway.app) | Easy Go deploy, always on, fits team ADR notes |
| Website | **Cloudflare Pages** or **Vercel** | Free/cheap static hosting, fast globally |
| Database + auth | **Supabase** (production project) | Already used by the app |
| WhatsApp | **DoubleTick** | Already integrated |
| DNS | **Cloudflare** (if you own a domain) | One place for website + optional API subdomain |

You can use Render instead of Railway, or Netlify instead of Vercel. The steps are similar.

**Rough monthly cost (ballpark):**

- Supabase: free tier or ~$25/month for production scale
- Railway API: ~$5 to $20/month depending on usage
- Website hosting: often free on Cloudflare Pages / Vercel
- DoubleTick wallet + Meta WhatsApp conversation fees: pay per template/message (utility ~₹0.11 each in India)
- Domain: ~₹500 to ₹1500/year if you buy one

---

## Part 1: Before you deploy (decisions)

### 1. Production vs development

Use **separate** environments:

| | Development | Production |
|---|-------------|------------|
| Supabase | Dev project (what you use locally) | **New** production project |
| API URL | localhost or dev Railway app | `api.yourcompany.com` |
| Website URL | localhost:5173 | `payslip.yourcompany.com` |
| DoubleTick | Can share one WABA | Same WABA, webhook points to **production** API |

Never point production DoubleTick webhook at someone's laptop tunnel.

### 2. Domain names (optional but recommended)

Examples:

- Website: `payslip.nippontoyota.com` or `hr.nippontoyota.com`
- API: `api-payslip.nippontoyota.com` or `payslip-api.nippontoyota.com`

If you skip a custom domain, Railway and Vercel give you free URLs like `something.up.railway.app`. Those work, but URLs change if you recreate services, and they look less professional.

### 3. Who does what

| Task | Who |
|------|-----|
| Create Railway / Vercel accounts | You or IT |
| Buy/configure domain | You or IT |
| Push code, set env vars, CORS, API proxy | Developer |
| Run SQL migrations on Supabase | Developer or you (SQL Editor) |
| Create HR login users in Supabase | You (HR admin) |
| Set DoubleTick webhook + Meta billing | You + DoubleTick/Meta admin |
| Final testing | You + developer |

---

## Part 2: Set up production Supabase

### Step 1: Create a production project

1. Go to https://supabase.com
2. Create a **new** project (do not reuse dev data for real employee records unless intentional)
3. Pick a strong database password and save it in a password manager

### Step 2: Run database migrations

Same as local setup. In **SQL Editor**, run each file from `apps\api\migrations\` **in order**:

| Order | File |
|-------|------|
| 1 | `000001_create_employees.sql` |
| 2 | `000002_create_leaves.sql` |
| 3 | `000003_create_whatsapp.sql` |
| 4 | `000004_drop_epf_employee_columns.sql` |
| 5 | `000005_create_epf_records.sql` |
| 6 | `000008_create_dispatch_jobs.sql` |
| 7 | *(Optional)* `000006_seed_epf_sample_data.sql` |
| 8 | *(Optional)* `000007_seed_krishnanand_test_user.sql` |

Skip test seed files in real production if you do not want fake employees.

### Step 3: Create HR users

1. Supabase → **Authentication** → **Users** → **Add user**
2. Create accounts for each HR person who will log in
3. They use this email/password on the hosted website login page

### Step 4: Copy keys for later

From **Settings → API**:

- Project URL
- anon public key

From **Settings → Database**:

- Connection string (URI format) for `DATABASE_URL`

### Step 5: Allow your hosted website to log in

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://payslip.yourcompany.com` (your real website URL)
- **Redirect URLs:** add the same URL and `https://payslip.yourcompany.com/**`

Without this, login may fail on the hosted site.

---

## Part 3: Host the API (Railway example)

Your developer deploys the Go app from the `apps/api` folder.

### Step 1: Create Railway project

1. Sign up at https://railway.app
2. **New Project** → **Deploy from GitHub repo** (connect your PayslipPortal repository)
3. Set the **root directory** or **Dockerfile/start command** to build the API:
   - Build: `go build -o server ./cmd/server`
   - Start: `./server`
   - Working directory: `apps/api`

(Railway auto-detects Go in many cases if you point it at `apps/api`.)

### Step 2: Set environment variables on Railway

In Railway → your API service → **Variables**, add everything from local `apps/api/.env`:

```
HOST=0.0.0.0
PORT=8080
APP_ENV=production

DATABASE_URL=postgresql://...   (production Supabase connection string)
JWT_SECRET=long-random-secret-at-least-32-characters

SUPABASE_URL=https://YOUR-PROD-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key

DOUBLETICK_API_KEY=your-key
WABA_PHONE_NUMBER_ID=917594086900
DOUBLETICK_WEBHOOK_SECRET=strong-secret-matching-doubletick
```

**Important:** Railway sets `PORT` automatically in some setups. The Go app reads `PORT` from env (default 8080). Use Railway's assigned port if their docs say to bind to `$PORT`.

Generate a **new** `JWT_SECRET` for production. Do not copy the dev placeholder.

### Step 3: Get your public API URL

After deploy, Railway gives a URL like:

```
https://payslip-api-production.up.railway.app
```

Test it: open `https://YOUR-RAILWAY-URL/health` in a browser. You should see a success JSON response.

### Step 4: Custom domain for API (optional)

Railway → **Settings** → **Custom Domain** → add `api-payslip.yourcompany.com`

In Cloudflare DNS, add a CNAME record pointing to Railway's target.

---

## Part 4: Code change: allow your website to call the API (CORS)

**Developer task.** Today the API only trusts `http://localhost:5173`. For production, add your website URL.

File: `apps/api/internal/router/router.go`

The `AllowedOrigins` list must include your hosted website, for example:

```
https://payslip.yourcompany.com
```

Redeploy the API after this change.

Without CORS, the website loads but API calls fail in the browser.

---

## Part 5: Host the website (Cloudflare Pages or Vercel)

The website is a static React app built with Vite.

### Step 1: Build settings

| Setting | Value |
|---------|-------|
| Root directory | `apps/web` |
| Build command | `npm install && npm run build` |
| Output directory | `dist` |

### Step 2: Environment variables (build time)

Set in Cloudflare Pages / Vercel dashboard:

```
VITE_SUPABASE_URL=https://YOUR-PROD-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

These are baked in at build time. Rebuild after changing them.

### Step 3: Forward `/api` requests to your hosted API

The website code calls `/api/v1/...` (relative path). On your laptop, Vite proxies that to localhost. **Online, you need a rewrite rule.**

**Developer task.** Example for **Vercel** (`apps/web/vercel.json`):

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR-RAILWAY-API-URL/api/:path*"
    }
  ]
}
```

Example for **Cloudflare Pages** (`apps/web/public/_redirects` or Pages Functions): same idea, proxy `/api/*` to your Railway URL.

Replace `YOUR-RAILWAY-API-URL` with your real API host (no trailing slash).

Redeploy the website after adding this file.

### Step 4: Custom domain for website

Point `payslip.yourcompany.com` to Cloudflare Pages or Vercel per their DNS instructions.

### Step 5: Test the website

1. Open `https://payslip.yourcompany.com`
2. Log in with a Supabase HR user
3. Open **Employees** page. Data should load (proves website → API → database works)

---

## Part 6: Configure DoubleTick (production webhook)

**You no longer need Cloudflare tunnel on a laptop.**

### Step 1: Set the webhook URL

In DoubleTick dashboard → **Webhooks** (or integration settings):

```
https://YOUR-API-URL/api/v1/whatsapp/webhook
```

Examples:

- Railway: `https://payslip-api-production.up.railway.app/api/v1/whatsapp/webhook`
- Custom domain: `https://api-payslip.yourcompany.com/api/v1/whatsapp/webhook`

### Step 2: Webhook secret

Set `DOUBLETICK_WEBHOOK_SECRET` in Railway to the **same** value as in DoubleTick.

Restart/redeploy the API after setting it.

### Step 3: Meta payment (required for templates)

Template messages fail with **"Business eligibility payment issue"** if Meta has no valid payment method on the WhatsApp Business account.

Fix in **Meta Business Manager**:

1. business.facebook.com → **Settings** → **WhatsApp accounts**
2. Select your WABA (`917594086900` or your number)
3. **Payment settings** → add/link a credit card to **this** WhatsApp account
4. Confirm timezone, currency (INR), and tax info

DoubleTick wallet balance (₹555) is separate from Meta billing. **Both** may matter.

### Step 4: Test WhatsApp inbound

1. From a phone registered as an employee in the database, send **Hi** to the business WhatsApp number
2. Bot should reply with the menu
3. Check Railway logs if nothing happens (webhook not reaching API)

### Step 5: Test payslip send

1. Log into hosted website
2. Send a payslip to one employee with payroll data
3. Confirm PDF arrives on WhatsApp

---

## Part 7: Security checklist (production)

- [ ] All secrets in Railway/Vercel/Supabase dashboards, **never** in Git
- [ ] `.env` and `.env.local` stay git-ignored (already configured)
- [ ] New strong `JWT_SECRET` for production
- [ ] `DOUBLETICK_WEBHOOK_SECRET` set (signature verification enabled)
- [ ] Supabase: restrict who has project access
- [ ] HR users only via Supabase Auth (no shared passwords)
- [ ] HTTPS everywhere (Railway/Vercel provide this automatically)
- [ ] Optional: IP allowlist on Railway if you want extra lockdown (usually not needed)

---

## Part 8: Team development after go-live

| Work type | Where to develop |
|-----------|------------------|
| Leave system, UI, REST APIs | Local laptops against **dev** Supabase |
| Live WhatsApp testing | **Production** or **staging** API URL only |
| Two developers | Use one **staging** API URL for shared webhook, or take turns updating DoubleTick webhook |

Do **not** point production DoubleTick webhook at a developer's laptop tunnel while HR is using the live system.

**Optional staging environment:** Second Railway app + second Supabase project + subdomain `staging-payslip.yourcompany.com`. DoubleTick webhook can switch to staging when testing big WhatsApp changes.

---

## Part 9: Go-live test plan

Run through this on the **hosted** URLs:

| Test | How | Pass? |
|------|-----|-------|
| API health | Visit `https://YOUR-API-URL/health` | OK response |
| Website loads | Visit `https://YOUR-WEBSITE-URL` | Login page shows |
| Login | Supabase HR user | Dashboard opens |
| Database | Employees list | No errors |
| Upload payroll | Salary section | Records save |
| Preview PDF | Preview one payslip | PDF opens |
| Send payslip | Send to one employee | WhatsApp PDF received |
| WhatsApp inbound | Employee sends Hi | Bot menu reply |
| Template billing | DoubleTick wallet after template send | Utility category, charge appears |
| Two HR users | Both log in separately | Both work |

---

## Part 10: Common problems

### Website loads but every page shows errors

- Check CORS: production website URL must be in `AllowedOrigins`
- Check API rewrite: `/api/v1` must forward to Railway URL
- Open browser DevTools → Network tab → look for red failed `/api` calls

### Login fails on hosted site only

- Supabase **Site URL** and **Redirect URLs** must include your production website URL
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must match production Supabase project

### API crashes on Railway

- Check `DATABASE_URL` (production Supabase, correct password encoding in URI)
- Check `JWT_SECRET` is set
- Read Railway **Deploy logs**

### WhatsApp sends fail

- `DOUBLETICK_API_KEY` and `WABA_PHONE_NUMBER_ID` correct on Railway
- Meta payment method linked to WABA (not just DoubleTick wallet)

### WhatsApp inbound does nothing

- DoubleTick webhook URL must be production API + `/api/v1/whatsapp/webhook`
- `DOUBLETICK_WEBHOOK_SECRET` must match DoubleTick dashboard
- API must be running (Railway service not sleeping/crashed)

### Works locally, broken online

Almost always: missing CORS, missing `/api` rewrite, or wrong Supabase env vars on the host.

---

## Part 11: Summary: order of operations

Do these in order:

1. Create **production Supabase** + run migrations + HR users
2. Deploy **API to Railway** with all env vars
3. Developer adds **CORS** + redeploy API
4. Deploy **website** with Supabase env vars + **API rewrite**
5. Add **custom domains** (optional)
6. Set **DoubleTick webhook** to production API URL
7. Fix **Meta WABA payment** if templates fail
8. Run **go-live test plan**
9. Tell HR the URL and turn off reliance on local laptops

Once this is done, the Payslip Portal runs 24/7 without your computer, without Cloudflare tunnel, and your whole team (including a developer building the leave system) can share one stable webhook URL on staging or production.

---

## Need help?

Give your developer or vendor:

1. This guide
2. Your domain name (if any)
3. Access to GitHub, Railway, Supabase, DoubleTick, Meta Business Manager

For support tickets, include: which URL fails, screenshot of error, and Railway/Supabase log snippet.

---

*Nippon Toyota Payslip Portal. Internal use only.*
