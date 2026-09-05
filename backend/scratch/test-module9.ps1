# ==============================================================================
# DealFlow360 — Module 9: Upsell & Cross-Sell Engine Test Suite
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

Write-Host "=== STARTING MODULE 9: UPSELL & CROSS-SELL ENGINE TESTS ===" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Authenticate Roles
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 1: Authenticating Users ---" -ForegroundColor Yellow

$adminLogin = @{ email = "admin@dealflow360.com"; password = "Admin@123" } | ConvertTo-Json
$adminRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $adminLogin -ContentType "application/json"
$adminToken = $adminRes.token
$adminHeaders = @{ Authorization = "Bearer $adminToken"; "Content-Type" = "application/json" }
Assert-Condition ($adminToken -ne $null) "Admin login successful"

$salesLogin = @{ email = "j.rao@dealflow360.com"; password = "password123" } | ConvertTo-Json
$salesRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $salesLogin -ContentType "application/json"
$salesToken = $salesRes.token
$salesHeaders = @{ Authorization = "Bearer $salesToken"; "Content-Type" = "application/json" }
Assert-Condition ($salesToken -ne $null) "Sales Rep login successful"

# ------------------------------------------------------------------------------
# 2. Test 1: Fetch Available Products
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 2: Fetching Seeded Products ---" -ForegroundColor Yellow
$products = Invoke-RestMethod -Uri "$baseUrl/api/catalog/products" -Method Get -Headers $salesHeaders
Assert-Condition ($products.Count -ge 2) "Retrieved $($products.Count) products from catalog"

$baseProduct = $products[0]
$suggestedProduct = $products[1]
Write-Host "  Base Product: $($baseProduct.name) (ID: $($baseProduct.id))" -ForegroundColor Gray
Write-Host "  Suggested Product: $($suggestedProduct.name) (ID: $($suggestedProduct.id))" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 3. Test 2: Admin Configures an Upsell Rule
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 3: Admin Configures Upsell Rule ---" -ForegroundColor Yellow
$ruleBody = @{
    baseProduct = @{ id = $baseProduct.id }
    suggestedProduct = @{ id = $suggestedProduct.id }
    coPurchaseScore = 0.88
    isPromoted = $true
    promoTag = "RECOMMENDED COMPANION"
    promoDiscountPercent = 5.0
    minMarginThreshold = 15.0
    description = "Bundle suggested accessory with primary product"
} | ConvertTo-Json

$createdRule = Invoke-RestMethod -Uri "$baseUrl/api/upsells/rules" -Method Post -Body $ruleBody -Headers $adminHeaders
Assert-Condition ($createdRule.id -ne $null) "Created Upsell Rule ID: $($createdRule.id)"

$allRules = Invoke-RestMethod -Uri "$baseUrl/api/upsells/rules" -Method Get -Headers $salesHeaders
Assert-Condition ($allRules.Count -ge 1) "Retrieved $($allRules.Count) active upsell rules"

# ------------------------------------------------------------------------------
# 4. Test 3: Create Quotation as Sales Rep
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 4: Sales Rep Creates Quotation ---" -ForegroundColor Yellow
$customers = Invoke-RestMethod -Uri "$baseUrl/api/catalog/customers" -Method Get -Headers $salesHeaders
$customer = $customers[0]

$quoteBody = @{
    customerId = $customer.id
    lines = @(
        @{
            productId = $baseProduct.id
            quantity = 1
            discountPercent = 0.0
        }
    )
} | ConvertTo-Json

$quotation = Invoke-RestMethod -Uri "$baseUrl/api/quotations" -Method Post -Body $quoteBody -Headers $salesHeaders
Assert-Condition ($quotation.id -ne $null) "Quotation created with ID: $($quotation.id), Total: $($quotation.totalAmount)"

# ------------------------------------------------------------------------------
# 5. Test 4: Fetch Upsell Suggestions for Quotation
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 5: Fetch Ranked Upsell Suggestions ---" -ForegroundColor Yellow
$suggestions = Invoke-RestMethod -Uri "$baseUrl/api/upsells/suggestions/$($quotation.id)" -Method Get -Headers $salesHeaders
Assert-Condition ($suggestions.Count -ge 1) "Received $($suggestions.Count) upsell suggestion(s)"

$targetSuggestion = $suggestions | Where-Object { $_.ruleId -eq $createdRule.id } | Select-Object -First 1
Assert-Condition ($targetSuggestion -ne $null) "Created rule suggestion found for product: $($targetSuggestion.suggestedProduct.name)"
Assert-Condition ($targetSuggestion.promoTag -eq "RECOMMENDED COMPANION") "Suggestion has expected promo boost tag: $($targetSuggestion.promoTag)"

# ------------------------------------------------------------------------------
# 6. Test 5: Apply Upsell Suggestion to Quotation
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 6: Apply Upsell Suggestion to Quotation ---" -ForegroundColor Yellow
$updatedQuote = Invoke-RestMethod -Uri "$baseUrl/api/upsells/apply?quotationId=$($quotation.id)&ruleId=$($createdRule.id)" -Method Post -Headers $salesHeaders
Assert-Condition ($updatedQuote.lines.Count -eq 2) "Quotation line count increased to 2 after applying upsell"
Assert-Condition ([double]$updatedQuote.totalAmount -gt [double]$quotation.totalAmount) "Quotation total updated from $($quotation.totalAmount) to $($updatedQuote.totalAmount)"

Write-Host "`n==============================================================================" -ForegroundColor Cyan
$summaryColor = if ($failCount -eq 0) { "Green" } else { "Red" }
Write-Host "MODULE 9 TEST RESULTS: $passCount PASSED, $failCount FAILED" -ForegroundColor $summaryColor
Write-Host "==============================================================================" -ForegroundColor Cyan
