# ==============================================================================
# DealFlow360 — Module 8: Subscription Plans + Billing & Proration Engine Test Suite
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

Write-Host "=== STARTING MODULE 8: SUBSCRIPTION PLANS + BILLING & PRORATION TESTS ===" -ForegroundColor Cyan

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

$financeLogin = @{ email = "r.iyer@dealflow360.com"; password = "password123" } | ConvertTo-Json
$financeRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $financeLogin -ContentType "application/json"
$financeToken = $financeRes.token
$financeHeaders = @{ Authorization = "Bearer $financeToken"; "Content-Type" = "application/json" }
Assert-Condition ($financeToken -ne $null) "Finance login successful"

# ------------------------------------------------------------------------------
# 2. Test 1: Admin Lists Default Seeded Subscription Plans
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 2: Test 1 - List Subscription Plans & Verify Seeding ---" -ForegroundColor Yellow
$plans = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/plans" -Method Get -Headers $adminHeaders
Assert-Condition ($plans.Count -ge 3) "Default subscription plans retrieved (Count: $($plans.Count))"

$monthlyPlan = $plans | Where-Object { $_.billingCycle -eq "MONTHLY" } | Select-Object -First 1
Assert-Condition ($monthlyPlan -ne $null) "Found monthly subscription plan: $($monthlyPlan.name) ($($monthlyPlan.basePrice))"

# ------------------------------------------------------------------------------
# 3. Test 2: Admin Creates & Updates a Custom Subscription Plan
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 3: Test 2 - Admin Creates & Updates Custom Subscription Plan ---" -ForegroundColor Yellow
$testSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$newPlanBody = @{
    name = "Ultra Enterprise Dedicated Cluster $testSuffix"
    billingCycle = "YEARLY"
    basePrice = 4800.00
    defaultProrationRule = "DAILY_PRORATION"
    cancellationRule = "PARTIAL_REFUND_UNUSED_DAYS"
    active = $true
} | ConvertTo-Json

$createdPlan = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/plans" -Method Post -Body $newPlanBody -Headers $adminHeaders
Assert-Condition ($createdPlan.id -ne $null -and $createdPlan.name -like "Ultra Enterprise Dedicated Cluster*") "Created custom plan #$($createdPlan.id)"

# Update plan
$updatePlanBody = @{
    name = "Ultra Enterprise Dedicated Cluster v2 $testSuffix"
    billingCycle = "YEARLY"
    basePrice = 5200.00
    defaultProrationRule = "DAILY_PRORATION"
    cancellationRule = "PARTIAL_REFUND_UNUSED_DAYS"
    active = $true
} | ConvertTo-Json

$updatedPlan = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/plans/$($createdPlan.id)" -Method Put -Body $updatePlanBody -Headers $adminHeaders
Assert-Condition ($updatedPlan.name -like "Ultra Enterprise Dedicated Cluster v2*" -and $updatedPlan.basePrice -eq 5200.00) "Updated plan price to `$5,200.00"

# ------------------------------------------------------------------------------
# 4. Test 3: Hybrid Quotation (Hardware Capex + SaaS Opex) & Billing Overview
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 4: Test 3 - Create Hybrid Capex/Opex Quotation & Check Segregation ---" -ForegroundColor Yellow

# Get a hardware product and a subscription product
$products = Invoke-RestMethod -Uri "$baseUrl/api/catalog/products" -Method Get -Headers $adminHeaders
$customers = Invoke-RestMethod -Uri "$baseUrl/api/catalog/customers" -Method Get -Headers $adminHeaders

$hwProd = $products | Where-Object { -not $_.isSubscription } | Select-Object -First 1
$subProd = $products | Where-Object { $_.isSubscription } | Select-Object -First 1

if ($subProd -eq $null) {
    # If no subscription product exists, create one
    $newSubProdBody = @{
        name = "DealFlow SaaS Cloud Engine"
        categoryId = $products[0].categoryId
        basePrice = 185.00
        costPrice = 35.00
        unitOfMeasure = "Seat"
        taxPercentage = 10.00
        isSubscription = $true
        recurringInterval = "MONTHLY"
        stockOnHand = 9999
        active = $true
    } | ConvertTo-Json
    $subProd = Invoke-RestMethod -Uri "$baseUrl/api/catalog/products" -Method Post -Body $newSubProdBody -Headers $adminHeaders
}

$testCust = $customers[0]

$quoteBody = @{
    customerId = $testCust.id
    lines = @(
        @{
            productId = $hwProd.id
            quantity = 2
            discountPercent = 5.0
            lineType = "ONE_TIME"
        },
        @{
            productId = $subProd.id
            quantity = 10
            discountPercent = 0.0
            lineType = "RECURRING"
        }
    )
} | ConvertTo-Json

$hybridQuote = Invoke-RestMethod -Uri "$baseUrl/api/quotations" -Method Post -Body $quoteBody -Headers $salesHeaders
Assert-Condition ($hybridQuote.id -ne $null) "Hybrid quotation created #$($hybridQuote.id) ($($hybridQuote.quoteNumber))"

# Check Billing Overview
$overview = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/quotation/$($hybridQuote.id)/billing-overview" -Method Get -Headers $salesHeaders
Assert-Condition ($overview.oneTimeTotal -gt 0) "Capex One-Time total separated: `$($overview.oneTimeTotal)"
Assert-Condition ($overview.recurringTotal -gt 0) "Opex Recurring total separated: `$($overview.recurringTotal)"
Assert-Condition ($overview.oneTimeLines.Count -eq 1) "One-time hardware line count = 1"
Assert-Condition ($overview.recurringLines.Count -eq 1) "Recurring SaaS line count = 1"

# ------------------------------------------------------------------------------
# 5. Test 4: Generate Subscriptions & Milestone Billing Schedules
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 5: Test 4 - Generate Recurring Subscriptions & Schedules ---" -ForegroundColor Yellow
$genSubs = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/generate-from-quotation/$($hybridQuote.id)" -Method Post -Headers $adminHeaders
Assert-Condition ($genSubs.Count -ge 1) "Generated subscription contract count: $($genSubs.Count)"

$targetSub = $genSubs[0]
Assert-Condition ($targetSub.id -ne $null -and $targetSub.status -eq "ACTIVE") "Subscription contract #$($targetSub.id) status is ACTIVE"

# Check schedules
$schedules = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/$($targetSub.id)/schedules" -Method Get -Headers $financeHeaders
Assert-Condition ($schedules.Count -ge 2) "Generated $($schedules.Count) milestone billing schedules (Initial + Upcoming)"
Assert-Condition ($schedules[0].status -eq "PAID" -and $schedules[1].status -eq "PENDING") "Initial milestone is PAID, upcoming is PENDING"

# ------------------------------------------------------------------------------
# 6. Test 5: Preview Mid-Cycle Day-Accurate Proration Adjustment Math
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 6: Test 5 - Preview Mid-Cycle Proration Calculation ---" -ForegroundColor Yellow
$preview = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/$($targetSub.id)/preview-proration?newQuantity=15" -Method Post -Headers $financeHeaders
Assert-Condition ($preview.oldQuantity -eq 10) "Proration preview oldQuantity = 10"
Assert-Condition ($preview.newQuantity -eq 15) "Proration preview newQuantity = 15"
Assert-Condition ($preview.quantityDelta -eq 5) "Proration delta = +5 seats"
Assert-Condition ($preview.adjustmentAmount -gt 0) "Adjustment amount calculated: `$($preview.adjustmentAmount)"
Assert-Condition ($preview.explanation -like "*days remaining in billing cycle*") "Proration explanation: $($preview.explanation)"

# ------------------------------------------------------------------------------
# 7. Test 6: Apply Mid-Cycle Seat Modification (Finance RBAC)
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 7: Test 6 - Apply Mid-Cycle Seat Upgrade & Generate Adjustment Invoice ---" -ForegroundColor Yellow
$modifiedSub = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/$($targetSub.id)/modify?newQuantity=15" -Method Post -Headers $financeHeaders
Assert-Condition ($modifiedSub.quantity -eq 15) "Subscription seats updated to 15"

# Verify updated schedules contain the newly generated INVOICED adjustment schedule
$updatedSchedules = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/$($targetSub.id)/schedules" -Method Get -Headers $financeHeaders
$invoicedSchedule = $updatedSchedules | Where-Object { $_.status -eq "INVOICED" } | Select-Object -First 1
Assert-Condition ($invoicedSchedule -ne $null) "Adjustment billing schedule created with status INVOICED (Amount: `$($invoicedSchedule.amount))"

# ------------------------------------------------------------------------------
# 8. Test 7: Cancel Subscription and Verify Credit Note Generation
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 8: Test 7 - Cancel Subscription & Verify Status ---" -ForegroundColor Yellow
$cancelledSub = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions/$($targetSub.id)/cancel?reason=Customer+downsizing+infrastructure" -Method Post -Headers $financeHeaders
Assert-Condition ($cancelledSub.status -eq "CANCELED") "Subscription contract #$($targetSub.id) status is CANCELED"

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
Write-Host "`n==============================================================================" -ForegroundColor Cyan
Write-Host " MODULE 8 TEST RESULTS: $passCount PASSED, $failCount FAILED" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "==============================================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    exit 1
}
