$auth = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"admin@dealflow360.com","password":"Admin@123"}'
$headers = @{ Authorization = "Bearer $($auth.token)" }

Write-Host "=== USERS (ROLE = CUSTOMER) ===" -ForegroundColor Cyan
$users = Invoke-RestMethod -Uri 'http://localhost:8080/api/admin/users' -Headers $headers
$custUsers = $users | Where-Object { $_.role -eq 'CUSTOMER' }
$custUsers | Format-Table id, name, email, role, team

Write-Host "`n=== MASTER CUSTOMERS (CATALOG) ===" -ForegroundColor Yellow
$customers = Invoke-RestMethod -Uri 'http://localhost:8080/api/catalog/customers' -Headers $headers
$customers | Format-Table id, name, email, portalUserId, tier
