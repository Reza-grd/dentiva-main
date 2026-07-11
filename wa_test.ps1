<#
.SYNOPSIS
    Direct whatsva.id API diagnostic test — calls the API with multiple payload variations
    to identify which format actually results in delivery.

.DESCRIPTION
    CRITICAL FINDING: Official whatsva.id Postman documentation shows:
      "jid": "0895361034833"  ← LOCAL format (leading 0, Indonesian)
    NOT:
      "jid": "628..."         (E.164 format)
      "jid": "628...@s.whatsapp.net" (Baileys JID format)

    V1 = official format per Postman docs (most likely correct)
    V2-V8 = alternative formats for comparison/confirmation

.HOW TO RUN
    1. Fill in $INSTANCE_KEY and $TEST_PHONE (local format: 08xx...)
    2. Run in PowerShell:
       .\wa_test.ps1
#>

# ──────────────────────────────────────────────
# FILL THESE IN BEFORE RUNNING
$INSTANCE_KEY = "PASTE_YOUR_WHATSVA_INSTANCE_KEY_HERE"
$TEST_PHONE   = "6281234567890"   # replace with your own number, no + or spaces
# ──────────────────────────────────────────────

$ENDPOINT = "https://whatsva.id/api/sendMessageText"
$TEST_MSG  = "TEST NEURODENT API DIAGNOSTIC - $(Get-Date -Format 'HH:mm:ss')"

function Call-WhatsvaAPI {
    param(
        [string]$Label,
        [hashtable]$Payload
    )

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  VARIANT: $Label" -ForegroundColor Yellow
    Write-Host "  ENDPOINT: $ENDPOINT" -ForegroundColor Gray
    $payloadJson = $Payload | ConvertTo-Json -Compress
    $payloadDisplay = $Payload.Clone()
    $payloadDisplay["instance_key"] = $payloadDisplay["instance_key"].Substring(0,4) + "..." + $payloadDisplay["instance_key"].Substring($payloadDisplay["instance_key"].Length - 4)
    Write-Host "  REQUEST BODY: $($payloadDisplay | ConvertTo-Json -Compress)" -ForegroundColor White

    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest `
            -Uri $ENDPOINT `
            -Method POST `
            -ContentType "application/json" `
            -Body $payloadJson `
            -UseBasicParsing `
            -ErrorAction Stop

        $elapsed = ((Get-Date) - $startTime).TotalMilliseconds
        Write-Host "  HTTP STATUS: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Green
        Write-Host "  RESPONSE TIME: $([math]::Round($elapsed))ms" -ForegroundColor Gray
        Write-Host "  RAW RESPONSE BODY:" -ForegroundColor White
        Write-Host "    $($response.Content)" -ForegroundColor Green

        try {
            $parsed = $response.Content | ConvertFrom-Json
            Write-Host "  PARSED:" -ForegroundColor White
            Write-Host "    success = $($parsed.success)" -ForegroundColor $(if ($parsed.success) { "Green" } else { "Red" })
            if ($parsed.message) { Write-Host "    message = $($parsed.message)" }
            if ($parsed.detail) { Write-Host "    detail = $($parsed.detail | ConvertTo-Json -Compress)" }
        } catch {
            Write-Host "  (response is not JSON)" -ForegroundColor Yellow
        }

    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDesc = $_.Exception.Response.StatusDescription

        Write-Host "  HTTP STATUS: $statusCode $statusDesc" -ForegroundColor Red

        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "  ERROR BODY: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "  EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Validate inputs
if ($INSTANCE_KEY -eq "PASTE_YOUR_WHATSVA_INSTANCE_KEY_HERE") {
    Write-Host "ERROR: Please fill in INSTANCE_KEY and TEST_PHONE at the top of this script." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   whatsva.id DIRECT API DIAGNOSTIC TEST              ║" -ForegroundColor Cyan
Write-Host "║   Endpoint: $ENDPOINT ║" -ForegroundColor Cyan
Write-Host "║   Instance key length: $($INSTANCE_KEY.Length) chars                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ── Variant 1: OFFICIAL FORMAT from whatsva.id Postman collection ──
# Source: sendMessageText example uses jid: "0895361034833" (local, leading 0)
Call-WhatsvaAPI -Label "V1: jid=0895... LOCAL FORMAT [OFFICIAL DOCS - most likely correct]" -Payload @{
    instance_key = $INSTANCE_KEY
    jid          = "0$($TEST_PHONE.TrimStart('62'))"
    message      = "$TEST_MSG [V1]"
}

Start-Sleep -Seconds 2

# ── Variant 2: E.164 plain (628...) ──
Call-WhatsvaAPI -Label "V2: jid=628... (E.164 plain, no suffix, no @)" -Payload @{
    instance_key = $INSTANCE_KEY
    jid          = $TEST_PHONE
    message      = "$TEST_MSG [V2]"
}

Start-Sleep -Seconds 2

# ── Variant 3: field named "phone" instead of "jid" ──
Call-WhatsvaAPI -Label "V3: phone= (field rename test)" -Payload @{
    instance_key = $INSTANCE_KEY
    phone        = $TEST_PHONE
    message      = "$TEST_MSG [V3]"
}

Start-Sleep -Seconds 2

# ── Variant 4: field named "number" instead of "jid" ──
Call-WhatsvaAPI -Label "V4: number= (field rename test)" -Payload @{
    instance_key = $INSTANCE_KEY
    number       = $TEST_PHONE
    message      = "$TEST_MSG [V4]"
}

Start-Sleep -Seconds 2

# ── Variant 5: field named "to" instead of "jid" ──
Call-WhatsvaAPI -Label "V5: to= (field rename test)" -Payload @{
    instance_key = $INSTANCE_KEY
    to           = $TEST_PHONE
    message      = "$TEST_MSG [V5]"
}

Start-Sleep -Seconds 2

# ── Variant 6: field named "target" ──
Call-WhatsvaAPI -Label "V6: target= (field rename test)" -Payload @{
    instance_key = $INSTANCE_KEY
    target       = $TEST_PHONE
    message      = "$TEST_MSG [V6]"
}

Start-Sleep -Seconds 2

# ── Variant 7: apikey instead of instance_key (old API style) ──
Call-WhatsvaAPI -Label "V7: apikey= instead of instance_key" -Payload @{
    apikey  = $INSTANCE_KEY
    jid     = $TEST_PHONE
    message = "$TEST_MSG [V7]"
}

Start-Sleep -Seconds 2

# ── Variant 8: msg field instead of message ──
Call-WhatsvaAPI -Label "V8: msg= instead of message" -Payload @{
    instance_key = $INSTANCE_KEY
    jid          = $TEST_PHONE
    msg          = "$TEST_MSG [V8]"
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DONE. Check whatsva.id dashboard message log" -ForegroundColor Yellow
Write-Host "  to see which variant (V1-V8) appears and its status." -ForegroundColor Yellow
Write-Host "  Also check which message(s) actually arrived on your phone." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
