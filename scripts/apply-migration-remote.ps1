# Apply migration to remote Supabase production via Supabase CLI
# This script uses Supabase CLI to push migration to remote project

# Check if connected to remote project
Write-Host "🔍 Checking Supabase CLI status..." -ForegroundColor Cyan

# Try to get current project
$projectStatus = supabase projects list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase CLI" -ForegroundColor Red
    Write-Host "Please run: supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI is ready" -ForegroundColor Green

# Project reference
$PROJECT_REF = "xlrwvzwpecprhgzfcqxw"
$MIGRATION_FILE = "supabase\migrations\20250113_create_chat_admin_assignments.sql"

Write-Host "`n📋 Migration Details:" -ForegroundColor Cyan
Write-Host "   Project: $PROJECT_REF" -ForegroundColor White
Write-Host "   File: $MIGRATION_FILE" -ForegroundColor White

# Check if migration file exists
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Applying migration to remote project..." -ForegroundColor Cyan

# Option 1: Use supabase db push (if linked)
Write-Host "`nTrying to link project..." -ForegroundColor Yellow
$linkResult = supabase link --project-ref $PROJECT_REF 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully" -ForegroundColor Green
    
    Write-Host "`nPushing migration..." -ForegroundColor Yellow
    supabase db push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Failed to push migration" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Could not link project automatically" -ForegroundColor Yellow
    Write-Host "`nPlease apply migration manually:" -ForegroundColor Cyan
    Write-Host "1. Go to https://supabase.com/dashboard/project/$PROJECT_REF/sql" -ForegroundColor White
    Write-Host "2. Open SQL Editor and run the following:" -ForegroundColor White
    Write-Host ""
    Get-Content $MIGRATION_FILE | Write-Host -ForegroundColor Gray
}
