$accounts = @(
    "admin@dealflow360.com",
    "j.rao@dealflow360.com",
    "m.shah@dealflow360.com",
    "r.iyer@dealflow360.com",
    "buyer@acmecorp.com",
    "user_sec_0001@dealflow360corp.com",
    "user_sec_0050@dealflow360corp.com"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "=== VERIFYING ALL ROLE LOGINS WITH PASSWORD: Amin@123 ===" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

foreach ($email in $accounts) {
    try {
        $body = @{
            email = $email
            password = "Amin@123"
        } | ConvertTo-Json

        $res = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
        Write-Host " [PASS] Login Success for $email | Role: $($res.role) | Name: $($res.name)" -ForegroundColor Green
    } catch {
        Write-Host " [FAIL] Login Failed for $email : $_" -ForegroundColor Red
    }
}
Write-Host "============================================================" -ForegroundColor Cyan
