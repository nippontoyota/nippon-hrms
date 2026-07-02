# Send leave WhatsApp templates via DoubleTick API.
# Usage:  .\docs\send-leave-template-test.ps1
#         .\docs\send-leave-template-test.ps1 -Template leave_rejected_v2 -To 918921764648
#         .\docs\send-leave-template-test.ps1 -Template leave_request_manager_v1 -To 918921764648

param(
    [ValidateSet("leave_approved_v2", "leave_rejected_v2", "leave_request_manager_v1")]
    [string]$Template = "leave_approved_v2",
    [string]$To = "918606723377",
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

if ($Template -eq "leave_approved_v2") {
    $placeholders = @("Krishnanand G", "2", "09 Jun", "10 Jun")
} elseif ($Template -eq "leave_rejected_v2") {
    $placeholders = @("Ananth Krisha T", "1", "15 Jun", "15 Jun", "Insufficient leave balance for this month")
} else {
    $placeholders = @("Rajesh Kumar", "Casual Leave", "01/07/2026", "03/07/2026", "3", "Family function")
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

Write-Host "Sending $Template template to $To from $From ..."

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
    Write-Host "`nDone. ENQUEUED = accepted by DoubleTick (check phone + chat-messages for delivery)."
} catch {
    Write-Host "Request failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
