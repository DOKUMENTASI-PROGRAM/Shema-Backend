# Quick Start Guide - Auth Service

## 🚀 Server Already Running
Your Auth Service is currently running in a separate PowerShell window.

**Server Details:**
- URL: http://localhost:3001
- Status: 🟢 Healthy
- Redis: ✅ Connected

## ⚠️ IMPORTANT: Schema Update Needed

Before you can test the auth endpoints, you need to apply the database migration.

### Step 1: Apply Database Migration

```powershell
# Navigate to project root
cd "d:\Tugas\RPL\New folder\Backend"

# Apply the migration to local database
supabase db push

# Verify migration applied
supabase db pull
```

### Step 2: Test Auth Endpoints

```powershell
# Run comprehensive test suite
.\test-auth-endpoints.ps1
```

### Expected Test Results After Migration:
1. ✅ Health Check - Pass
2. ✅ Register New User - Create student account
3. ✅ Login - Get access & refresh tokens
4. ✅ Get Current User - Verify JWT middleware
5. ✅ Refresh Token - Renew access token
6. ✅ Logout - Invalidate tokens
7. ✅ Post-logout Access - Should fail (token invalid)

## 🔧 Manual Testing with PowerShell

### Test Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET | ConvertTo-Json
```

### Test Registration
```powershell
$body = @{
    email = "student@shemamusic.com"
    password = "Student123!"
    full_name = "Test Student"
    role = "student"
    phone_number = "081234567890"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$result | ConvertTo-Json -Depth 5

# Save tokens
$accessToken = $result.data.accessToken
$refreshToken = $result.data.refreshToken
```

### Test Login
```powershell
$body = @{
    email = "student@shemamusic.com"
    password = "Student123!"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$result | ConvertTo-Json -Depth 5
```

### Test Protected Route (/me)
```powershell
$headers = @{
    "Authorization" = "Bearer $accessToken"
}

$me = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/me" `
    -Method GET `
    -Headers $headers

$me | ConvertTo-Json -Depth 5
```

### Test Refresh Token
```powershell
$body = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/refresh" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$result | ConvertTo-Json -Depth 5
```

### Test Logout
```powershell
$body = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/logout" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$result | ConvertTo-Json -Depth 5
```

## 📊 Check Redis Data

```powershell
# Connect to Redis container
docker exec -it redis-shema-music redis-cli

# Check stored refresh tokens
KEYS refresh_token:*

# View a specific token (replace {userId} with actual UUID)
GET refresh_token:{userId}

# Check TTL
TTL refresh_token:{userId}

# Exit
exit
```

## 🔍 Check Database Data

```powershell
# Open Supabase Studio
supabase start

# Navigate to http://127.0.0.1:54323
# Table: users
# Check registered users and their password_hash
```

Or use SQL:
```sql
-- In Supabase Studio SQL Editor
SELECT 
    id,
    full_name,
    email,
    role,
    auth_provider,
    password_hash IS NOT NULL as has_password,
    firebase_uid IS NOT NULL as has_firebase_uid,
    created_at,
    last_login_at
FROM users
ORDER BY created_at DESC;
```

## 🛠️ Troubleshooting

### Server Not Responding
```powershell
# Check if server is running
Test-NetConnection -ComputerName localhost -Port 3001

# If not running, restart
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "cd 'd:\Tugas\RPL\New folder\Backend\services\auth' ; & '$env:USERPROFILE\.bun\bin\bun.exe' run start"
```

### Redis Connection Issues
```powershell
# Check Redis container
docker ps | Select-String "redis-shema-music"

# Restart Redis if needed
docker restart redis-shema-music
```

### View Server Logs
Server logs are visible in the separate PowerShell window where the server is running.

Look for:
- ✅ Redis: Connected
- ✅ Redis: Ready
- 🚀 Auth Service starting on port 3001

## 📋 Next Steps After Auth Works

1. **Create seed data** - Add test users for each role
2. **Implement User Service** - Profile management endpoints
3. **Implement Course Service** - Course catalog management
4. **Implement Booking Service** - Class scheduling
5. **Implement Chat Service** - Real-time chat with WebSocket
6. **Implement Recommendation Service** - AI-based course recommendations

## 🎯 Current Status

✅ Auth Service: Complete & Running
✅ Health Check: Working
❌ Auth Endpoints: Need schema migration
⏳ User Service: Not started
⏳ Course Service: Not started
⏳ Booking Service: Not started
⏳ Chat Service: Not started
⏳ Recommendation Service: Not started

## 📚 Reference Files

- **Summary**: `AUTH_SERVICE_SUMMARY.md`
- **Migration**: `supabase/migrations/20251009162600_add_password_auth.sql`
- **Test Script**: `test-auth-endpoints.ps1`
- **Environment**: `services/auth/.env`
- **Source Code**: `services/auth/src/`

---

**Last Updated**: October 9, 2025
**Server Status**: 🟢 Running on http://localhost:3001
