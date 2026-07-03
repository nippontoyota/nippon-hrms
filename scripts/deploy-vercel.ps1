# Manual production deploy via Vercel CLI (bypasses Hobby git-author blocks).
# Run as the Vercel team owner, or with that owner's VERCEL_TOKEN set.
#
# Usage:
#   $env:VERCEL_TOKEN = "..."   # owner token from vercel.com/account/tokens
#   $env:VERCEL_ORG_ID = "team_CkKkhsvVRRX5FdsJcY2MtNLr"
#   .\scripts\deploy-vercel.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not $env:VERCEL_TOKEN) {
    Write-Error "Set VERCEL_TOKEN to the Vercel team owner's API token."
}

if (-not $env:VERCEL_ORG_ID) {
    $env:VERCEL_ORG_ID = "team_CkKkhsvVRRX5FdsJcY2MtNLr"
}

$env:VERCEL_PROJECT_ID = "prj_QAf3SUCcqmAqzXSRvzxdPZWiLU95"

Push-Location $root
try {
    npx --yes vercel@49 deploy --prod --yes --token $env:VERCEL_TOKEN
} finally {
    Pop-Location
}
