# Vercel deploy workaround (Hobby team / git author block)

## Problem

Vercel Hobby teams do not allow collaborators. When someone who is **not** on the Vercel team pushes to `main`, Vercel blocks the deployment:

> Git author must have access to the team … Hobby teams do not support collaboration.

## Fix

1. **Stop Git auto-deploys** — `apps/web/vercel.json` sets `git.deploymentEnabled.main` to `false` so pushes no longer create blocked deploys.
2. **Deploy with the team owner's token** — `.github/workflows/deploy-vercel.yml` runs `vercel deploy --prod` using `VERCEL_TOKEN` from the project owner. This is not a Git-author check; it uses the token identity.
3. **Use a self-hosted runner** — the workflow uses `runs-on: self-hosted` so **no GitHub Actions minutes** are consumed on a private repo.

## One-time setup

### 1. GitHub secrets (repo → Settings → Secrets → Actions)

| Secret | Value |
|--------|--------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens (create as **team owner**) |
| `VERCEL_ORG_ID` | `team_CkKkhsvVRRX5FdsJcY2MtNLr` |

### 2. Self-hosted runner (on owner PC or any always-on machine)

1. GitHub → `nippontoyota/nippon-hrms` → **Settings** → **Actions** → **Runners** → **New self-hosted runner**
2. Choose **Windows**, follow the download + config commands
3. Install and start the runner service so it stays online

### 3. Vercel dashboard (optional but recommended)

Project **nippon-hrms** → **Settings** → **Git** → disable **Automatic deployments** for Production so only the workflow deploys.

## Deploy paths

| Method | When |
|--------|------|
| Push to `main` (web changes) | Self-hosted runner picks up workflow |
| **Actions** → **Deploy web (Vercel CLI)** → **Run workflow** | Manual trigger |
| `.\scripts\deploy-vercel.ps1` | Local deploy with owner `VERCEL_TOKEN` |

## Immediate deploy (no runner yet)

On the Vercel owner's machine:

```powershell
$env:VERCEL_TOKEN = "<owner-token>"
$env:VERCEL_ORG_ID = "team_CkKkhsvVRRX5FdsJcY2MtNLr"
.\scripts\deploy-vercel.ps1
```
