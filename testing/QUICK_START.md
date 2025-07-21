# 🚀 Quick Start Guide - ATMA Testing Suite

## Prerequisites Checklist

✅ **ATMA Backend Services Running:**
- [ ] API Gateway (port 3000)
- [ ] Auth Service (port 3001) 
- [ ] Archive Service (port 3002)
- [ ] Assessment Service (port 3003)
- [ ] Notification Service (port 3005)

✅ **System Requirements:**
- [ ] Node.js v14+ installed
- [ ] NPM available
- [ ] Terminal/Command Prompt access

## 🎯 Running Tests

### Option 1: Using Batch Script (Windows)
```cmd
# Run all tests
run-tests.bat

# Run only E2E test
run-tests.bat e2e

# Run only Load test  
run-tests.bat load
```

### Option 2: Using Shell Script (Linux/Mac)
```bash
# Make executable (first time only)
chmod +x run-tests.sh

# Run all tests
./run-tests.sh

# Run only E2E test
./run-tests.sh e2e

# Run only Load test
./run-tests.sh load
```

### Option 3: Using NPM Scripts
```bash
# Install dependencies first
npm install

# Run E2E test
npm run test:e2e

# Run Load test
npm run test:load

# Run all tests
npm run test:all
```

### Option 4: Direct Node Execution
```bash
# E2E Test
node e2e-test.js

# Load Test
node load-test.js

# Test Runner
node run-tests.js [e2e|load|all]

# Account Cleanup Tools
node cleanup-account.js <email> <password>
node batch-cleanup.js [accounts-file.json]
```

## 🧹 Account Cleanup Tools

### Single Account Cleanup
```bash
# Clean up a single test account
node cleanup-account.js user@example.com myPassword123

# Using environment variables
CLEANUP_EMAIL=user@example.com CLEANUP_PASSWORD=myPassword123 node cleanup-account.js
```

### Batch Account Cleanup
```bash
# Clean up multiple accounts from JSON file
node batch-cleanup.js test-accounts.json

# Using environment variable
CLEANUP_ACCOUNTS='[{"email":"user1@example.com","password":"pass1"}]' node batch-cleanup.js
```

**What gets cleaned up:**
- ✅ User profile data (username, full_name, school_id, etc.)
- ✅ Analysis results and reports
- ✅ Analysis jobs (pending or completed)

**What does NOT get cleaned up:**
- ⚠️ User account itself (email, password, user_type)
- ⚠️ Complete account deletion requires admin privileges

📖 **For detailed cleanup instructions, see [CLEANUP_GUIDE.md](CLEANUP_GUIDE.md)**

## 📊 What to Expect

### E2E Test Output
```
🧪 ATMA E2E Testing Started
Testing complete user journey from registration to account deletion

=== Test 1: User Registration ===
✓ User registered successfully in 245ms
ℹ Email: john.doe.1@gmail.com

=== Test 2: User Login ===
✓ User logged in successfully in 156ms
ℹ Token received: eyJhbGciOiJIUzI1NiIs...

=== Test 3: Update User Profile ===
✓ Profile updated successfully in 189ms
ℹ Username: johndoe1
ℹ Full Name: John Doe
ℹ School: SMA Negeri 1 Jakarta

=== Test 4: Submit Assessment ===
✓ Assessment submitted successfully in 234ms
ℹ Job ID: 550e8400-e29b-41d4-a716-446655440000
ℹ Queue Position: 1
ℹ Estimated Processing Time: 2-5 minutes

=== Test 5: Wait for Assessment Completion via WebSocket ===
ℹ WebSocket connected, authenticating...
✓ WebSocket authenticated for user: john.doe.1@gmail.com
ℹ Waiting for assessment completion...
ℹ Analysis started: Your analysis has started processing...
✓ Assessment completed in 3.2m
ℹ Result ID: 660e8400-e29b-41d4-a716-446655440001
ℹ Message: Your analysis is ready!

=== Test 6: Check Assessment Results ===
✓ Assessment results retrieved in 123ms
ℹ Found 1 results
ℹ Latest result status: completed

=== Test 7: Clean Up User Account Data ===
✓ Account data cleaned successfully in 167ms
ℹ Cleaned 4 items (profile: yes, results: 2, jobs: 1)

📊 E2E TEST REPORT
=====================================
⏱️  Total Test Duration: 4.5m
👤 Test User: john.doe.1@gmail.com

🎯 TEST SUMMARY:
✅ All E2E tests passed successfully!
✅ Complete user journey validated
✅ WebSocket notifications working
✅ Assessment processing functional
=====================================
✅ E2E test completed successfully!
```

### Load Test Output
```
🚀 ATMA Load Testing Started
Testing 50 users with 10 concurrent operations

=== Stage 1: User Registration ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Registered 50/50 users

=== Stage 2: User Login ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Logged in 50/50 users

=== Stage 3: Update User Profiles ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Updated 50/50 user profiles

=== Stage 4: Submit Assessments ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Submitted 50/50 assessments

=== Stage 5: Wait for Assessment Completion via WebSocket ===
ℹ Monitoring 50 assessments via WebSocket...
Progress |████████████████████| 100% | 50/50 completed | ETA: 0s
✓ 50/50 assessments completed

=== Stage 6: Check Assessment Results ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Checked 50/50 assessment results

=== Stage 7: Clean Up User Account Data ===
Progress |████████████████████| 100% | 50/50 users | ETA: 0s
✓ Account cleanup process completed

📊 LOAD TEST REPORT
================================================================================
⏱️  Total Test Duration: 12.3m
👥 Total Users: 50
🔄 Concurrency: 10

📈 Registration:
   Success Rate: 100.00% (50/50)
   Throughput: 12.34 requests/second
   Response Times:
     Min: 123ms
     Max: 567ms
     Avg: 234ms
     P95: 456ms
     P99: 523ms

📈 Login:
   Success Rate: 100.00% (50/50)
   Throughput: 15.67 requests/second
   Response Times:
     Min: 89ms
     Max: 345ms
     Avg: 156ms
     P95: 289ms
     P99: 334ms

... (similar for all stages)

🎯 OVERALL STATISTICS:
   Total Requests: 350
   Overall Success Rate: 100.00%
   Overall Throughput: 28.45 requests/second
================================================================================
✅ Load test completed successfully!
```

## 🔧 Troubleshooting

### Common Issues & Solutions

1. **Services Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution:** Start all ATMA backend services first

2. **Dependencies Missing**
   ```
   Error: Cannot find module 'axios'
   ```
   **Solution:** Run `npm install` in testing directory

3. **WebSocket Connection Failed**
   ```
   WebSocket connection failed
   ```
   **Solution:** Ensure notification service is running on port 3005

4. **Assessment Timeout**
   ```
   Assessment completion timeout
   ```
   **Solution:** Increase timeout in config.js or check assessment service

5. **Rate Limiting**
   ```
   Rate limit exceeded
   ```
   **Solution:** Reduce concurrency in config.js

### Performance Tuning

**For Slower Systems:**
```javascript
// Edit config.js
{
  test: {
    userCount: 25,        // Reduce from 50
    concurrency: 5,       // Reduce from 10
    delayBetweenStages: 5000, // Increase delay
    assessmentTimeout: 600000  // Increase timeout to 10 minutes
  }
}
```

**For Faster Systems:**
```javascript
// Edit config.js
{
  test: {
    userCount: 100,       // Increase from 50
    concurrency: 20,      // Increase from 10
    delayBetweenStages: 1000, // Reduce delay
    assessmentTimeout: 180000  // Reduce timeout to 3 minutes
  }
}
```

## 📝 Test Data

- **Users**: Random generated emails, usernames, and profiles
- **Passwords**: Follow validation rules (min 8 chars, letter + number)
- **Assessment Data**: Randomized RIASEC, OCEAN, and VIA-IS scores
- **Schools**: Random selection from predefined list
- **Cleanup**: All test data is automatically deleted

## 🎯 Success Criteria

**E2E Test Success:**
- ✅ User registration works
- ✅ Login authentication works  
- ✅ Profile updates work
- ✅ Assessment submission works
- ✅ WebSocket notifications work
- ✅ Assessment processing completes
- ✅ Results retrieval works
- ✅ Account cleanup works

**Load Test Success:**
- ✅ 95%+ success rate across all stages
- ✅ Response times under acceptable thresholds
- ✅ No critical errors or timeouts
- ✅ System handles concurrent load
- ✅ WebSocket connections stable
- ✅ Assessment processing scales

## 📞 Need Help?

1. Check all ATMA services are running
2. Verify configuration in config.js
3. Check console output for specific errors
4. Try reducing concurrency for performance issues
5. Ensure clean database state before testing
