<#
.SYNOPSIS
    Checks the whatsva.id device/session status using the official deviceStatus API.

.DESCRIPTION
    Uses the endpoint documented in the official Postman collection:
    POST https://whatsva.id/api/deviceStatus { "instance_key": "..." }

.HOW TO RUN
    1. Fill in $INSTANCE_KEY below
    2. Run: .\wa_status_check.ps1
#>

$INSTANCE_KEY = "PASTE_YOUR_WHATSVA_INSTANCE_KEY_HERE"
$ENDPOINT = "https://whatsva.id/api/deviceStatus"

if ($INSTANCE_KEY -eq "PASTE_YOUR_WHATSVA_INSTANCE_KEY_HERE") {
    Write-Host "ERROR: Fill in INSTANCE_KEY first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  whatsva.id Device Status Check" -ForegroundColor Cyan
Write-Host "  Key length: $($INSTANCE_KEY.Length) chars" -ForegroundColor Cyan
Write-Host "  Key prefix: $($INSTANCE_KEY.Substring(0,4))..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$body = @{ instance_key = $INSTANCE_KEY } | ConvertTo-Json -Compress

try {
    $response = Invoke-WebRequest `
        -Uri $ENDPOINT `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-Host "HTTP Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Raw Response:" -ForegroundColor White
    Write-Host $response.Content -ForegroundColor Green

    try {
        $parsed = $response.Content | ConvertFrom-Json
        Write-Host ""
        Write-Host "--- PARSED ---" -ForegroundColor Yellow
        $parsed | Format-List
    } catch {
        Write-Host "(Response is not JSON)" -ForegroundColor Yellow
    }

} catch {
    Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    } catch {
        Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
}
