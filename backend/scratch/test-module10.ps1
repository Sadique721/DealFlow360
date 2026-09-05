# ==============================================================================
# DealFlow360 — Module 10: Customer Portal & Negotiation Test Suite
# ==============================================================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080"
$passCount = 0
$failCount = 0

function Assert-Condition($condition, $message) {
    if ($condition) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
        $script:failCount++
    }
}

Write-Host "=== STARTING MODULE 10: CUSTOMER PORTAL & NEGOTIATION TESTS ===" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Authenticate Sales Rep
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 1: Authenticating Sales Rep ---" -ForegroundColor Yellow
$salesLogin = @{ email = "j.rao@dealflow360.com"; password = "password123" } | ConvertTo-Json
$salesRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $salesLogin -ContentType "application/json"
$salesToken = $salesRes.token
$salesHeaders = @{ Authorization = "Bearer $salesToken"; "Content-Type" = "application/json" }
Assert-Condition ($salesToken -ne $null) "Sales Rep login successful"

# ------------------------------------------------------------------------------
# 2. Step 2: Fetch Products & Customer to Create Test Quotation
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 2: Sales Rep Prepares Quotation with Portal Access ---" -ForegroundColor Yellow
$products = Invoke-RestMethod -Uri "$baseUrl/api/catalog/products" -Method Get -Headers $salesHeaders
$customers = Invoke-RestMethod -Uri "$baseUrl/api/catalog/customers" -Method Get -Headers $salesHeaders

$product = $products[0]
$customer = $customers[0]

$quoteBody = @{
    customerId = $customer.id
    lines = @(
        @{
            productId = $product.id
            quantity = 1
            discountPercent = 0.0
        }
    )
} | ConvertTo-Json

$quotation = Invoke-RestMethod -Uri "$baseUrl/api/quotations" -Method Post -Body $quoteBody -Headers $salesHeaders
Assert-Condition ($quotation.portalToken -ne $null) "Quotation created with Portal Token: $($quotation.portalToken)"

# ------------------------------------------------------------------------------
# 3. Step 3: Unauthenticated Buyer Accesses Portal View
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 3: Unauthenticated External Buyer Views Portal ---" -ForegroundColor Yellow
$portalView = Invoke-RestMethod -Uri "$baseUrl/api/portal/quotations/$($quotation.portalToken)" -Method Get
Assert-Condition ($portalView.quoteNumber -eq $quotation.quoteNumber) "Portal View retrieved quote number: $($portalView.quoteNumber)"
Assert-Condition ($portalView.customerName -eq $customer.name) "Portal View shows customer name: $($portalView.customerName)"
Assert-Condition ($portalView.lines.Count -eq 1) "Portal View includes 1 proposed line item"

# Zero Margin/Cost leakage verification
$hasCostLeakage = $portalView.PSObject.Properties.Name -contains "totalCost" -or $portalView.PSObject.Properties.Name -contains "marginPercentage"
Assert-Condition (-not $hasCostLeakage) "Zero COGS / Margin leakage verified on Portal View DTO"

# ------------------------------------------------------------------------------
# 4. Step 4: Buyer Submits Redline Discussion Message
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 4: Buyer Submits Discussion Message ---" -ForegroundColor Yellow
$msgBody = @{
    message = "Requesting clarifications on delivery SLA and volume incentives."
    senderName = "Acme Procurement Director"
} | ConvertTo-Json

$msgResponse = Invoke-RestMethod -Uri "$baseUrl/api/portal/quotations/$($quotation.portalToken)/message" -Method Post -Body $msgBody -ContentType "application/json"
Assert-Condition ($msgResponse.id -ne $null) "Message posted to quotation thread. Message ID: $($msgResponse.id)"

# ------------------------------------------------------------------------------
# 5. Step 5: Counter-Offer Over Threshold Auto Re-Locks Quote for Approval
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 5: Counter-Offer Over Threshold Re-Locks Quote ---" -ForegroundColor Yellow
$lineId = $portalView.lines[0].lineId
$counterBody = @{
    lineReferenceId = $lineId
    counterDiscountPercent = 35.0
    message = "Proposing 35% discount for bulk commitment."
    senderName = "Acme Procurement Director"
} | ConvertTo-Json

$counterMsg = Invoke-RestMethod -Uri "$baseUrl/api/portal/quotations/$($quotation.portalToken)/message" -Method Post -Body $counterBody -ContentType "application/json"
Assert-Condition ($counterMsg.counterDiscountPercent -eq 35.0) "Counter-discount of 35% recorded on line item"

$confirmResult = Invoke-RestMethod -Uri "$baseUrl/api/portal/quotations/$($quotation.portalToken)/confirm" -Method Post
Assert-Condition ($confirmResult.status -eq "PENDING_APPROVAL") "Confirmation automatically re-locked quotation to PENDING_APPROVAL"
Assert-Condition ($confirmResult.reApprovedRequired -eq $true) "reApprovedRequired flag is true"

# ------------------------------------------------------------------------------
# 6. Step 6: Confirmation Within Policy Threshold Direct Fulfillment
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 6: Confirmation Within Threshold Dispatches Fulfillment ---" -ForegroundColor Yellow
$quoteBody2 = @{
    customerId = $customer.id
    lines = @(
        @{
            productId = $product.id
            quantity = 1
            discountPercent = 2.0
        }
    )
} | ConvertTo-Json

$quotation2 = Invoke-RestMethod -Uri "$baseUrl/api/quotations" -Method Post -Body $quoteBody2 -Headers $salesHeaders
$confirmResult2 = Invoke-RestMethod -Uri "$baseUrl/api/portal/quotations/$($quotation2.portalToken)/confirm" -Method Post

Assert-Condition ($confirmResult2.status -eq "CONFIRMED") "Quotation within standard policy confirmed directly: $($confirmResult2.status)"
Assert-Condition ($confirmResult2.reApprovedRequired -eq $false) "Skipped manager approval successfully"

Write-Host "`n==============================================================================" -ForegroundColor Cyan
$summaryColor = if ($failCount -eq 0) { "Green" } else { "Red" }
Write-Host "MODULE 10 TEST RESULTS: $passCount PASSED, $failCount FAILED" -ForegroundColor $summaryColor
Write-Host "==============================================================================" -ForegroundColor Cyan
