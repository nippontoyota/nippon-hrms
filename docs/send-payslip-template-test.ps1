# Send notification_of_payslip template via DoubleTick API.
# Generates a real payslip PDF from the database, uploads it, then sends the template.
#
# Usage:
#   .\docs\send-payslip-template-test.ps1
#   .\docs\send-payslip-template-test.ps1 -To 918590215315 -EmpId 9001 -Month 6 -Year 2026

param(
    [string]$To = "918590215315",
    [string]$From = "917594086900",
    [string]$EmpId = "9001",
    [int]$Month = 6,
    [int]$Year = 2026
)

$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "apps\api"
$envFile = Join-Path $apiDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile"
    exit 1
}

$apiKey = (Get-Content $envFile | Where-Object { $_ -match '^DOUBLETICK_API_KEY=' }) -replace '^DOUBLETICK_API_KEY=',''
if (-not $apiKey) {
    Write-Error "DOUBLETICK_API_KEY not found in .env"
    exit 1
}

$fromEnv = (Get-Content $envFile | Where-Object { $_ -match '^WABA_PHONE_NUMBER_ID=' }) -replace '^WABA_PHONE_NUMBER_ID=',''
if ($fromEnv) { $From = $fromEnv }

$pdfPath = Join-Path $env:TEMP ("payslip_{0}_{1:D2}_{2}.pdf" -f $EmpId, $Month, $Year)
$filename = Split-Path $pdfPath -Leaf

Write-Host "Generating payslip for employee $EmpId ($Month/$Year) ..."
Push-Location $apiDir
try {
    $genLine = go run ./cmd/genpayslip $EmpId $Month $Year $pdfPath 2>&1 | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

if (-not (Test-Path $pdfPath)) {
    Write-Error "PDF not created: $pdfPath"
    exit 1
}

$empName = "Employee"
if ($genLine -match '\(([^)]+)\)') { $empName = $Matches[1] }

$monthStr = (Get-Culture).DateTimeFormat.GetMonthName($Month)

Write-Host "Uploading $filename ($empName) ..."
$boundary = [System.Guid]::NewGuid().ToString()
$fileBytes = [System.IO.File]::ReadAllBytes($pdfPath)
$enc = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$ms = New-Object System.IO.MemoryStream
$sw = New-Object System.IO.StreamWriter($ms, $enc)
$sw.Write("--$boundary`r`n")
$sw.Write("Content-Disposition: form-data; name=`"file`"; filename=`"$filename`"`r`n")
$sw.Write("Content-Type: application/pdf`r`n`r`n")
$sw.Flush()
$ms.Write($fileBytes, 0, $fileBytes.Length)
$sw.Write("`r`n--$boundary--`r`n")
$sw.Flush()

$uploadResp = Invoke-RestMethod `
    -Uri "https://public.doubletick.io/media/upload" `
    -Method POST `
    -Headers @{ Authorization = $apiKey; Accept = "application/json" } `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $ms.ToArray()

$mediaUrl = $uploadResp.mediaUrl
Write-Host "Uploaded. Sending template to $To ..."

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
                        mediaUrl = $mediaUrl
                        filename = $filename
                    }
                    body = @{
                        placeholders = @($monthStr, "$Year", $empName, $monthStr, "$Year")
                    }
                }
            }
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

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
    Write-Host "`nDone. Title should read: Payslip - $monthStr $Year"
    Write-Host "PDF is for: $empName ($EmpId)"
} catch {
    Write-Host "Request failed: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}
