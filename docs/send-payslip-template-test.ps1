# Send notification_of_payslip template via DoubleTick API.
# Usage:  .\docs\send-payslip-template-test.ps1
#         .\docs\send-payslip-template-test.ps1 -To 918921764648

param(
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

$body = @{
    messages = @(
        @{
            to   = $To
            from = $From
            content = @{
                templateName = "notification_of_payslip"
                language     = "en"
                templateData = @{
                    header = @{
                        type     = "DOCUMENT"
                        mediaUrl = "https://data-storage.doubletick.io/org_DmNRrv7iaw/templates/c0b6f1f3-3e20-4bc5-84c2-72ae45be0730.pdf"
                        filename = "payslip_sample.pdf"
                    }
                    body = @{
                        placeholders = @("Krishnanand G", "June", "Krishnanand G", "June", "2026")
                    }
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "Sending template to $To from $From ..."

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
