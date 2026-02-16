# Database Cleanup Script (PowerShell)
# 
# This script cleans all data from the Convex database except the first admin user.
# WARNING: This will delete ALL data! Use only in development!
# 
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/cleanup-database.ps1

Write-Host "⚠️  WARNING: This will delete ALL data from your Convex database!" -ForegroundColor Yellow
Write-Host "⚠️  Only the first admin user will be kept." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Type 'DELETE ALL DATA' to confirm"

if ($confirm -ne "DELETE ALL DATA") {
    Write-Host "❌ Cleanup cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💡 Tip: Copy the token value only (without quotes)" -ForegroundColor Cyan
$token = Read-Host "Enter your admin auth token (from localStorage.getItem('authToken'))"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ Token is required." -ForegroundColor Red
    exit 1
}

# Strip quotes if user included them
$token = $token.TrimStart("'", '"').TrimEnd("'", '"')

Write-Host ""
Write-Host "🔄 Cleaning database..." -ForegroundColor Cyan

# Use npx convex run to execute the mutation
$jsonArgs = "{`"token`": `"$token`"}"
npx convex run cleanup:cleanDatabase $jsonArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database cleaned successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Error cleaning database. Check your token and Convex connection." -ForegroundColor Red
    exit 1
}
