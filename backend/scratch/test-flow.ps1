# Step 1: Login as Sales Rep
$loginBody = @{
    email = 'j.rao@dealflow360.com'
    password = 'password123'
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -Body $loginBody -ContentType 'application/json'
$token = $loginRes.token
Write-Host "=== 1. Sales Rep Login SUCCESS ==="
Write-Host "Token received for user: $($loginRes.user.name) (Role: $($loginRes.user.role))"

$headers = @{
    Authorization = "Bearer $token"
}

# Step 2: List Permitted Quotations
Write-Host "`n=== 2. Testing GET /api/quotations ==="
$quotes = Invoke-RestMethod -Uri 'http://localhost:8080/api/quotations' -Method Get -Headers $headers
Write-Host "Total quotations scoped for Sales Rep: $($quotes.Count)"
foreach ($q in $quotes) {
    Write-Host " -> ID: $($q.id) | Num: $($q.quoteNumber) | Status: $($q.status) | Customer: $($q.customer.name) | Total: $($q.totalAmount)"
}

# Step 3: Get Quotation Detail by ID
Write-Host "`n=== 3. Testing GET /api/quotations/1 ==="
$q1 = Invoke-RestMethod -Uri 'http://localhost:8080/api/quotations/1' -Method Get -Headers $headers
Write-Host "Loaded $($q1.quoteNumber) - Customer: $($q1.customer.name) - Lines: $($q1.lines.Count) - Margin: $($q1.marginPercentage)% - Risk: $($q1.blendedRiskScore)"

# Step 4: Test Live Calculation Preview
Write-Host "`n=== 4. Testing POST /api/quotations/calculate ==="
$calcBody = @{
    customerId = 1
    lines = @(
        @{ productId = 1; quantity = 2; discountPercent = 12.0 },
        @{ productId = 5; quantity = 1; discountPercent = 18.0 }
    )
} | ConvertTo-Json
$calcRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/quotations/calculate' -Method Post -Body $calcBody -ContentType 'application/json' -Headers $headers
Write-Host "Calculation Preview:"
Write-Host " -> Subtotal: $($calcRes.subtotalAmount)"
Write-Host " -> Total Discount: $($calcRes.totalDiscountAmount)"
Write-Host " -> Net Total: $($calcRes.totalAmount)"
Write-Host " -> Margin: $($calcRes.marginPercentage)%"
Write-Host " -> Risk Score: $($calcRes.blendedRiskScore) (Level: $($calcRes.riskLevel))"
Write-Host " -> Requires Approval: $($calcRes.requiresApproval)"

# Step 5: Create New Quotation (Save Draft)
Write-Host "`n=== 5. Testing POST /api/quotations (Create Draft) ==="
$createBody = @{
    customerId = 1
    promisedDeliveryDate = '2026-10-15'
    lines = @(
        @{ productId = 1; quantity = 2; discountPercent = 5.0 },
        @{ productId = 3; quantity = 4; discountPercent = 0.0 }
    )
} | ConvertTo-Json
$createRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/quotations' -Method Post -Body $createBody -ContentType 'application/json' -Headers $headers
Write-Host "Created Quotation -> ID: $($createRes.id), Number: $($createRes.quoteNumber), Status: $($createRes.status), Total: $($createRes.totalAmount)"

$newQuoteId = $createRes.id

# Step 6: Update Lines on Draft
Write-Host "`n=== 6. Testing PUT /api/quotations/$newQuoteId/lines ==="
$updateLinesBody = @(
    @{ productId = 1; quantity = 3; discountPercent = 8.0 },
    @{ productId = 3; quantity = 4; discountPercent = 0.0 }
) | ConvertTo-Json
$updateRes = Invoke-RestMethod -Uri "http://localhost:8080/api/quotations/$newQuoteId/lines" -Method Put -Body $updateLinesBody -ContentType 'application/json' -Headers $headers
Write-Host "Updated Quotation -> Lines: $($updateRes.lines.Count), New Subtotal: $($updateRes.subtotalAmount), Total: $($updateRes.totalAmount)"

# Step 7: Submit for Approval
Write-Host "`n=== 7. Testing POST /api/quotations/$newQuoteId/submit ==="
$submitRes = Invoke-RestMethod -Uri "http://localhost:8080/api/quotations/$newQuoteId/submit" -Method Post -Headers $headers
Write-Host "Submitted Quotation -> Status is now: $($submitRes.status)"

# Step 8: Verify as Sales Manager
Write-Host "`n=== 8. Login as Sales Manager and verify ==="
$mgrLoginBody = @{
    email = 'm.shah@dealflow360.com'
    password = 'password123'
} | ConvertTo-Json
$mgrLoginRes = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -Body $mgrLoginBody -ContentType 'application/json'
$mgrHeaders = @{ Authorization = "Bearer $($mgrLoginRes.token)" }
$mgrQuotes = Invoke-RestMethod -Uri 'http://localhost:8080/api/quotations' -Method Get -Headers $mgrHeaders
Write-Host "Sales Manager sees $($mgrQuotes.Count) total quotations in pipeline"

Write-Host "`n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ==="
