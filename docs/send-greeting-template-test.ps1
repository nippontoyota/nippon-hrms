# Send employee greeting WhatsApp templates to an individual employee via DoubleTick API.
# Usage:
#   .\docs\send-greeting-template-test.ps1
#   .\docs\send-greeting-template-test.ps1 -Template employee_work_anniversary_v1 -To 918590215315

param(
    [ValidateSet("employee_birthday_v1", "employee_work_anniversary_v1")]
    [string]$Template = "employee_birthday_v1",
    [string]$To = "918590215315",
    [string]$From = "917594086900"
)

$envFile = Join-Path $PSScriptRoot "..\apps\api\.env"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile"
    exit 1
}

$apiKey = (Get-Content $envFile | Where-Object { $_ -match '^DOUBLETICK_API_KEY=' }) -replace '^DOUBLETICK_API_KEY=',''
if (-not $apiKey) {
    Write-Error "DOUBLETICK_API_KEY not found in .env"
    exit 1
}

if ($Template -eq "employee_birthday_v1") {
    $placeholders = @("Krishnanand G", "03 Jul")
} else {
    $placeholders = @("Krishnanand G", "15 Mar 2019", "7 years")
}

$body = @{
    messages = @(
        @{
            to   = $To
            from = $From
            content = @{
                templateName = $Template
                language     = "en"
                templateData = @{
                    body = @{
                        placeholders = $placeholders
                    }
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Sending $Template template to employee $To from $From ..."

try {
    $response = Invoke-RestMethod `
        -Uri "https://public.doubletick.io/whatsapp/message/template" `
        -Method POST `
        -Headers @{
            Authorization  = $apiKey
            accept         = "application/json"
            "content-type" = "application/json"
        } `
        -Body $body

    $response | ConvertTo-Json -Depth 10
    Write-Host "`nDone. ENQUEUED = accepted by DoubleTick (check the employee's WhatsApp for delivery)."
} catch {
    Write-Host "Request failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
