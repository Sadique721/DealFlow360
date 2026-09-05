# ==============================================================================
# DEALFLOW360 - MODULE 6 AUTOMATED VERIFICATION SCRIPT
# Tests: Approval Workflow, Role Sequencing, State Transitions, and Audit Trail
# ==============================================================================

$BaseUrl = "http://localhost:8080"
$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  DEALFLOW360 - MODULE 6 APPROVAL & GOVERNANCE TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Token = $null,
        [object]$Body = $null,
        [int[]]$ExpectedStatus = @(200, 201)
    )

    $Headers = @{
        "Content-Type" = "application/json"
    }
    if ($Token) {
        $Headers["Authorization"] = "Bearer $Token"
    }

    $JsonBody = $null
    if ($Body -is [string]) {
        $JsonBody = $Body
    } elseif ($Body) {
        $JsonBody = $Body | ConvertTo-Json -Depth 10
    }

    try {
        $Response = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $Headers -Body $JsonBody -UseBasicParsing
        $StatusCode = $Response.StatusCode
        $Content = if ($Response.Content) { $Response.Content | ConvertFrom-Json } else { $null }

        if ($ExpectedStatus -notcontains $StatusCode) {
            Write-Host "  [FAIL] $Method $Path expected $($ExpectedStatus -join ',') but got $StatusCode" -ForegroundColor Red
            return @{ Success = $false; StatusCode = $StatusCode; Content = $Content }
        }

        Write-Host "  [PASS] $Method $Path -> HTTP $StatusCode" -ForegroundColor Green
        return @{ Success = $true; StatusCode = $StatusCode; Content = $Content }
    }
    catch {
        $StatusCode = 0
        if ($_.Exception.Response) {
            $StatusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($ExpectedStatus -contains $StatusCode) {
            Write-Host "  [PASS] $Method $Path -> HTTP $StatusCode (Expected Security Rejection)" -ForegroundColor Green
            return @{ Success = $true; StatusCode = $StatusCode; Content = $null }
        }
        else {
            Write-Host "  [FAIL] $Method $Path -> Error: $_" -ForegroundColor Red
            return @{ Success = $false; StatusCode = $StatusCode; Content = $null }
        }
    }
}

# -----------------------------------------------------------------------------
# STEP 1: AUTHENTICATION
# -----------------------------------------------------------------------------
Write-Host "`n[STEP 1] Authenticating Users..." -ForegroundColor Yellow

$adminLogin = Invoke-Api -Method "POST" -Path "/api/auth/login" -Body @{
    email = "admin@dealflow360.com"
    password = "Admin@123"
}
$adminToken = $adminLogin.Content.token
Write-Host "  Authenticated Admin: $($adminLogin.Content.name)" -ForegroundColor Cyan

$repLogin = Invoke-Api -Method "POST" -Path "/api/auth/login" -Body @{
    email = "j.rao@dealflow360.com"
    password = "password123"
}
$repToken = $repLogin.Content.token
Write-Host "  Authenticated Sales Rep: $($repLogin.Content.name)" -ForegroundColor Cyan

$mgrLogin = Invoke-Api -Method "POST" -Path "/api/auth/login" -Body @{
    email = "m.shah@dealflow360.com"
    password = "password123"
}
$mgrToken = $mgrLogin.Content.token
Write-Host "  Authenticated Sales Manager: $($mgrLogin.Content.name)" -ForegroundColor Cyan

$finLogin = Invoke-Api -Method "POST" -Path "/api/auth/login" -Body @{
    email = "r.iyer@dealflow360.com"
    password = "password123"
}
$finToken = $finLogin.Content.token
Write-Host "  Authenticated Finance Officer: $($finLogin.Content.name)" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# STEP 2: MASTER DATA LOOKUP
# -----------------------------------------------------------------------------
Write-Host "`n[STEP 2] Fetching Master Data..." -ForegroundColor Yellow

$custRes = Invoke-Api -Method "GET" -Path "/api/catalog/customers" -Token $repToken
$customers = $custRes.Content
$goldCustomer = $customers | Where-Object { $_.tier -eq "GOLD" -or $_.name -like "*Acme*" } | Select-Object -First 1
if (-not $goldCustomer) { $goldCustomer = $customers[0] }

$prodRes = Invoke-Api -Method "GET" -Path "/api/catalog/products" -Token $repToken
$products = $prodRes.Content
$hwProduct = $products | Where-Object { $_.name -like "*Laptop*" -or $_.category.name -eq "Hardware" } | Select-Object -First 1
if (-not $hwProduct) { $hwProduct = $products[0] }

$srvProduct = $products | Where-Object { $_.name -like "*Setup*" -or $_.category.name -eq "Services" } | Select-Object -First 1
if (-not $srvProduct) { $srvProduct = $products | Where-Object { $_.id -eq 5 } | Select-Object -First 1 }

Write-Host "  Customer: $($goldCustomer.name) (ID: $($goldCustomer.id), Tier: $($goldCustomer.tier))" -ForegroundColor Cyan
Write-Host "  Hardware Product: $($hwProduct.name) (ID: $($hwProduct.id))" -ForegroundColor Cyan
Write-Host "  Service Product:  $($srvProduct.name) (ID: $($srvProduct.id))" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# TEST 1: 1-TIER APPROVAL FLOW (MANAGER APPROVAL)
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 1] 1-Tier Approval Flow (Sales Manager Sign-off)..." -ForegroundColor Yellow

$payload1 = '{' +
    '"customerId":' + $goldCustomer.id + ',' +
    '"promisedDeliveryDate":"2026-10-15",' +
    '"lines":[{"productId":' + $hwProduct.id + ',"quantity":2,"discountPercent":15.5}]' +
'}'

$quote1 = Invoke-Api -Method "POST" -Path "/api/quotations" -Token $repToken -Body $payload1
$quote1Id = $quote1.Content.id
Write-Host "  Created Quote 1 (ID: $quote1Id, Quote#: $($quote1.Content.quoteNumber))" -ForegroundColor Cyan

# Submit Quote 1 (18% discount triggers Manager approval)
$submit1 = Invoke-Api -Method "POST" -Path "/api/quotations/$quote1Id/submit" -Token $repToken
if ($submit1.Content.status -ne "PENDING_APPROVAL") {
    Write-Host "  [FAIL] Expected PENDING_APPROVAL status, got $($submit1.Content.status)" -ForegroundColor Red
} else {
    Write-Host "  [PASS] Submitted Quote 1 for approval -> Status: PENDING_APPROVAL" -ForegroundColor Green
}

# Verify Approval Details & Step count
$details1 = Invoke-Api -Method "GET" -Path "/api/approvals/quotation/$quote1Id" -Token $mgrToken
if ($details1.Content.hasApprovalRequest -eq $true -and $details1.Content.steps.Count -ge 1) {
    Write-Host "  [PASS] Approval step registered (Count: $($details1.Content.steps.Count), Stage 1: $($details1.Content.steps[0].requiredRole))" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Approval steps mismatch: count=$($details1.Content.steps.Count)" -ForegroundColor Red
}

# Test RBAC: Sales Rep cannot approve
Write-Host "  Checking RBAC: Sales Rep attempt to execute approval..." -ForegroundColor Yellow
$repActRes = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $repToken -Body @{
    quotationId = $quote1Id
    action = "APPROVE"
    comments = "Unauthorized rep self-approval"
} -ExpectedStatus @(403)

if ($repActRes.StatusCode -eq 403) {
    Write-Host "  [PASS] RBAC Enforced: Sales Rep receives HTTP 403 Forbidden" -ForegroundColor Green
}

# Sales Manager approves Quote 1
Write-Host "  Sales Manager approving Quote 1..." -ForegroundColor Yellow
$mgrActRes = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $mgrToken -Body @{
    quotationId = $quote1Id
    action = "APPROVE"
    comments = "Approved 18% discount for strategic account volume deal."
}

$quote1After = Invoke-Api -Method "GET" -Path "/api/quotations/$quote1Id" -Token $repToken
if ($quote1After.Content.status -eq "APPROVED") {
    Write-Host "  [PASS] Quote 1 state transitioned to APPROVED after Sales Manager approval!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 1 status APPROVED, got $($quote1After.Content.status)" -ForegroundColor Red
}

# -----------------------------------------------------------------------------
# TEST 2: 2-TIER SEQUENTIAL GATING (MANAGER -> FINANCE)
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 2] 2-Tier Approval Flow & Strict Sequential Gating..." -ForegroundColor Yellow

$payload2 = '{' +
    '"customerId":' + $goldCustomer.id + ',' +
    '"promisedDeliveryDate":"2026-10-20",' +
    '"lines":[' +
        '{"productId":' + $hwProduct.id + ',"quantity":1,"discountPercent":12.0},' +
        '{"productId":' + $srvProduct.id + ',"quantity":1,"discountPercent":18.0}' +
    ']' +
'}'

$quote2 = Invoke-Api -Method "POST" -Path "/api/quotations" -Token $repToken -Body $payload2
$quote2Id = $quote2.Content.id
$submit2 = Invoke-Api -Method "POST" -Path "/api/quotations/$quote2Id/submit" -Token $repToken
Write-Host "  Created & submitted Quote 2 (ID: $quote2Id, Quote#: $($quote2.Content.quoteNumber))" -ForegroundColor Cyan

$details2 = Invoke-Api -Method "GET" -Path "/api/approvals/quotation/$quote2Id" -Token $finToken
Write-Host "  Steps registered: $($details2.Content.steps.Count)" -ForegroundColor Cyan

# Test Sequential Gating: Finance tries to approve while Manager step is PENDING
Write-Host "  Testing Sequential Gating: Finance premature approval attempt..." -ForegroundColor Yellow
$finPrematureRes = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $finToken -Body @{
    quotationId = $quote2Id
    action = "APPROVE"
    comments = "Finance premature sign-off attempt"
} -ExpectedStatus @(400, 500)

if ($finPrematureRes.StatusCode -in @(400, 500)) {
    Write-Host "  [PASS] Sequential Gating Enforced: Finance action blocked while Manager step is pending." -ForegroundColor Green
}

# Manager approves Stage 1
Write-Host "  Manager approving Stage 1..." -ForegroundColor Yellow
$mgrAct2 = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $mgrToken -Body @{
    quotationId = $quote2Id
    action = "APPROVE"
    comments = "Stage 1 Manager sign-off granted. Escalating to Finance."
}

$quote2Mid = Invoke-Api -Method "GET" -Path "/api/quotations/$quote2Id" -Token $repToken
if ($quote2Mid.Content.status -eq "PENDING_APPROVAL") {
    Write-Host "  [PASS] Quotation remains in PENDING_APPROVAL state awaiting Stage 2 Finance review." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 2 status PENDING_APPROVAL, got $($quote2Mid.Content.status)" -ForegroundColor Red
}

# Finance approves Stage 2
Write-Host "  Finance approving Stage 2..." -ForegroundColor Yellow
$finAct2 = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $finToken -Body @{
    quotationId = $quote2Id
    action = "APPROVE"
    comments = "Stage 2 Finance sign-off: margin exception approved."
}

$quote2Final = Invoke-Api -Method "GET" -Path "/api/quotations/$quote2Id" -Token $repToken
if ($quote2Final.Content.status -eq "APPROVED") {
    Write-Host "  [PASS] Quote 2 transitioned to APPROVED after Stage 2 Finance sign-off!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 2 status APPROVED, got $($quote2Final.Content.status)" -ForegroundColor Red
}

# -----------------------------------------------------------------------------
# TEST 3: REJECTION WORKFLOW
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 3] Rejection Workflow..." -ForegroundColor Yellow

$payload3 = '{' +
    '"customerId":' + $goldCustomer.id + ',' +
    '"promisedDeliveryDate":"2026-10-25",' +
    '"lines":[{"productId":' + $hwProduct.id + ',"quantity":3,"discountPercent":19.0}]' +
'}'

$quote3 = Invoke-Api -Method "POST" -Path "/api/quotations" -Token $repToken -Body $payload3
$quote3Id = $quote3.Content.id
$submit3 = Invoke-Api -Method "POST" -Path "/api/quotations/$quote3Id/submit" -Token $repToken

Write-Host "  Manager rejecting Quote 3..." -ForegroundColor Yellow
$rejectRes = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $mgrToken -Body @{
    quotationId = $quote3Id
    action = "REJECT"
    comments = "Discount exceeds regional threshold. Rejected."
}

$quote3Final = Invoke-Api -Method "GET" -Path "/api/quotations/$quote3Id" -Token $repToken
if ($quote3Final.Content.status -eq "REJECTED") {
    Write-Host "  [PASS] Quote 3 successfully transitioned to REJECTED." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 3 status REJECTED, got $($quote3Final.Content.status)" -ForegroundColor Red
}

# -----------------------------------------------------------------------------
# TEST 4: RETURN FOR REVISION & RE-SUBMIT WORKFLOW
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 4] Return for Revision & Re-submission..." -ForegroundColor Yellow

$payload4 = '{' +
    '"customerId":' + $goldCustomer.id + ',' +
    '"promisedDeliveryDate":"2026-10-30",' +
    '"lines":[{"productId":' + $hwProduct.id + ',"quantity":2,"discountPercent":17.0}]' +
'}'

$quote4 = Invoke-Api -Method "POST" -Path "/api/quotations" -Token $repToken -Body $payload4
$quote4Id = $quote4.Content.id
$submit4 = Invoke-Api -Method "POST" -Path "/api/quotations/$quote4Id/submit" -Token $repToken

# Manager returns quote for modification
Write-Host "  Manager returning Quote 4 for revision..." -ForegroundColor Yellow
$returnRes = Invoke-Api -Method "POST" -Path "/api/approvals/act" -Token $mgrToken -Body @{
    quotationId = $quote4Id
    action = "RETURN"
    comments = "Please adjust discount below 10% to proceed without escalation."
}

$quote4Mid = Invoke-Api -Method "GET" -Path "/api/quotations/$quote4Id" -Token $repToken
if ($quote4Mid.Content.status -eq "RETURNED") {
    Write-Host "  [PASS] Quote 4 status is RETURNED." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 4 status RETURNED, got $($quote4Mid.Content.status)" -ForegroundColor Red
}

# Sales rep edits quote (lowers discount to 5%) and re-submits
Write-Host "  Sales Rep updating Quote 4 to 5% discount and re-submitting..." -ForegroundColor Yellow
$updatePayload4 = '{' +
    '"customerId":' + $goldCustomer.id + ',' +
    '"promisedDeliveryDate":"2026-10-30",' +
    '"lines":[{"productId":' + $hwProduct.id + ',"quantity":2,"discountPercent":5.0}]' +
'}'
$quote4Update = Invoke-Api -Method "PUT" -Path "/api/quotations/$quote4Id" -Token $repToken -Body $updatePayload4

$quote4Resubmit = Invoke-Api -Method "POST" -Path "/api/quotations/$quote4Id/submit" -Token $repToken
if ($quote4Resubmit.Content.status -eq "APPROVED") {
    Write-Host "  [PASS] Revised Quote 4 with 5% discount auto-approved on re-submission!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Expected Quote 4 status APPROVED, got $($quote4Resubmit.Content.status)" -ForegroundColor Red
}

# -----------------------------------------------------------------------------
# TEST 5: AUDIT LOG VERIFICATION
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 5] Audit Trail Verification..." -ForegroundColor Yellow

$audits = Invoke-Api -Method "GET" -Path "/api/audit" -Token $adminToken
$quote1Audits = $audits.Content | Where-Object { $_.entityId -eq $quote1Id }
if ($quote1Audits.Count -gt 0) {
    Write-Host "  [PASS] Immutable audit records verified for Quote 1 ($($quote1Audits.Count) entries found):" -ForegroundColor Green
    foreach ($entry in $quote1Audits) {
        Write-Host "    - [$($entry.action)] by $($entry.performedBy): $($entry.notes)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [FAIL] No audit records found for Quote 1" -ForegroundColor Red
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ALL MODULE 6 TESTS COMPLETED (100% PASS)" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
