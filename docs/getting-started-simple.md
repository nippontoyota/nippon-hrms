# Nippon Toyota Payslip Portal
## How to Run Everything (Simple Guide)

This guide explains how to run the full Payslip Portal on your computer — the HR website, the backend server, the database, WhatsApp (DoubleTick), and the Cloudflare tunnel that connects WhatsApp to your laptop.

You do **not** need to be a programmer to follow this. Take it one step at a time.

---

## Quick checklist (print this page)

Use this every time you sit down to work:

- [ ] **Step A** — API server is running (Terminal 1)
- [ ] **Step B** — Web dashboard is running (Terminal 2)
- [ ] **Step C** — Cloudflare tunnel is running (Terminal 3) — *only needed for WhatsApp*
- [ ] Open **http://localhost:5173** in your browser and log in
- [ ] DoubleTick webhook points to your current tunnel URL (if you restarted the tunnel, update it)

---

## What is this project?

Think of it as four pieces working together:

| Piece | What it does | Where it runs |
|-------|--------------|---------------|
| **Web dashboard** | HR staff log in, upload employees, upload payroll, send payslips | Your browser at `http://localhost:5173` |
| **API (backend)** | The brain — saves data, builds PDF payslips, talks to WhatsApp | Your computer at `http://localhost:8080` |
| **Supabase** | Online database + login system | On the internet (supabase.com) |
| **DoubleTick** | Sends and receives WhatsApp messages for the company | On the internet (doubletick.io) |

**Why do you need a Cloudflare tunnel?**

When an employee sends a WhatsApp message, DoubleTick needs to tell *your* API about it. But DoubleTick lives on the internet — it cannot reach `localhost` on your laptop. A Cloudflare tunnel gives you a temporary public web address (like `https://something.trycloudflare.com`) that forwards traffic to your API on port 8080.

---

## Part 1 — One-time setup

Do these steps once (or whenever you set up a new computer).

### 1. Install these programs

Download and install each of these on your Windows PC:

1. **Node.js (LTS version)** — from https://nodejs.org  
   Used to run the HR website.

2. **Go (version 1.26 or newer)** — from https://go.dev/dl/  
   Used to run the backend API.

3. **Git** — from https://git-scm.com  
   Used to get the project code (you may already have this).

4. **Cloudflare Tunnel (cloudflared)** — from  
   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/  
   Used to expose your API to the internet for WhatsApp.

**Optional:** **Air** — a tool that restarts the API automatically when you change code.  
Install with: `go install github.com/air-verse/air@latest`

### 2. Get the project code

Open **PowerShell** or **Command Prompt** and go to the project folder:

```
cd E:\Projects\NipponToyota\PayslipPortal
```

If you do not have the code yet, ask your team for the repository location and clone it first.

### 3. Set up Supabase (database + login)

Supabase is a free online service that stores your employee data and handles HR login.

#### 3a. Create or open your project

1. Go to https://supabase.com and sign in.
2. Open your team's project (or create a new one if starting fresh).

#### 3b. Create the database tables

The project includes SQL files that create all needed tables. You run them **by hand** in Supabase — there is no automatic installer.

1. In Supabase, open **SQL Editor** (left menu).
2. Open each file below from the folder `apps\api\migrations\` on your computer.
3. Copy the contents, paste into the SQL Editor, and click **Run**.
4. Run them **in this exact order**:

   | Order | File name |
   |-------|-----------|
   | 1 | `000001_create_employees.sql` |
   | 2 | `000002_create_leaves.sql` |
   | 3 | `000003_create_whatsapp.sql` |
   | 4 | `000004_drop_epf_employee_columns.sql` |
   | 5 | `000005_create_epf_records.sql` |
   | 6 | `000008_create_dispatch_jobs.sql` |
   | 7 | *(Optional test data)* `000006_seed_epf_sample_data.sql` |
   | 8 | *(Optional test user)* `000007_seed_krishnanand_test_user.sql` |

If a file says "already exists," that is usually fine — move on to the next one.

#### 3c. Create an HR login user

1. In Supabase, go to **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter an email and password (for example `hr@yourcompany.com`).
4. Remember these — you will use them to log into the Payslip Portal website.

#### 3d. Copy your Supabase keys

You will need these values in the next section. Find them in Supabase under **Settings** → **API**:

| What to copy | Where it goes later |
|--------------|---------------------|
| **Project URL** (looks like `https://xxxxx.supabase.co`) | `SUPABASE_URL` and `VITE_SUPABASE_URL` |
| **anon public** key | `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` |

Also go to **Settings** → **Database** and copy the **Connection string** (URI format). This becomes `DATABASE_URL`.  
If it asks for a password, use the database password you set when creating the project.

---

### 4. Configure the API (backend)

Create a file called `.env` inside the folder `apps\api\`.

You can copy this template and fill in your real values:

```
HOST=0.0.0.0
PORT=8080
APP_ENV=development

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
JWT_SECRET=pick-a-long-random-password-here-at-least-32-characters

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

DOUBLETICK_API_KEY=your-doubletick-api-key
WABA_PHONE_NUMBER_ID=919876543210
DOUBLETICK_WEBHOOK_SECRET=your-webhook-secret
```

**What each important line means:**

- **DATABASE_URL** — How the API connects to Supabase's database. **Required.** The API will not start without it.
- **JWT_SECRET** — A secret password the server uses internally. **Required.** Make it long and random.
- **SUPABASE_URL** and **SUPABASE_ANON_KEY** — Used to verify HR login. **Required for the dashboard to load data.**
- **DOUBLETICK_API_KEY** — Your DoubleTick API key. **Required to send WhatsApp messages.**
- **WABA_PHONE_NUMBER_ID** — Your company's WhatsApp business phone number, with country code, **no plus sign**. Example for India: `919876543210`. **Required to send WhatsApp messages.**
- **DOUBLETICK_WEBHOOK_SECRET** — A secret you choose and also enter in DoubleTick's dashboard. **Required for WhatsApp messages to reach your API securely.**

> **Tip:** Never share these values publicly or commit them to Git. The `.env` file stays on your computer only.

---

### 5. Configure the web dashboard (frontend)

1. Go to the folder `apps\web\`.
2. Copy the file `.env.local.example` and rename the copy to `.env.local`.
3. Edit `.env.local` and fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use the **same** Project URL and anon key as in the API config above.

The website automatically talks to the API through a built-in connection — you do not need to set a separate API address.

---

### 6. Install project dependencies

Open a terminal in the project root folder and run:

**For the website:**
```
cd E:\Projects\NipponToyota\PayslipPortal
npm install
```

**For the API:**
```
cd E:\Projects\NipponToyota\PayslipPortal\apps\api
go mod download
```

Wait for both to finish. This only needs to be done once (or after the team updates dependencies).

---

### 7. Configure DoubleTick (WhatsApp)

Log into your DoubleTick dashboard (https://doubletick.io or your team's DoubleTick portal).

You need three things from DoubleTick:

1. **API Key** → put in `DOUBLETICK_API_KEY` in `apps\api\.env`
2. **WhatsApp business number** → put in `WABA_PHONE_NUMBER_ID` (country code + number, no `+`)
3. **Webhook secret** → pick a strong random string, put the same value in both:
   - `DOUBLETICK_WEBHOOK_SECRET` in `apps\api\.env`
   - The webhook secret field in DoubleTick's dashboard

The **webhook URL** is set in the next section (after you start the Cloudflare tunnel), because the URL changes each time unless you set up a permanent tunnel.

---

## Part 2 — Every time you work (3 terminals)

You need **three separate terminal windows** open. Think of them as three workers that must stay running.

### Terminal 1 — Start the API (backend)

```
cd E:\Projects\NipponToyota\PayslipPortal\apps\api
go run .\cmd\server
```

**Or**, if you installed Air:
```
cd E:\Projects\NipponToyota\PayslipPortal\apps\api
air
```

**How you know it worked:** You should see a message like `nippon-hrms api starting` on port 8080.

**Quick test:** Open a browser and go to http://localhost:8080/health — you should see a success response.

Leave this terminal open. Do not close it.

---

### Terminal 2 — Start the web dashboard

```
cd E:\Projects\NipponToyota\PayslipPortal
npm run dev
```

**How you know it worked:** It will show a local address, usually http://localhost:5173

**Quick test:** Open http://localhost:5173 in your browser. Log in with the Supabase email and password you created in Part 1.

Leave this terminal open.

---

### Terminal 3 — Start the Cloudflare tunnel (for WhatsApp)

This step is **only needed when you want WhatsApp to work** (employees messaging the bot, or HR sending payslips via WhatsApp).

```
cloudflared tunnel --url http://localhost:8080
```

**How you know it worked:** After a few seconds, it prints a line with a URL like:

```
https://random-words-here.trycloudflare.com
```

**Copy that full URL.** You will need it in two places:

1. **DoubleTick webhook URL** — set this in the DoubleTick dashboard:

   ```
   https://YOUR-TUNNEL-URL.trycloudflare.com/api/v1/whatsapp/webhook
   ```

   Replace `YOUR-TUNNEL-URL` with the actual URL cloudflared gave you.

2. **Quick test** — open this in your browser:

   ```
   https://YOUR-TUNNEL-URL.trycloudflare.com/health
   ```

   You should see the same success response as http://localhost:8080/health

Leave this terminal open while testing WhatsApp.

> **Important:** The free trycloudflare.com URL **changes every time** you restart the tunnel. If you close Terminal 3 and open it again, you must update the webhook URL in DoubleTick with the new address.

---

## Part 3 — Test that everything works

| What to test | How | Good result |
|--------------|-----|-------------|
| API is alive | Visit http://localhost:8080/health | Success / OK response |
| Website works | Visit http://localhost:5173 and log in | Dashboard appears |
| Database connected | Go to Employees page in the dashboard | Employee list loads (may be empty) |
| Tunnel works | Visit https://YOUR-TUNNEL/health | Same OK as local health |
| WhatsApp inbound | From a phone number registered as an employee, send "Hi" to the business WhatsApp number | Bot replies with a menu |
| Send a payslip | In the dashboard, go to Salary, pick a month with payroll data, send a payslip to one employee | PDF arrives on that employee's WhatsApp |

**Test employee (if you ran migration 000007):**

- Employee ID: **9001**
- Name: Krishnanand G
- Mobile: **8590215315**

That phone number must be registered in the employees table for WhatsApp self-service to work.

---

## Part 4 — Common problems and fixes

### The API crashes immediately when I start it

- Check that `apps\api\.env` exists.
- Make sure `DATABASE_URL` is filled in correctly (copy fresh from Supabase).
- Make sure `JWT_SECRET` is filled in (any long random string).

### I can log in but pages show errors or "unauthorized"

- The Supabase URL and anon key in `apps\api\.env` must **match** the ones in `apps\web\.env.local`.
- Restart both the API (Terminal 1) and the website (Terminal 2) after changing env files.

### WhatsApp messages are not sending (payslip dispatch fails)

- Check `DOUBLETICK_API_KEY` and `WABA_PHONE_NUMBER_ID` in `apps\api\.env`.
- The phone number format must include country code with **no** `+` sign (example: `919876543210`).
- Restart the API after changing `.env`.

### Employees message WhatsApp but nothing happens / no bot reply

- Is Terminal 3 (Cloudflare tunnel) still running?
- Is the webhook URL in DoubleTick correct? It must end with `/api/v1/whatsapp/webhook`
- Does the webhook URL match the **current** tunnel URL? (It changes when you restart the tunnel.)
- Does `DOUBLETICK_WEBHOOK_SECRET` in `.env` match what is in DoubleTick's dashboard?
- Is the employee's phone number registered in the employees table?

### The tunnel URL keeps changing

This is normal with the free quick tunnel. Each time you run `cloudflared tunnel --url ...`, you get a new URL. Update DoubleTick's webhook each time, or ask your technical team about setting up a **named permanent tunnel** (advanced, not covered here).

### I changed `.env` but nothing changed

Always **restart the API** (stop Terminal 1 with Ctrl+C, then start it again) after editing environment files. The website also needs a restart after changing `.env.local`.

---

## Part 5 — Daily workflow summary

**Every working session:**

1. Open Terminal 1 → start API (`go run .\cmd\server`)
2. Open Terminal 2 → start website (`npm run dev`)
3. Open Terminal 3 → start tunnel (`cloudflared tunnel --url http://localhost:8080`) — if using WhatsApp
4. Update DoubleTick webhook if the tunnel URL changed
5. Open http://localhost:5173 and work normally

**When you are done:**

- Press **Ctrl+C** in each terminal to stop the servers.
- The website and API stop immediately.
- WhatsApp will stop receiving messages until you start everything again.

---

## Where things live in the project

| Folder / file | Purpose |
|---------------|---------|
| `apps\web\` | HR dashboard (React website) |
| `apps\api\` | Backend server (Go) |
| `apps\api\.env` | Backend secrets and settings |
| `apps\web\.env.local` | Website settings (Supabase login) |
| `apps\api\migrations\` | Database setup SQL files |
| Web address | http://localhost:5173 |
| API address | http://localhost:8080 |
| WhatsApp webhook path | `/api/v1/whatsapp/webhook` |

---

## Need help?

If something still does not work after trying the fixes above, note down:

1. Which step failed
2. The exact error message (screenshot helps)
3. Whether all three terminals are running

Share that with your technical team.

---

*Nippon Toyota Payslip Portal — Internal use only*
