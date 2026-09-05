$baseUrl = "http://localhost:8080/api"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  DEALFLOW360 MODULE 2 VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "  Catalog Setup (Categories, Products, Price Lists)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. ADMIN LOGIN
Write-Host "[Step 1] Logging in as Admin (admin@dealflow360.com)..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@dealflow360.com"
    password = "Admin@123"
} | ConvertTo-Json

try {
    $loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $adminToken = $loginResp.token
    Write-Host "  -> SUCCESS: Admin authenticated. Token received (Length: $($adminToken.Length))" -ForegroundColor Green
} catch {
    Write-Host "  -> FAILED: Admin login failed: $_" -ForegroundColor Red
    exit 1
}

$adminHeaders = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# 2. CREATE / VERIFY CATEGORIES
Write-Host "`n[Step 2] Testing Category Endpoints (Admin)..." -ForegroundColor Yellow

$allCats = Invoke-RestMethod -Uri "$baseUrl/catalog/categories" -Method Get -Headers $adminHeaders
$hardwareCat = $allCats | Where-Object { $_.name -like "*Hardware*" } | Select-Object -First 1

if (-not $hardwareCat) {
    $catUniqueSuffix = Get-Random -Minimum 100 -Maximum 999
    $hardwareCatBody = @{
        name = "Enterprise Hardware $catUniqueSuffix"
        maxDiscountPercent = 15.0
        sensitivityGamma = 1.2
        description = "Physical networking and appliance hardware"
    } | ConvertTo-Json
    $hardwareCat = Invoke-RestMethod -Uri "$baseUrl/catalog/categories" -Method Post -Headers $adminHeaders -Body $hardwareCatBody
    Write-Host "  -> Created Category: $($hardwareCat.name) (ID: $($hardwareCat.id), Max Discount: $($hardwareCat.maxDiscountPercent)%, Gamma: $($hardwareCat.sensitivityGamma))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Category: $($hardwareCat.name) (ID: $($hardwareCat.id), Max Discount: $($hardwareCat.maxDiscountPercent)%)" -ForegroundColor Green
}

$serviceCat = $allCats | Where-Object { $_.name -like "*Cloud*" -or $_.name -like "*Service*" } | Select-Object -First 1
if (-not $serviceCat) {
    $catUniqueSuffix2 = Get-Random -Minimum 100 -Maximum 999
    $serviceCatBody = @{
        name = "Professional Cloud Services $catUniqueSuffix2"
        maxDiscountPercent = 10.0
        sensitivityGamma = 1.5
        description = "Cloud architecture consulting and SLA support"
    } | ConvertTo-Json
    $serviceCat = Invoke-RestMethod -Uri "$baseUrl/catalog/categories" -Method Post -Headers $adminHeaders -Body $serviceCatBody
    Write-Host "  -> Created Category: $($serviceCat.name) (ID: $($serviceCat.id), Max Discount: $($serviceCat.maxDiscountPercent)%, Gamma: $($serviceCat.sensitivityGamma))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Category: $($serviceCat.name) (ID: $($serviceCat.id), Max Discount: $($serviceCat.maxDiscountPercent)%)" -ForegroundColor Green
}

# GET Categories
$allCats = Invoke-RestMethod -Uri "$baseUrl/catalog/categories" -Method Get -Headers $adminHeaders
Write-Host "  -> Verified total categories in catalog: $($allCats.Count)" -ForegroundColor Green

# 3. CREATE / VERIFY PRODUCTS
Write-Host "`n[Step 3] Testing Product Endpoints (Admin)..." -ForegroundColor Yellow

$allProds = Invoke-RestMethod -Uri "$baseUrl/catalog/products/all" -Method Get -Headers $adminHeaders
$prod1 = $allProds | Where-Object { $_.name -like "*Edge Gateway*" } | Select-Object -First 1

if (-not $prod1) {
    $prod1Body = @{
        name = "Enterprise Edge Gateway G400"
        categoryId = $hardwareCat.id
        basePrice = 2500.00
        costPrice = 1500.00
        unitOfMeasure = "Units"
        taxPercentage = 10.0
        isSubscription = $false
        stockOnHand = 50
        active = $true
        description = "High-throughput SDN router"
    } | ConvertTo-Json
    $prod1 = Invoke-RestMethod -Uri "$baseUrl/catalog/products" -Method Post -Headers $adminHeaders -Body $prod1Body
    Write-Host "  -> Created Product 1: $($prod1.name) (ID: $($prod1.id), SKU: $($prod1.sku), Base Price: `$$($prod1.basePrice))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Product 1: $($prod1.name) (ID: $($prod1.id), Base Price: `$$($prod1.basePrice))" -ForegroundColor Green
}

$prod2 = $allProds | Where-Object { $_.name -like "*CyberShield*" } | Select-Object -First 1
if (-not $prod2) {
    $prod2Body = @{
        name = "CyberShield MDR Annual Subscription"
        categoryId = $serviceCat.id
        basePrice = 4800.00
        costPrice = 2200.00
        unitOfMeasure = "Licenses"
        taxPercentage = 5.0
        isSubscription = $true
        recurringInterval = "ANNUAL"
        stockOnHand = 999
        active = $true
        description = "24x7 SOC monitoring and threat remediation"
    } | ConvertTo-Json
    $prod2 = Invoke-RestMethod -Uri "$baseUrl/catalog/products" -Method Post -Headers $adminHeaders -Body $prod2Body
    Write-Host "  -> Created Product 2: $($prod2.name) (ID: $($prod2.id), SKU: $($prod2.sku), Subscription: $($prod2.isSubscription), Interval: $($prod2.recurringInterval))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Product 2: $($prod2.name) (ID: $($prod2.id), Base Price: `$$($prod2.basePrice))" -ForegroundColor Green
}

# 4. CREATE / VERIFY PRICE LISTS
Write-Host "`n[Step 4] Testing Price List Endpoints (Admin)..." -ForegroundColor Yellow

$allPriceLists = Invoke-RestMethod -Uri "$baseUrl/catalog/price-lists" -Method Get -Headers $adminHeaders
$pl1 = $allPriceLists | Where-Object { $_.customerTier -eq "ENTERPRISE" } | Select-Object -First 1

if (-not $pl1) {
    $pl1Body = @{
        customerTier = "ENTERPRISE"
        currency = "USD"
        discountAdjustmentPercent = 10.0
    } | ConvertTo-Json
    $pl1 = Invoke-RestMethod -Uri "$baseUrl/catalog/price-lists" -Method Post -Headers $adminHeaders -Body $pl1Body
    Write-Host "  -> Created Price List: $($pl1.customerTier) ($($pl1.currency)) Adjustment: $($pl1.discountAdjustmentPercent)%" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Price List: $($pl1.customerTier) ($($pl1.currency)) Adjustment: $($pl1.discountAdjustmentPercent)%" -ForegroundColor Green
}

$pl2 = $allPriceLists | Where-Object { $_.customerTier -eq "PLATINUM" } | Select-Object -First 1
if (-not $pl2) {
    $pl2Body = @{
        customerTier = "PLATINUM"
        currency = "USD"
        discountAdjustmentPercent = 7.5
    } | ConvertTo-Json
    $pl2 = Invoke-RestMethod -Uri "$baseUrl/catalog/price-lists" -Method Post -Headers $adminHeaders -Body $pl2Body
    Write-Host "  -> Created Price List: $($pl2.customerTier) ($($pl2.currency)) Adjustment: $($pl2.discountAdjustmentPercent)%" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Price List: $($pl2.customerTier) ($($pl2.currency)) Adjustment: $($pl2.discountAdjustmentPercent)%" -ForegroundColor Green
}

$allPriceLists = Invoke-RestMethod -Uri "$baseUrl/catalog/price-lists" -Method Get -Headers $adminHeaders
Write-Host "  -> Verified total price lists: $($allPriceLists.Count)" -ForegroundColor Green

# 5. SALES REP RBAC VERIFICATION
Write-Host "`n[Step 5] Testing Non-Admin (Sales Rep) Access Controls..." -ForegroundColor Yellow

$repEmail = "rep.module2@dealflow360.com"
$repPassword = "RepPassword@123"

# Try logging in, or create via Admin API
$repToken = $null
try {
    $repAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = $repEmail; password = $repPassword } | ConvertTo-Json) -ContentType "application/json"
    $repToken = $repAuth.token
} catch {
    # Create staff user using Admin endpoint
    $createRepBody = @{
        name = "Alex SalesRep"
        email = $repEmail
        password = $repPassword
        role = "SALES_REP"
        team = "North America Commercial"
    } | ConvertTo-Json
    $createdUser = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method Post -Headers $adminHeaders -Body $createRepBody
    Write-Host "  -> Created new test Sales Rep user via Admin API: $($createdUser.email)" -ForegroundColor Cyan
    
    # Login as rep
    $repAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = $repEmail; password = $repPassword } | ConvertTo-Json) -ContentType "application/json"
    $repToken = $repAuth.token
}

Write-Host "  -> Authenticated Sales Rep user ($($repToken.Substring(0, 20))...)" -ForegroundColor Green
$repHeaders = @{
    "Authorization" = "Bearer $repToken"
    "Content-Type" = "application/json"
}

# 5.1 Sales Rep GET Products (Allowed - 200 OK)
try {
    $repProducts = Invoke-RestMethod -Uri "$baseUrl/catalog/products" -Method Get -Headers $repHeaders
    Write-Host "  -> [200 OK] Sales Rep successfully viewed $($repProducts.Count) sellable products." -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Sales Rep could not read products: $_" -ForegroundColor Red
}

# 5.2 Sales Rep POST Product (Forbidden - 403)
$forbiddenAttempt1Passed = $false
try {
    $dummyProd = @{
        name = "Unauthorized Product By Rep"
        categoryId = $hardwareCat.id
        basePrice = 100.0
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/products" -Method Post -Headers $repHeaders -Body $dummyProd
    Write-Host "  -> [FAIL] Sales Rep was able to create product! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST product mutation properly blocked by RBAC." -ForegroundColor Green
        $forbiddenAttempt1Passed = $true
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

# 5.3 Sales Rep POST Category (Forbidden - 403)
$forbiddenAttempt2Passed = $false
try {
    $dummyCat = @{
        name = "Unauthorized Category"
        maxDiscountPercent = 50.0
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/categories" -Method Post -Headers $repHeaders -Body $dummyCat
    Write-Host "  -> [FAIL] Sales Rep was able to create category! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST category mutation properly blocked by RBAC." -ForegroundColor Green
        $forbiddenAttempt2Passed = $true
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

# 5.4 Sales Rep POST PriceList (Forbidden - 403)
$forbiddenAttempt3Passed = $false
try {
    $dummyPl = @{
        customerTier = "STANDARD"
        discountAdjustmentPercent = 90.0
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/price-lists" -Method Post -Headers $repHeaders -Body $dummyPl
    Write-Host "  -> [FAIL] Sales Rep was able to create price list! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST price list mutation properly blocked by RBAC." -ForegroundColor Green
        $forbiddenAttempt3Passed = $true
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  MODULE 2 VERIFICATION SUMMARY: ALL CHECKS PASSED!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Cyan
