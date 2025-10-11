# Quick Test Commands - Cheat Sheet

## 🚀 Run All Tests (Fastest Method)

```powershell
cd "d:\Tugas\RPL\New folder\Backend"
npm test
```

---

## 📋 Prerequisites Checklist

Before running tests, ensure:

1. ☐ Redis is running: `redis-server`
2. ☐ Auth Service running: `cd services/auth && npm run dev` (port 3001)
3. ☐ Booking Service running: `cd services/booking && npm run dev` (port 3004)

**Quick Check:**
```powershell
# Check Redis
redis-cli ping

# Check Auth Service
curl http://localhost:3001/health

# Check Booking Service
curl http://localhost:3004/health
```

---

## 🧪 Test Commands

### Run All Tests
```powershell
npm test
```

### Run with Coverage Report
```powershell
npm run test:coverage
```

### Run Specific Test File
```powershell
# Auth Service tests only
npm test -- services/auth/__tests__/authIntegration.test.ts

# Booking Service tests only
npm test -- services/booking/__tests__/bookingIntegration.test.ts
```

### Run Tests in Watch Mode
```powershell
npm run test:watch
```

### Run with Verbose Output
```powershell
npm test -- --verbose
```

### Run Tests Using Test Runner (with checks)
```powershell
node scripts/test-runner.js
```

---

## 🔧 Start Services (Separate Terminals)

### Terminal 1: Redis
```powershell
redis-server
```

### Terminal 2: Auth Service
```powershell
cd "d:\Tugas\RPL\New folder\Backend\services\auth"
npm run dev
```

### Terminal 3: Booking Service
```powershell
cd "d:\Tugas\RPL\New folder\Backend\services\booking"
npm run dev
```

### Terminal 4: Run Tests
```powershell
cd "d:\Tugas\RPL\New folder\Backend"
npm test
```

---

## 📊 View Test Results

### Coverage Report
```powershell
npm run test:coverage
# Open: coverage/index.html in browser
```

### Test Results File
```powershell
# After running tests, check:
# TEST_RESULTS.md (if configured to output)
```

---

## 🐛 Quick Fixes

### Redis Not Running
```powershell
redis-server
```

### Auth Service Not Running
```powershell
cd services/auth
npm install  # if first time
npm run dev
```

### Booking Service Not Running
```powershell
cd services/booking
npm install  # if first time
npm run dev
```

### Clear Test Data (Manual Cleanup)
Run in Supabase SQL Editor:
```sql
DELETE FROM bookings WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%test-%'
);
DELETE FROM student_profiles WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%test-%'
);
DELETE FROM users WHERE email LIKE '%test-%';
DELETE FROM courses WHERE title LIKE '%Test%';
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.env.test` | Test environment config (Remote Supabase) |
| `jest.config.js` | Jest configuration |
| `services/auth/__tests__/authIntegration.test.ts` | Auth tests |
| `services/booking/__tests__/bookingIntegration.test.ts` | Booking tests |

---

## ✅ Expected Output (Success)

```
 PASS  services/auth/__tests__/authIntegration.test.ts
 PASS  services/booking/__tests__/bookingIntegration.test.ts

Test Suites: 2 passed, 2 total
Tests:       16 passed, 16 total
Time:        20.856 s
```

---

## 💡 Tips

- Tests use **Remote Supabase (Production)** - ensure internet connection
- All test data is auto-cleaned after tests
- Use unique timestamps in test data to avoid conflicts
- Check service logs if tests fail

---

## 📚 Full Documentation

For detailed information:
- `docs/testing/TESTING_GUIDE.md` - Complete testing guide
- `docs/testing/TEST_EXECUTION_SUMMARY.md` - Execution summary

---

**Ready? Run:** `npm test` 🚀
