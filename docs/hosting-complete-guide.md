# Nippon Toyota Payslip Portal
## Complete Hosting Guide — Step by Step

**Who this is for:** A first-year computer science student (or anyone new to deployment) who needs to put the entire Payslip Portal online — website, API, database, and WhatsApp — so HR can use it from any browser without keeping a laptop running.

**Time needed:** Plan 4–8 hours for your first time. Take breaks between sections.

**What you will have when done:**

- HR dashboard in a browser (example: `http://your-server:3000` or `https://payslip.yourcompany.com`)
- Go API running 24/7 behind the website (Docker handles the connection automatically)
- Database and HR login on Supabase
- WhatsApp working through DoubleTick

---

## Choose your hosting path

This project ships with **Docker Compose** — the intended way to run the full stack (API + website + optional local database) with one command:

```
docker compose up --build -d
```

| Path | Best for | Main command |
|------|----------|--------------|
| **Path 1 — Docker (recommended)** | One server (VPS), your PC for testing, or on-prem | `docker compose up --build -d` |
| **Path 2 — Railway + Vercel** | No server to manage; separate cloud hosts for API and website | Deploy via Railway and Vercel dashboards |

**Both paths still use Supabase** (database + HR login) and **DoubleTick** (WhatsApp). Docker bundles the Go API and React website; it does not replace Supabase auth.

**Start with Path 1** if you have (or can rent) a Linux server, or want to test production locally with Docker Desktop.

---

## Before you start — gather these accounts

Create or get access to each of these **before** you begin. Use a personal email you control, or your company email if IT requires it.

| # | Service | Website | What you need it for |
|---|---------|---------|---------------------|
| 1 | GitHub | https://github.com | Stores the project code |
| 2 | Supabase | https://supabase.com | Database + HR login |
| 3 | DoubleTick | https://doubletick.io | Sends/receives WhatsApp |
| 4 | Meta Business | https://business.facebook.com | WhatsApp billing (required for template messages) |
| 5 | **Docker** | https://www.docker.com/products/docker-desktop | Runs API + website together (Path 1) |
| 6 | Railway | https://railway.app | Hosts API only (Path 2) |
| 7 | Vercel | https://vercel.com | Hosts website only (Path 2) |

**On your Windows PC, install these once:**

1. **Git** — https://git-scm.com/download/win — run the installer, click Next through defaults.
2. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ — install, restart PC if asked, open Docker Desktop and wait until it says **Docker is running** (whale icon in system tray).
3. **A code editor** — VS Code from https://code.visualstudio.com is fine.

**For Path 2 only**, also install Node.js LTS and Go (see Path 2 intro).

**Verify Docker** — open PowerShell and run:

```
docker --version
docker compose version
```

Both should print version numbers. If you see "error during connect", open Docker Desktop and wait until it is fully started.

**Verify Git:**

```
git --version
```

## How the pieces connect (read this once)

**Path 1 — Docker:**

```
HR browser  →  port 3000 (web container / nginx)  →  /api proxied internally  →  api container  →  Supabase
Employee phone  →  WhatsApp  →  DoubleTick  →  webhook  →  your server:3000/api/...  →  api container
```

**Path 2 — Railway + Vercel:**

```
HR browser  →  Vercel (website)  →  /api/...  →  Railway (Go API)  →  Supabase
Employee phone  →  WhatsApp  →  DoubleTick  →  webhook  →  Railway API  →  Supabase
```

---

# PATH 1 — Docker Compose (recommended)

Docker runs three containers from `docker-compose.yml` in the project root:

| Container | What it does | Port on your machine |
|-----------|--------------|----------------------|
| **web** | React dashboard + nginx (proxies `/api` to the API container) | **3000** |
| **api** | Go backend (PDFs, payroll, WhatsApp logic) | **8080** |
| **db** | Local Postgres *(optional — only with `--profile local-db`)* | 5432 |

For production hosting, use **Supabase** as the database (`DATABASE_URL` in `.env`) and skip the `db` container.

---

## PATH 1 — Step 1: Set up Supabase

Follow **Part B** below (sections B1–B4): create project, run migrations, create HR users, copy keys. Come back here when you have `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in Notepad.

---

## PATH 1 — Step 2: Create the root `.env` file

Docker Compose reads environment variables from a file named `.env` in the **project root** (not `apps/api/.env`).

1. Open File Explorer → go to `E:\Projects\NipponToyota\PayslipPortal`
2. Find the file `.env.example`
3. Right-click → **Copy** → **Paste** → rename the copy to `.env` (no `.example`)
4. Open `.env` in Notepad or VS Code
5. Fill in every value using your Supabase keys from Part B:

```
HOST=0.0.0.0
PORT=8080
APP_ENV=production

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
JWT_SECRET=make-up-a-long-random-string-at-least-32-characters

SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

DOUBLETICK_API_KEY=your-doubletick-api-key
WABA_PHONE_NUMBER_ID=919876543210
DOUBLETICK_WEBHOOK_SECRET=your-webhook-secret

VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

6. Save and close. **Never commit `.env` to Git** — it is already in `.gitignore`.

> **Tip:** `VITE_*` variables are used when the **web** image is **built**. If you change them later, you must rebuild: `docker compose up --build -d`

---

## PATH 1 — Step 3: Allow your server URL in CORS (one code edit)

The API only accepts browser requests from allowed origins. You must add your Docker website address.

1. Open VS Code → file `apps\api\internal\router\router.go`
2. Find (around line 33):

```
AllowedOrigins:   []string{"http://localhost:5173"},
```

3. Change to include Docker's port **3000** and your production domain when you have one:

```
AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://YOUR-SERVER-IP:3000", "https://payslip.yourcompany.com"},
```

Replace `YOUR-SERVER-IP` with your VPS public IP, or remove that line until you have one.

4. Save the file.

---

## PATH 1 — Step 4: Build and start all containers

1. Open **PowerShell**
2. Go to the project root:

```
cd E:\Projects\NipponToyota\PayslipPortal
```

3. Run:

```
docker compose up --build -d
```

**What this does:**

- `up` — start services
- `--build` — rebuild images (needed after code or `VITE_*` changes)
- `-d` — run in background (detached)

4. First run takes **5–15 minutes** (downloads base images, compiles Go, builds React). Wait until the command returns.

5. Check all containers are running:

```
docker compose ps
```

**Good output:** `api`, `web` show **State** = `running`. (No `db` row unless you used `--profile local-db`.)

6. View logs if something fails:

```
docker compose logs api
docker compose logs web
```

Common API failure: `required environment variable "JWT_SECRET" is not set` → fix `.env` and run `docker compose up --build -d` again.

---

## PATH 1 — Step 5: Test on your machine

| Test | URL | Expected result |
|------|-----|-----------------|
| API health | http://localhost:8080/health | JSON success / OK |
| Website | http://localhost:3000 | Login page |
| API via website proxy | http://localhost:3000/api/v1/... | (after login) dashboard loads data |

1. Open http://localhost:3000 in Chrome or Edge
2. Log in with the HR user you created in Supabase
3. Click **Employees** — list should load without errors

---

## PATH 1 — Step 6: Put Docker on a public server (VPS)

To host 24/7 on the internet (not just your laptop):

### 6a. Rent a Linux server

Examples: DigitalOcean Droplet, Hetzner Cloud, AWS EC2, Azure VM. Choose **Ubuntu 22.04**, at least **2 GB RAM**, region near India.

### 6b. Install Docker on the server

SSH into the server (your provider emails you `ssh root@YOUR-IP`):

```
ssh root@YOUR-SERVER-IP
```

Then run (Ubuntu):

```
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Verify: `docker compose version`

### 6c. Clone the project on the server

```
git clone https://github.com/YOUR-USERNAME/PayslipPortal.git
cd PayslipPortal
```

### 6d. Create `.env` on the server

```
cp .env.example .env
nano .env
```

Paste your real Supabase and DoubleTick values. Save: **Ctrl+O**, Enter, **Ctrl+X**.

### 6e. Update CORS with the server IP

Edit `apps/api/internal/router/router.go` on the server (`nano apps/api/internal/router/router.go`) and add `http://YOUR-SERVER-IP:3000` to `AllowedOrigins`.

### 6f. Open firewall ports

On the server (if `ufw` is enabled):

```
ufw allow 3000/tcp
ufw allow 8080/tcp
ufw reload
```

Also open ports **3000** and **8080** in your cloud provider's **Security Group / Firewall** web console.

### 6g. Start Docker on the server

```
docker compose up --build -d
```

### 6h. Test from your PC browser

- Website: `http://YOUR-SERVER-IP:3000`
- API health: `http://YOUR-SERVER-IP:8080/health`

### 6i. HTTPS (recommended for production)

Browsers and Supabase login work better with HTTPS. Install **Caddy** on the server to get a free certificate:

1. Point a domain DNS **A record** to your server IP (e.g. `payslip.yourcompany.com` → `YOUR-SERVER-IP`)
2. Install Caddy: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
3. Create `/etc/caddy/Caddyfile`:

```
payslip.yourcompany.com {
    reverse_proxy localhost:3000
}
```

4. `systemctl reload caddy`
5. Update Supabase **Authentication** → **URL Configuration** → Site URL = `https://payslip.yourcompany.com`
6. Add `https://payslip.yourcompany.com` to CORS in `router.go`, rebuild: `docker compose up --build -d`

---

## PATH 1 — Step 7: DoubleTick webhook (Docker)

The **web** container's nginx forwards `/api/*` to the API. You can use **one public URL** on port 3000:

**Webhook URL:**

```
http://YOUR-SERVER-IP:3000/api/v1/whatsapp/webhook
```

Or with HTTPS domain:

```
https://payslip.yourcompany.com/api/v1/whatsapp/webhook
```

1. Log in to DoubleTick → **Webhooks** / **Integrations**
2. Paste the URL above
3. Set **webhook secret** = same as `DOUBLETICK_WEBHOOK_SECRET` in your `.env`
4. Save

Test: send **Hi** from an employee phone to your business WhatsApp number.

> **Local dev only:** DoubleTick cannot reach `localhost`. Use a Cloudflare quick tunnel to port 3000: `cloudflared tunnel --url http://localhost:3000`, then put the tunnel URL in DoubleTick.

---

## PATH 1 — Useful Docker commands

| Task | Command |
|------|---------|
| Start (background) | `docker compose up --build -d` |
| Stop | `docker compose down` |
| View logs (follow) | `docker compose logs -f api` |
| Restart after `.env` change (API vars) | `docker compose up --build -d` |
| Rebuild web after `VITE_*` change | `docker compose up --build -d` |
| See running containers | `docker compose ps` |
| Optional local Postgres instead of Supabase | `docker compose --profile local-db up --build -d` |

After changing **only** API code (not env), rebuild API:

```
docker compose up --build -d api
```

---

## PATH 1 — Go-live checklist (Docker)

| # | Test | Pass? |
|---|------|-------|
| 1 | `docker compose ps` — api + web running | |
| 2 | `http://YOUR-URL:3000` — login page | |
| 3 | `http://YOUR-URL:8080/health` — OK | |
| 4 | Log in → **Employees** loads | |
| 5 | Upload payroll → send test payslip → WhatsApp PDF | |
| 6 | Employee sends **Hi** → bot replies | |

---

# PATH 2 — Railway + Vercel (cloud hosting)

Use this path if you do **not** want to manage a server or Docker. You deploy the API and website separately.

**Extra installs for local code edits on Path 2:** Node.js LTS (https://nodejs.org) and Go 1.26+ (https://go.dev/dl/).

## How Path 2 pieces connect

You host **two** cloud services. Supabase and DoubleTick are configured the same as Path 1.

---

# PART A — Get the code on GitHub (Path 2 or VPS)

Skip this section if the code is already on GitHub and you have access.

### A1. Open the project folder in PowerShell

```
cd E:\Projects\NipponToyota\PayslipPortal
```

(Change the path if your project lives somewhere else.)

### A2. Create a GitHub repository

1. Open https://github.com in your browser and log in.
2. Click the **+** icon in the top-right corner.
3. Click **New repository**.
4. In **Repository name**, type: `PayslipPortal`
5. Leave it **Private** if this is company code.
6. **Do not** check "Add a README" (you already have code).
7. Click the green **Create repository** button.
8. GitHub shows a page with setup commands. Keep this tab open.

### A3. Push your local code to GitHub

In PowerShell (still in the project folder):

```
git remote -v
```

If nothing prints, add your GitHub repo (replace `YOUR-USERNAME` with your GitHub username):

```
git remote add origin https://github.com/YOUR-USERNAME/PayslipPortal.git
```

Push the code:

```
git branch -M main
git push -u origin main
```

If GitHub asks you to log in, follow the browser prompt. When it finishes, refresh your GitHub repo page — you should see folders like `apps`, `docs`, etc.

---

# PART B — Set up Supabase (database + HR login)

### B1. Create a production project

1. Go to https://supabase.com and click **Start your project** (or **Sign in** if you have an account).
2. Sign in with GitHub or email.
3. On the dashboard, click the green **New project** button.
4. Fill in:
   - **Organization:** pick yours or create one (name it anything, e.g. `Nippon Toyota`).
   - **Name:** `payslip-portal-prod`
   - **Database Password:** click **Generate a password**, then **copy it immediately** into Notepad or a password manager. You cannot recover this later without a reset.
   - **Region:** choose **South Asia (Mumbai)** or **Southeast Asia (Singapore)** — closest to India.
5. Click **Create new project**.
6. Wait 2–5 minutes. The dashboard shows "Setting up project..." then becomes ready.

### B2. Run database migrations (create all tables)

Migrations are SQL scripts in the project folder. You run them **manually** in Supabase.

1. On your PC, open File Explorer and go to:
   ```
   E:\Projects\NipponToyota\PayslipPortal\apps\api\migrations
   ```
2. In Supabase, look at the **left sidebar**. Click **SQL Editor** (icon looks like `>_`).
3. Click **+ New query** (top right of the SQL Editor area).

**Run each file below, one at a time, in this exact order.** For each file:

- Open the `.sql` file in Notepad or VS Code
- Select all text (Ctrl+A), copy (Ctrl+C)
- Paste into the Supabase SQL Editor
- Click the green **Run** button (or press Ctrl+Enter)
- Wait for "Success" at the bottom. If you see "already exists," that is usually OK — continue to the next file.

| Order | File name | Required for production? |
|-------|-----------|--------------------------|
| 1 | `000001_create_employees.sql` | Yes |
| 2 | `000002_create_leaves.sql` | Yes |
| 3 | `000003_create_whatsapp.sql` | Yes |
| 4 | `000004_drop_epf_employee_columns.sql` | Yes |
| 5 | `000005_create_epf_records.sql` | Yes |
| 6 | `000008_create_dispatch_jobs.sql` | Yes |
| 7 | `000009_fix_leaves_table.sql` | Yes |
| 8 | `000010_create_payroll_records.sql` | Yes |
| 9 | `000014_add_leaves_rejection_reason.sql` | Yes |
| 10 | `000015_whatsapp_last_inbound.sql` | Yes |
| 11 | `000006_seed_epf_sample_data.sql` | No — test data only |
| 12 | `000007_seed_krishnanand_test_user.sql` | No — test employee only |
| 13 | `000011_seed_payroll_jan_may_2026.sql` | No — test payroll only |
| 14 | `000012_seed_payroll_june_2026.sql` | No — test payroll only |
| 15 | `000013_reset_four_employees.sql` | No — test data only |
| 16 | `000016_seed_bharath_chandra.sql` | No — test data only |

**Verify tables exist:**

1. In the left sidebar, click **Table Editor**.
2. You should see tables such as `employees`, `leaves`, `payroll_records`, `dispatch_jobs`, `epf_records`.

### B3. Create HR login users

1. In the left sidebar, click **Authentication**.
2. Click **Users** (under Authentication).
3. Click the green **Add user** button (top right).
4. Select **Create new user**.
5. Enter:
   - **Email:** e.g. `hr@yourcompany.com`
   - **Password:** a strong password (share securely with that HR person)
6. Leave **Auto Confirm User** turned **on**.
7. Click **Create user**.
8. Repeat for each HR person who needs access.

### B4. Copy Supabase keys (you need these many times)

**Project URL and anon key:**

1. In the left sidebar, scroll down and click **Project Settings** (gear icon at the bottom).
2. Click **API** in the sub-menu.
3. On the **Project URL** row, click **Copy**. Paste into Notepad. Label it `SUPABASE_URL`.
4. Under **Project API keys**, find the row labeled **anon** **public**. Click **Copy** on that key. Label it `SUPABASE_ANON_KEY`.

**Database connection string:**

1. Still in Project Settings, click **Database** in the sub-menu.
2. Scroll to **Connection string**.
3. Click the **URI** tab.
4. You see something like:
   ```
   postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Click **Copy**. Paste into Notepad. Label it `DATABASE_URL`.
6. **Important:** Replace `[YOUR-PASSWORD]` in the string with the database password you saved in step B1. If your password has special characters like `@` or `#`, they must be URL-encoded (`@` → `%40`, `#` → `%23`).

### B5. Allow your hosted website to log in

Do this **after** you know your Vercel URL (Part D). You can come back to this step later.

1. Left sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** paste your production website URL, e.g. `https://payslip-portal.vercel.app` (no trailing slash).
3. **Redirect URLs:** click **Add URL**, paste the same URL, click save. Add a second URL: `https://payslip-portal.vercel.app/**` (with `/**` at the end).
4. Click **Save** at the bottom.

Without this, login works on localhost but fails on the hosted site.

---

# PART C — Host the API on Railway

Railway runs your Go backend 24/7 on the internet.

### C1. Sign up and connect GitHub

1. Go to https://railway.app
2. Click **Login** → **Login with GitHub**.
3. Authorize Railway when GitHub asks.
4. You land on the Railway dashboard.

### C2. Create a new project from your repo

1. Click **New Project** (purple button).
2. Click **Deploy from GitHub repo**.
3. If Railway asks to **Configure GitHub App**, click **Configure GitHub App** → select your account → choose **Only select repositories** → pick `PayslipPortal` → **Save**.
4. Back on Railway, click your `PayslipPortal` repository.
5. Railway creates a project and starts deploying. It may fail the first time — that is normal until we configure it.

### C3. Point Railway at the API folder

1. Click the service card (it may be named `PayslipPortal` or similar).
2. Click the **Settings** tab (top of the service panel).
3. Scroll to **Source**.
4. Find **Root Directory** (or **Add Root Directory**). Click it.
5. Type: `apps/api`
6. Click **Update** or checkmark to save.

### C4. Set the build and start commands

Still on the **Settings** tab:

1. Scroll to **Deploy** section.
2. **Custom Build Command:** click **Add**, then enter:
   ```
   go build -o server ./cmd/server
   ```
3. **Custom Start Command:** click **Add**, then enter:
   ```
   ./server
   ```
4. Railway saves automatically.

**Alternative:** Railway can use the Dockerfile in `apps/api`. If build fails with the commands above, remove custom commands and set **Builder** to **Dockerfile** in Settings → Build.

### C5. Add environment variables

1. Click the **Variables** tab (next to Settings).
2. Click **+ New Variable** or **Raw Editor** (Raw Editor is faster for many vars).
3. Add **every** variable below. Replace placeholder text with your real values from Notepad.

```
HOST=0.0.0.0
PORT=8080
APP_ENV=production
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres
JWT_SECRET=make-up-a-random-string-at-least-32-characters-long
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=paste-your-anon-key-here
DOUBLETICK_API_KEY=paste-from-doubletick-dashboard
WABA_PHONE_NUMBER_ID=919876543210
DOUBLETICK_WEBHOOK_SECRET=pick-a-strong-random-secret-you-will-reuse-in-doubletick
```

**What each variable means:**

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → URI (step B4) |
| `JWT_SECRET` | Make up a new long random string for production. Do not reuse a simple word. |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `DOUBLETICK_API_KEY` | DoubleTick dashboard → Settings / Developer → API Key (Part F) |
| `WABA_PHONE_NUMBER_ID` | Your company WhatsApp number: country code + number, **no** plus sign. India example: `919876543210` |
| `DOUBLETICK_WEBHOOK_SECRET` | You invent this string; same value goes in DoubleTick webhook settings later |
| `ALLOWED_ORIGINS` | Comma-separated website URLs, e.g. `http://localhost:5173,https://payslip-portal.vercel.app` — set after Vercel deploy |

**Optional for large payroll runs (~2000 employees):**

```
DISPATCH_WORKERS=30
DISPATCH_ITEM_DELAY_MS=50
```

4. After adding variables, Railway redeploys automatically. Wait until the deployment shows **Active** / green.

### C6. Generate a public URL for the API

1. Click the **Settings** tab.
2. Scroll to **Networking** → **Public Networking**.
3. Click **Generate Domain**.
4. Railway shows a URL like `payslipportal-production.up.railway.app`.
5. Copy the full URL including `https://`. Label it `API_URL` in Notepad.

### C7. Test the API

1. Open a browser.
2. Go to: `https://YOUR-RAILWAY-URL/health`  
   Example: `https://payslipportal-production.up.railway.app/health`
3. **Good result:** JSON like `{"status":"ok"}` or similar success message.
4. **Bad result:** Error page or connection refused → open Railway → **Deployments** tab → click latest deploy → read **View Logs** for errors. Common fix: wrong `DATABASE_URL` or missing `JWT_SECRET`.

---

# PART D — Production config (already in repo)

CORS and the Vercel API proxy are set up in code. You only need to **configure values** after deploy.

### D1. CORS via Railway environment variable

The API reads `ALLOWED_ORIGINS` (comma-separated). On Railway **Variables**, add:

```
ALLOWED_ORIGINS=http://localhost:5173,https://YOUR-VERCEL-URL.vercel.app
```

Replace with your real Vercel URL after the first website deploy. Redeploy the API when you change this.

### D2. Vercel API proxy (`vercel.json`)

After Railway gives you a public URL, from the project root run:

```
node scripts/generate-vercel-json.mjs https://YOUR-RAILWAY-URL.up.railway.app
git add apps/web/vercel.json
git commit -m "Configure Vercel API proxy for production"
git push
```

Or see [docs/railway-vercel-setup.md](railway-vercel-setup.md) for the full checklist.

### D3. Push any remaining changes to GitHub

In PowerShell, from the project root:

```
cd E:\Projects\NipponToyota\PayslipPortal
git push
```

Railway will auto-redeploy the API when it sees the push. Vercel will redeploy when you set it up in Part E.

---

# PART E — Host the website on Vercel

### E1. Sign up and import the project

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**.
3. Authorize Vercel.
4. On the dashboard, click **Add New...** → **Project**.
5. Find `PayslipPortal` in the list. Click **Import** next to it.
6. If you do not see it, click **Adjust GitHub App Permissions** and grant access to the repo.

### E2. Configure build settings

On the **Configure Project** screen:

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite (should auto-detect) |
| **Root Directory** | Click **Edit** → type `apps/web` → **Continue** |
| **Build Command** | `npm run build` (default is fine) |
| **Output Directory** | `dist` (default for Vite) |
| **Install Command** | `npm install` (default) |

### E3. Add environment variables (before first deploy)

Scroll down to **Environment Variables**. Add these two:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL from step B4 |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key from step B4 |

Make sure **Production** is checked for both.

### E4. Deploy

1. Click the **Deploy** button.
2. Wait 1–3 minutes. Vercel shows build logs scrolling.
3. When finished, you see **Congratulations** and a preview image.
4. Click **Visit** or copy the URL (e.g. `https://payslip-portal-abc123.vercel.app`).
5. Save this URL as `WEBSITE_URL` in Notepad.

### E5. Update CORS and Supabase if your URL differs from what you guessed

If your real Vercel URL is different from what you put in `router.go`:

1. Edit `router.go` again with the correct URL.
2. `git commit` and `git push` — Railway redeploys.
3. Go back to Supabase **Authentication** → **URL Configuration** (step B5) and set Site URL + Redirect URLs to your real Vercel URL.

### E6. Redeploy after vercel.json is on main branch

If you created `vercel.json` **after** the first Vercel deploy:

1. Vercel dashboard → your project → **Deployments** tab.
2. Click the **...** menu on the latest deployment → **Redeploy**.

Or push any small change to trigger a new build.

### E7. Test the website

1. Open `WEBSITE_URL` in Chrome or Edge.
2. You should see the Payslip Portal **login page**.
3. Log in with the HR email/password you created in Supabase (step B3).
4. After login, click **Employees** in the sidebar.
5. **Good:** employee list loads (may be empty). **Bad:** red errors or blank page → see Troubleshooting at the end.

---

# PART F — Configure DoubleTick (WhatsApp)

### F1. Get your API key and phone number ID

1. Log in to your DoubleTick dashboard (https://app.doubletick.io or your team's portal).
2. Look for **Settings**, **Developer**, or **API** in the left menu or top navigation.
3. Copy the **API Key** → paste into Railway variable `DOUBLETICK_API_KEY` if not done already (Railway → Variables → edit → redeploy).
4. Note your **WhatsApp Business phone number** in international format without `+`. Example: India number `+91 98765 43210` becomes `919876543210` → Railway variable `WABA_PHONE_NUMBER_ID`.

### F2. Set the webhook URL (production — no laptop tunnel)

1. In DoubleTick, find **Webhooks**, **Integrations**, or **Developer** → **Webhook**.
2. **Webhook URL** field — paste exactly:

```
https://YOUR-RAILWAY-URL/api/v1/whatsapp/webhook
```

Example:
```
https://payslipportal-production.up.railway.app/api/v1/whatsapp/webhook
```

3. **Webhook secret** — paste the **same** string you set as `DOUBLETICK_WEBHOOK_SECRET` in Railway.
4. Click **Save**.

### F3. Approve the payslip WhatsApp template (for bulk send)

Before sending payslips to many employees, submit this template in DoubleTick / Meta Business Manager:

| Field | Value |
|-------|-------|
| Name | `notification_of_payslip` |
| Language | `en` |
| Category | UTILITY |
| Header | DOCUMENT (dynamic PDF per employee) |

**Body text** (exactly 5 variables):

```
📄 *Payslip - {{1}} {{2}}*

Dear *{{3}}*,

Please find attached your payslip for the month of *{{4}} {{5}}*.

For any discrepancies, please reach out to HR.
```

Variable order: `{{1}}` month, `{{2}}` year, `{{3}}` employee name, `{{4}}` month, `{{5}}` year.

Wait for Meta to approve the template (can take hours to days).

---

# PART G — Meta Business Manager (WhatsApp billing)

Template messages fail with **"Business eligibility payment issue"** if Meta has no payment method.

1. Go to https://business.facebook.com and log in with the account that owns your WhatsApp Business number.
2. Click the **gear icon** (Settings) in the bottom-left corner.
3. Click **Accounts** in the left menu → **WhatsApp accounts**.
4. Click your WhatsApp Business account (matches your `WABA_PHONE_NUMBER_ID`).
5. Click **Payment settings** (or the three-dot menu → Payment settings).
6. Click **Add payment method**.
7. Enter credit/debit card details. Confirm this card is linked to **this WhatsApp account**, not only to Business Manager in general.
8. Set it as **default** for this account.
9. Under **Business info**, confirm timezone and currency (INR for India).

---

# PART H — Final go-live test checklist

Run every test on the **hosted** URLs, not localhost.

| # | What to do | Pass? |
|---|------------|-------|
| 1 | Browser → `https://YOUR-RAILWAY-URL/health` | Success JSON |
| 2 | Browser → `https://YOUR-VERCEL-URL` | Login page appears |
| 3 | Log in with Supabase HR user | Dashboard loads |
| 4 | Click **Employees** | List loads, no error toast |
| 5 | Add or upload a test employee | Saves successfully |
| 6 | Go to **Salary**, upload payroll for a month | Records appear |
| 7 | Preview one payslip | PDF opens |
| 8 | Send payslip to one employee with valid mobile | PDF arrives on WhatsApp |
| 9 | From that phone, send **Hi** to business WhatsApp | Bot replies with menu |
| 10 | Check DoubleTick after template send | Utility charge (~₹0.11), not payment error |

---

# PART I — Optional: custom domain

### Website on Vercel

1. Vercel dashboard → your project → **Settings** → **Domains**.
2. Type your domain, e.g. `payslip.yourcompany.com` → **Add**.
3. Vercel shows DNS records (usually a CNAME). Log in to your domain registrar (GoDaddy, Cloudflare, etc.).
4. Add the CNAME record Vercel specifies.
5. Wait up to 48 hours (often minutes). Vercel shows **Valid Configuration** when ready.
6. Update Supabase URL Configuration, CORS in `router.go`, and redeploy.

### API on Railway

1. Railway → service → **Settings** → **Networking** → **Custom Domain**.
2. Enter e.g. `api-payslip.yourcompany.com`.
3. Add the CNAME Railway gives you at your DNS provider.
4. Update `vercel.json` destination URL and DoubleTick webhook to use the new API domain.

---

# PART J — Troubleshooting

### API crashes on Railway (deploy logs show error)

1. Railway → your service → **Deployments** → latest → **View Logs**.
2. **"DATABASE_URL"** or connection refused → fix connection string in Variables; check password encoding.
3. **"JWT_SECRET"** → add the variable in Railway Variables.
4. Redeploy: **Deployments** → **...** → **Redeploy**.

### Website loads but pages show errors / "Network Error"

**Docker:** Check `docker compose logs api` for crashes. Confirm `.env` has `JWT_SECRET` and `DATABASE_URL`. Confirm CORS includes `http://localhost:3000` or your server URL.

**Path 2 (Vercel):**

1. Press **F12** in the browser → **Console** tab. Look for red CORS errors.
   - Fix: add your exact Vercel URL to `AllowedOrigins` in `router.go`, push, wait for Railway redeploy.
2. Press **F12** → **Network** tab → reload → click a failed red `/api/v1/...` request.
   - Fix: check `apps/web/vercel.json` has correct Railway URL; redeploy Vercel.

### Login fails on hosted site only

1. Supabase → **Authentication** → **URL Configuration** — Site URL and Redirect URLs must match your Vercel URL exactly.
2. Vercel → **Settings** → **Environment Variables** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must match production Supabase (not a dev project).
3. Redeploy Vercel after changing env vars.

### WhatsApp inbound does nothing (no bot reply)

1. Confirm DoubleTick webhook URL ends with `/api/v1/whatsapp/webhook`.
2. Confirm `DOUBLETICK_WEBHOOK_SECRET` in Railway **exactly matches** DoubleTick dashboard.
3. Test webhook reachability: browser → `https://YOUR-RAILWAY-URL/health` must work.
4. Employee phone number must exist in the `employees` table with correct mobile format.

### Payslip send fails

1. Check `DOUBLETICK_API_KEY` and `WABA_PHONE_NUMBER_ID` in Railway.
2. Phone format: country code, no `+` (e.g. `919876543210`).
3. Template `notification_of_payslip` must be approved in Meta.
4. Meta payment method must be linked (Part G).

### Works on localhost, broken online

Almost always one of: missing CORS entry, wrong `vercel.json` API URL, wrong Supabase env vars on Vercel, or Supabase URL Configuration not updated.

---

# Quick reference — where everything lives

| What | Where |
|------|-------|
| **Docker start command** | `docker compose up --build -d` (project root) |
| **Docker env file** | `.env` at project root (copy from `.env.example`) |
| **docker-compose.yml** | Project root — defines `api`, `web`, optional `db` |
| Website (Docker) | http://localhost:3000 or your server IP:3000 |
| API (Docker) | http://localhost:8080/health |
| Website (Path 2) | Vercel dashboard → your project URL |
| API (Path 2) | Railway dashboard → Networking → domain |
| Database | supabase.com → your project → Table Editor |
| HR logins | supabase.com → Authentication → Users |
| SQL migrations | `apps\api\migrations\` — run in Supabase SQL Editor |
| CORS config | `apps\api\internal\router\router.go` |
| API proxy (Path 2 only) | `apps\web\vercel.json` |
| Nginx API proxy (Docker) | `apps\web\nginx.conf` — automatic inside web container |

---

# Order of operations (summary)

**Path 1 — Docker (recommended):**

1. Install Docker Desktop (or Docker on Linux VPS)
2. Set up Supabase — Part B (migrations, HR users, keys)
3. Copy `.env.example` → `.env` at project root; fill in all values
4. Add `http://localhost:3000` (and server IP/domain) to CORS in `router.go`
5. Run `docker compose up --build -d`
6. Test http://localhost:3000 (or server IP)
7. Set DoubleTick webhook to `http(s)://YOUR-URL:3000/api/v1/whatsapp/webhook`
8. Link Meta payment method — Part G
9. Run Path 1 go-live checklist

**Path 2 — Railway + Vercel:**

1. Install Git, Node, Go on your PC
2. Push code to GitHub — Part A
3. Create Supabase project — Part B
4. Deploy API on Railway — Part C
5. Edit CORS + create `vercel.json` — Part D
6. Deploy website on Vercel — Part E
7. Update Supabase URL Configuration — Part B5
8. Set DoubleTick webhook to Railway URL — Part F
9. Link Meta payment — Part G
10. Run Part H go-live tests

When all tests pass, share the website URL with HR.

---

*Nippon Toyota Payslip Portal — Complete Hosting Guide — Internal use only*
