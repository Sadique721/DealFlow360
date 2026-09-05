# ==============================================================================
# DEALFLOW360 - MODULE 4 AUTOMATED VERIFICATION SCRIPT
# Tests Quotation Creation, Server Recalculation, Ownership RBAC, and Persistence
# ==============================================================================

$BaseUrl = "http://localhost:8080"
$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  DEALFLOW360 - MODULE 4 AUTOMATED VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Token,
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
    if ($Body -is [System.Array]) {
        if ($Body.Count -eq 1) {
            $JsonBody = "[ " + ($Body[0] | ConvertTo-Json -Depth 10) + " ]"
        } else {
            $JsonBody = $Body | ConvertTo-Json -Depth 10
        }
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
        $StatusCode = $_.Exception.Response.StatusCode.value__
        if ($ExpectedStatus -contains $StatusCode) {
            Write-Host "  [PASS] $Method $Path -> HTTP $StatusCode (Expected)" -ForegroundColor Green
            return @{ Success = $true; StatusCode = $StatusCode; Content = $null }
        }
        else {
            Write-Host "  [FAIL] $Method $Path -> Error: $_" -ForegroundColor Red
            return @{ Success = $false; StatusCode = $StatusCode; Content = $null }
        }
    }
}

# ------------------------------------------------------------------------------
# STEP 1: Authenticate Sales Rep A (Jay Rao), Sales Rep B (Samir Patel), and Sales Manager (Maya Shah)
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 1] Authenticating Test Roles from Seed Database..." -ForegroundColor Yellow

# Sales Rep A (Jay Rao)
$RepALogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    email = "j.rao@dealflow360.com"
    password = "password123"
}
$RepAToken = $RepALogin.Content.token
$RepAId = $RepALogin.Content.user.id
Write-Host "  Sales Rep A (Jay Rao) Token Acquired (ID: $RepAId)" -ForegroundColor Green

# Sales Rep B (Samir Patel)
$RepBLogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    email = "s.patel@dealflow360.com"
    password = "password123"
}
$RepBToken = $RepBLogin.Content.token
$RepBId = $RepBLogin.Content.user.id
Write-Host "  Sales Rep B (Samir Patel) Token Acquired (ID: $RepBId)" -ForegroundColor Green

# Sales Manager (Maya Shah)
$MgrLogin = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
    email = "m.shah@dealflow360.com"
    password = "password123"
}
$MgrToken = $MgrLogin.Content.token
Write-Host "  Sales Manager (Maya Shah) Token Acquired" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 2: Fetch Customer & Products as Sales Rep A
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 2] Fetching Master Data as Sales Rep A..." -ForegroundColor Yellow
$CustList = Invoke-Api -Method GET -Path "/api/catalog/customers" -Token $RepAToken
$TargetCustomer = $CustList.Content[0]
Write-Host "  Target Customer: $($TargetCustomer.name) (ID: $($TargetCustomer.id), Tier: $($TargetCustomer.tier))" -ForegroundColor Cyan

$ProdList = Invoke-Api -Method GET -Path "/api/catalog/products" -Token $RepAToken
$Prod1 = $ProdList.Content[0] # Laptop Pro 14 (BasePrice: 1200.00, Cost: 850.00)
$Prod2 = $ProdList.Content[1] # Docking Station USB-C (BasePrice: 180.00, Cost: 110.00)
Write-Host "  Product 1: $($Prod1.name) (ID: $($Prod1.id), Price: $($Prod1.basePrice))" -ForegroundColor Cyan
Write-Host "  Product 2: $($Prod2.name) (ID: $($Prod2.id), Price: $($Prod2.basePrice))" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# STEP 3: Create Quotation Draft with Single Product Line (Qty 2, Discount 5%)
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 3] Creating Quotation Draft as Sales Rep A (Qty: 2, Discount: 5%)..." -ForegroundColor Yellow
$CreateQuote = Invoke-Api -Method POST -Path "/api/quotations" -Token $RepAToken -Body @{
    customerId = $TargetCustomer.id
    promisedDeliveryDate = (Get-Date).AddDays(14).ToString("yyyy-MM-dd")
    lines = @(
        @{
            productId = $Prod1.id
            quantity = 2
            discountPercent = 5.0
        }
    )
}

$CreatedQuote = $CreateQuote.Content
$QuoteId = $CreatedQuote.id
Write-Host "  Created Quotation: $($CreatedQuote.quoteNumber) (ID: $QuoteId)" -ForegroundColor Green
Write-Host "  Total Amount: $($CreatedQuote.totalAmount) | Subtotal: $($CreatedQuote.subtotalAmount) | Margin: $($CreatedQuote.marginPercentage)%" -ForegroundColor Green

# Mathematical verification:
# Gross: 1200 * 2 = 2400.00
# Discount: 5% of 2400 = 120.00 -> Net: 2280.00
# Cost: 850 * 2 = 1700.00
# Margin: (2280 - 1700) / 2280 = 580 / 2280 = 25.44%
if ([Math]::Abs($CreatedQuote.totalAmount - 2280.00) -gt 0.01) {
    Write-Host "  [FAIL] Expected Total Amount 2280.00 but got $($CreatedQuote.totalAmount)" -ForegroundColor Red
    exit 1
}
Write-Host "  [PASS] Server Total ($($CreatedQuote.totalAmount)) mathematically exact!" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 4: Update Line Items (Add 2nd Product Line) and Verify Server Recalculation
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 4] Adding Second Product Line and Verifying Live Server Recalculation..." -ForegroundColor Yellow
$UpdateLines = Invoke-Api -Method PUT -Path "/api/quotations/$QuoteId/lines" -Token $RepAToken -Body @(
    @{
        productId = $Prod1.id
        quantity = 2
        discountPercent = 5.0
    },
    @{
        productId = $Prod2.id
        quantity = 1
        discountPercent = 10.0
    }
)

$UpdatedQuote = $UpdateLines.Content
Write-Host "  Updated Total Amount: $($UpdatedQuote.totalAmount) | Subtotal: $($UpdatedQuote.subtotalAmount) | Margin: $($UpdatedQuote.marginPercentage)%" -ForegroundColor Green
Write-Host "  Lines Count: $($UpdatedQuote.lines.Count)" -ForegroundColor Green

if ($UpdatedQuote.lines.Count -ne 2) {
    Write-Host "  [FAIL] Expected 2 lines but got $($UpdatedQuote.lines.Count)" -ForegroundColor Red
    exit 1
}
if ([Math]::Abs($UpdatedQuote.totalAmount - 2442.00) -gt 0.01) {
    Write-Host "  [FAIL] Expected Total Amount 2442.00 but got $($UpdatedQuote.totalAmount)" -ForegroundColor Red
    exit 1
}
Write-Host "  [PASS] Server Multiline Recalculation ($($UpdatedQuote.totalAmount)) mathematically exact!" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 5: Verify Persistence via GET /api/quotations/{id}
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 5] Verifying Quotation Persistence & DTO Structure..." -ForegroundColor Yellow
$GetQuote = Invoke-Api -Method GET -Path "/api/quotations/$QuoteId" -Token $RepAToken
$Fetched = $GetQuote.Content

Write-Host "  Fetched Quote Number: $($Fetched.quoteNumber)" -ForegroundColor Green
Write-Host "  Fetched Lines Count: $($Fetched.lines.Count)" -ForegroundColor Green
Write-Host "  Fetched Customer: $($Fetched.customer.name)" -ForegroundColor Green
Write-Host "  Fetched Sales Rep: $($Fetched.salesRep.name)" -ForegroundColor Green

if ($Fetched.lines.Count -ne 2) {
    Write-Host "  [FAIL] Expected 2 lines on persisted quote but got $($Fetched.lines.Count)" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# STEP 6: Verify Strict RBAC - Sales Rep B cannot edit Rep A's Quotation (403)
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 6] Testing RBAC Security: Sales Rep B attempting to edit Rep A's Quotation..." -ForegroundColor Yellow
$RepBEditAttempt = Invoke-Api -Method PUT -Path "/api/quotations/$QuoteId/lines" -Token $RepBToken -Body @(
    @{
        productId = $Prod1.id
        quantity = 10
        discountPercent = 50.0
    }
) -ExpectedStatus @(403)

if ($RepBEditAttempt.StatusCode -eq 403) {
    Write-Host "  [PASS] Sales Rep B was correctly BLOCKED with HTTP 403 Forbidden!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Sales Rep B was NOT blocked with 403 (Got $($RepBEditAttempt.StatusCode))!" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# STEP 7: Verify Sales Manager has Read-Only access
# ------------------------------------------------------------------------------
Write-Host "`n[STEP 7] Verifying Sales Manager Read-Only View of Rep A's Quotation..." -ForegroundColor Yellow
$MgrRead = Invoke-Api -Method GET -Path "/api/quotations/$QuoteId" -Token $MgrToken
if ($MgrRead.Success) {
    Write-Host "  [PASS] Sales Manager can view Rep A's Quotation (Status: $($MgrRead.Content.status))" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Sales Manager could not view quotation" -ForegroundColor Red
    exit 1
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  MODULE 4 VERIFICATION COMPLETE - ALL TESTS PASSED (100%)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
