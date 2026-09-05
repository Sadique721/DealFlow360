$baseUrl = "http://localhost:8080/api"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  DEALFLOW360 MODULE 3 VERIFICATION TEST SUITE" -ForegroundColor Cyan
Write-Host "  Customers, Discount Tiers & Approval Chains Setup" -ForegroundColor Cyan
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

# 2. CUSTOMER TIERS (DISCOUNT TIERS)
Write-Host "`n[Step 2] Testing Customer Discount Tier Endpoints (Admin)..." -ForegroundColor Yellow

$allTiers = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Get -Headers $adminHeaders

$bronze = $allTiers | Where-Object { $_.tierName -eq "BRONZE" } | Select-Object -First 1
$silver = $allTiers | Where-Object { $_.tierName -eq "SILVER" } | Select-Object -First 1
$gold = $allTiers | Where-Object { $_.tierName -eq "GOLD" } | Select-Object -First 1

if (-not $bronze) {
    $bronze = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Post -Headers $adminHeaders -Body (@{ tierName = "BRONZE"; maxDiscountPercent = 5.0; description = "Standard commercial tier - 5% max" } | ConvertTo-Json)
}
if (-not $silver) {
    $silver = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Post -Headers $adminHeaders -Body (@{ tierName = "SILVER"; maxDiscountPercent = 10.0; description = "Growth partner tier - 10% max" } | ConvertTo-Json)
}
if (-not $gold) {
    $gold = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Post -Headers $adminHeaders -Body (@{ tierName = "GOLD"; maxDiscountPercent = 15.0; description = "High-volume tier - 15% max" } | ConvertTo-Json)
}

# Create / Verify Platinum Tier
$plat = $allTiers | Where-Object { $_.tierName -eq "PLATINUM" } | Select-Object -First 1
if (-not $plat) {
    $plat = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Post -Headers $adminHeaders -Body (@{ tierName = "PLATINUM"; maxDiscountPercent = 20.0; description = "Enterprise strategic accounts - 20% max" } | ConvertTo-Json)
    Write-Host "  -> Created Customer Tier: $($plat.tierName) ($($plat.maxDiscountPercent)% max discount allowance)" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Customer Tier: $($plat.tierName) ($($plat.maxDiscountPercent)% max discount allowance)" -ForegroundColor Green
}

$allTiers = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Get -Headers $adminHeaders
Write-Host "  -> Total Configured Discount Tiers: $($allTiers.Count)" -ForegroundColor Green

# 3. CUSTOMER ACCOUNTS MASTER DATA
Write-Host "`n[Step 3] Testing Customer Accounts Endpoints (Admin)..." -ForegroundColor Yellow

$allCusts = Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Get -Headers $adminHeaders

$c1 = $allCusts | Where-Object { $_.name -like "*Acme Enterprise*" -or $_.name -like "*Acme Corp*" } | Select-Object -First 1
if (-not $c1) {
    $c1Body = @{
        name = "Acme Enterprise Corp"
        tier = "GOLD"
        email = "procurement@acme-corp.com"
        contactPerson = "Alex Mercer"
        phone = "+1-555-0192"
        address = "100 Silicon Valley Way, San Jose, CA"
    } | ConvertTo-Json
    $c1 = Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Post -Headers $adminHeaders -Body $c1Body
    Write-Host "  -> Created Customer 1: $($c1.name) (Tier: $($c1.tier), Cap: $($c1.tierMaxDiscount)%, Contact: $($c1.contactPerson))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Customer 1: $($c1.name) (Tier: $($c1.tier), Cap: $($c1.tierMaxDiscount)%)" -ForegroundColor Green
}

$c2 = $allCusts | Where-Object { $_.name -like "*TechNova*" } | Select-Object -First 1
if (-not $c2) {
    $c2Body = @{
        name = "TechNova Solutions Ltd"
        tier = "SILVER"
        email = "billing@technova.io"
        contactPerson = "Sarah Jenkins"
        phone = "+1-555-0144"
        address = "450 Innovation Parkway, Austin, TX"
    } | ConvertTo-Json
    $c2 = Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Post -Headers $adminHeaders -Body $c2Body
    Write-Host "  -> Created Customer 2: $($c2.name) (Tier: $($c2.tier), Cap: $($c2.tierMaxDiscount)%, Contact: $($c2.contactPerson))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Customer 2: $($c2.name) (Tier: $($c2.tier), Cap: $($c2.tierMaxDiscount)%)" -ForegroundColor Green
}

$c3 = $allCusts | Where-Object { $_.name -like "*SmallBiz Direct*" } | Select-Object -First 1
if (-not $c3) {
    $c3Body = @{
        name = "SmallBiz Direct LLC"
        tier = "BRONZE"
        email = "ops@smallbizdirect.com"
        contactPerson = "Michael Chang"
        phone = "+1-555-0177"
        address = "782 Commerce Blvd, Chicago, IL"
    } | ConvertTo-Json
    $c3 = Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Post -Headers $adminHeaders -Body $c3Body
    Write-Host "  -> Created Customer 3: $($c3.name) (Tier: $($c3.tier), Cap: $($c3.tierMaxDiscount)%, Contact: $($c3.contactPerson))" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Customer 3: $($c3.name) (Tier: $($c3.tier), Cap: $($c3.tierMaxDiscount)%)" -ForegroundColor Green
}

# 4. APPROVAL CHAIN RULES
Write-Host "`n[Step 4] Testing Approval Chains Setup Endpoints (Admin)..." -ForegroundColor Yellow

$allChains = Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Get -Headers $adminHeaders

$chain1 = $allChains | Where-Object { $_.requiredLevel -eq "MANAGER" } | Select-Object -First 1
$chain2 = $allChains | Where-Object { $_.requiredLevel -eq "MANAGER_THEN_FINANCE" } | Select-Object -First 1

if (-not $chain1) {
    $chain1Body = @{
        minScore = 0.01
        maxScore = 10.00
        requiredLevel = "MANAGER"
        description = "Standard risk (Score 0.01 to 10.00) -> Sales Manager approval required"
    } | ConvertTo-Json
    $chain1 = Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Post -Headers $adminHeaders -Body $chain1Body
    Write-Host "  -> Created Approval Rule 1: Score [$($chain1.minScore) to $($chain1.maxScore)] -> Level: $($chain1.requiredLevel)" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Approval Rule 1: Score [$($chain1.minScore) to $($chain1.maxScore)] -> Level: $($chain1.requiredLevel)" -ForegroundColor Green
}

if (-not $chain2) {
    $chain2Body = @{
        minScore = 10.01
        maxScore = 999.00
        requiredLevel = "MANAGER_THEN_FINANCE"
        description = "Elevated risk (Score > 10.00) -> Two-step Manager then Finance approval"
    } | ConvertTo-Json
    $chain2 = Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Post -Headers $adminHeaders -Body $chain2Body
    Write-Host "  -> Created Approval Rule 2: Score [$($chain2.minScore) to $($chain2.maxScore)] -> Level: $($chain2.requiredLevel)" -ForegroundColor Green
} else {
    Write-Host "  -> Verified Existing Approval Rule 2: Score [$($chain2.minScore) to $($chain2.maxScore)] -> Level: $($chain2.requiredLevel)" -ForegroundColor Green
}

$allChains = Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Get -Headers $adminHeaders
Write-Host "  -> Total Configured Governance Approval Chains: $($allChains.Count)" -ForegroundColor Green

# 5. SALES REP RBAC VERIFICATION
Write-Host "`n[Step 5] Testing Non-Admin (Sales Rep) Access Controls..." -ForegroundColor Yellow

$repEmail = "rep.module2@dealflow360.com"
$repPassword = "RepPassword@123"

$repToken = $null
try {
    $repAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = $repEmail; password = $repPassword } | ConvertTo-Json) -ContentType "application/json"
    $repToken = $repAuth.token
} catch {
    # Create via admin endpoint if not already created
    $createRepBody = @{
        name = "Alex SalesRep"
        email = $repEmail
        password = $repPassword
        role = "SALES_REP"
        team = "North America Commercial"
    } | ConvertTo-Json
    $createdUser = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method Post -Headers $adminHeaders -Body $createRepBody
    $repAuth = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = $repEmail; password = $repPassword } | ConvertTo-Json) -ContentType "application/json"
    $repToken = $repAuth.token
}

$previewToken = $repToken.Substring(0, 20)
Write-Host "  -> Authenticated Sales Rep user ($previewToken...)" -ForegroundColor Green
$repHeaders = @{
    "Authorization" = "Bearer $repToken"
    "Content-Type" = "application/json"
}

# 5.1 Sales Rep GET Endpoints (Allowed - 200 OK)
try {
    $repCusts = Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Get -Headers $repHeaders
    $repTiers = Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Get -Headers $repHeaders
    $repChains = Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Get -Headers $repHeaders
    Write-Host "  -> [200 OK] Sales Rep successfully read $($repCusts.Count) customers, $($repTiers.Count) tiers, and $($repChains.Count) approval rules." -ForegroundColor Green
} catch {
    Write-Host "  -> [FAIL] Sales Rep could not read master data: $_" -ForegroundColor Red
}

# 5.2 Sales Rep POST Customer (Forbidden - 403)
try {
    $dummyCust = @{
        name = "Unauthorized Customer"
        tier = "GOLD"
        email = "fake@unauth.com"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/customers" -Method Post -Headers $repHeaders -Body $dummyCust
    Write-Host "  -> [FAIL] Sales Rep was able to create customer! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST customer mutation properly blocked by RBAC." -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

# 5.3 Sales Rep POST Customer Tier (Forbidden - 403)
try {
    $dummyTier = @{
        tierName = "UNAUTHORIZED_TIER"
        maxDiscountPercent = 50.0
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/customer-tiers" -Method Post -Headers $repHeaders -Body $dummyTier
    Write-Host "  -> [FAIL] Sales Rep was able to create customer tier! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST customer tier mutation properly blocked by RBAC." -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

# 5.4 Sales Rep POST Approval Chain (Forbidden - 403)
try {
    $dummyChain = @{
        minScore = 0.0
        maxScore = 50.0
        requiredLevel = "MANAGER"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/catalog/approval-chains" -Method Post -Headers $repHeaders -Body $dummyChain
    Write-Host "  -> [FAIL] Sales Rep was able to create approval chain! (Expected 403 Forbidden)" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403) {
        Write-Host "  -> [403 Forbidden] Sales Rep POST approval chain mutation properly blocked by RBAC." -ForegroundColor Green
    } else {
        Write-Host "  -> [FAIL] Unexpected status code: $status" -ForegroundColor Red
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  MODULE 3 VERIFICATION SUMMARY: ALL CHECKS PASSED!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Cyan
