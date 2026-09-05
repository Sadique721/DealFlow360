$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080"
$passCount = 0
$failCount = 0

function Assert-Test($condition, $message) {
    if ($condition) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
        $global:passCount++
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
        $global:failCount++
    }
}

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "=== FULL SYSTEM REST API & DATABASE DYNAMIC VALUE VERIFICATION SCRIPT ===" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Login
$loginBody = @{ email = "admin@dealflow360.com"; password = "Admin@123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $auth.token
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
Assert-Test ($token -ne $null) "Admin authentication succeeded"

# 2. Executive KPIs
$kpis = Invoke-RestMethod -Uri "$baseUrl/api/reports/kpis" -Method Get -Headers $headers
Assert-Test ($kpis.totalQuotations -ne $null) "KPI totalQuotations from DB: $($kpis.totalQuotations)"
Assert-Test ($kpis.totalPipelineValue -ne $null) "KPI totalPipelineValue from DB: $($kpis.totalPipelineValue)"
Assert-Test ($kpis.pendingApprovalsCount -ne $null) "KPI pendingApprovalsCount from DB: $($kpis.pendingApprovalsCount)"
Assert-Test ($kpis.stalledDealsCount -ne $null) "KPI stalledDealsCount from DB: $($kpis.stalledDealsCount)"

# 3. Quotations
$quotes = Invoke-RestMethod -Uri "$baseUrl/api/quotations" -Method Get -Headers $headers
Assert-Test ($quotes -is [Array]) "Fetched $($quotes.Count) quotations from DB"

# 4. Approvals
$approvals = Invoke-RestMethod -Uri "$baseUrl/api/approvals" -Method Get -Headers $headers
Assert-Test ($approvals -is [Array]) "Fetched $($approvals.Count) approval records from DB"

# 5. Subscriptions
$subs = Invoke-RestMethod -Uri "$baseUrl/api/subscriptions" -Method Get -Headers $headers
Assert-Test ($subs -is [Array]) "Fetched $($subs.Count) subscriptions from DB"

# 6. Invoices
$invoices = Invoke-RestMethod -Uri "$baseUrl/api/invoices" -Method Get -Headers $headers
Assert-Test ($invoices -is [Array]) "Fetched $($invoices.Count) invoices from DB"

# 7. Warehouses & Fulfillment
$warehouses = Invoke-RestMethod -Uri "$baseUrl/api/fulfillments/warehouses" -Method Get -Headers $headers
Assert-Test ($warehouses -is [Array]) "Fetched $($warehouses.Count) warehouses from DB"

$stocks = Invoke-RestMethod -Uri "$baseUrl/api/fulfillments/stocks" -Method Get -Headers $headers
Assert-Test ($stocks -is [Array]) "Fetched $($stocks.Count) stock records from DB"

# 8. Products & Customers
$products = Invoke-RestMethod -Uri "$baseUrl/api/catalog/products" -Method Get -Headers $headers
Assert-Test ($products -is [Array]) "Fetched $($products.Count) products from catalog DB"

$customers = Invoke-RestMethod -Uri "$baseUrl/api/catalog/customers" -Method Get -Headers $headers
Assert-Test ($customers -is [Array]) "Fetched $($customers.Count) customers from catalog DB"

# 9. Upsell Rules & Customer Portal Quotes
$upsellRules = Invoke-RestMethod -Uri "$baseUrl/api/upsells/rules" -Method Get -Headers $headers
Assert-Test ($upsellRules -is [Array]) "Fetched $($upsellRules.Count) upsell rules from DB"

# 10. Audit Logs
$logs = Invoke-RestMethod -Uri "$baseUrl/api/audit" -Method Get -Headers $headers
Assert-Test ($logs -is [Array]) "Fetched $($logs.Count) audit logs from DB"

# 11. Admin Users List
$users = Invoke-RestMethod -Uri "$baseUrl/api/auth/users" -Method Get -Headers $headers
Assert-Test ($users -is [Array]) "Fetched $($users.Count) user accounts from DB"

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host "API VERIFICATION RESULTS: $passCount PASSED, $failCount FAILED" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
