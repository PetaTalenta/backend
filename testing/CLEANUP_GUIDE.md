# 🧹 ATMA Account Cleanup Guide

This guide explains how to clean up test accounts and their associated data in the ATMA system.

## 📋 Overview

The ATMA system provides several endpoints for users to clean up their own data:
- **User Profile Deletion**: `DELETE /api/auth/profile` - Removes user profile data
- **Analysis Results Deletion**: `DELETE /api/archive/results/:id` - Removes analysis results
- **Analysis Jobs Cancellation**: `DELETE /api/archive/jobs/:jobId` - Cancels/removes analysis jobs

**⚠️ Important Note**: These cleanup tools only remove user-generated data (profiles, results, jobs). Complete user account deletion requires admin privileges via `DELETE /api/archive/admin/users/:userId`.

## 🛠️ Available Cleanup Tools

### 1. Single Account Cleanup (`cleanup-account.js`)

Clean up a single user account and all associated data.

#### Usage:

```bash
# Method 1: Command line arguments
node cleanup-account.js user@example.com myPassword123

# Method 2: Environment variables
CLEANUP_EMAIL=user@example.com CLEANUP_PASSWORD=myPassword123 node cleanup-account.js
```

#### Example Output:
```
🧹 ATMA Account Cleanup Tool
This tool helps you clean up test accounts and their associated data

=== Step 1: Authenticating User ===
✓ User authenticated successfully in 156ms
ℹ User ID: 550e8400-e29b-41d4-a716-446655440000
ℹ User Type: user
ℹ Token Balance: 5

=== Step 2: Performing Account Cleanup ===
✓ User profile deleted
✓ 3 analysis results deleted
✓ 2 analysis jobs cancelled/deleted

📊 Cleanup Results:
✓ User profile deleted
✓ 3 analysis results deleted
✓ 2 analysis jobs cancelled/deleted

📋 CLEANUP SUMMARY
============================================================
👤 Account: user@example.com

🧹 CLEANUP RESULTS:
✅ Successfully cleaned up 6 items:
  ✓ User profile deleted
  ✓ 3 analysis results deleted
  ✓ 2 analysis jobs cancelled

✅ No errors occurred

⚠️  IMPORTANT NOTES:
• This cleanup only removes user profile and analysis data
• The user account itself still exists in the system
• Complete account deletion requires admin privileges
• Contact an administrator for complete account removal

============================================================
✅ Account cleanup completed!
```

### 2. Batch Account Cleanup (`batch-cleanup.js`)

Clean up multiple user accounts at once.

#### Usage:

```bash
# Method 1: Using a JSON file
node batch-cleanup.js accounts.json

# Method 2: Environment variable
CLEANUP_ACCOUNTS='[{"email":"user1@example.com","password":"pass1"},{"email":"user2@example.com","password":"pass2"}]' node batch-cleanup.js

# Method 3: Generate sample accounts (for testing)
node batch-cleanup.js
```

#### Account File Format (`accounts.json`):
```json
[
  {"email": "user1@example.com", "password": "password123"},
  {"email": "user2@example.com", "password": "password456"},
  {"email": "user3@example.com", "password": "password789"}
]
```

#### Example Output:
```
🧹 ATMA Batch Account Cleanup Tool
Clean up multiple test accounts and their associated data

=== Step 1: Loading Account List ===
✓ Loaded 3 accounts from accounts.json

=== Step 2: Performing Batch Cleanup ===

🔄 Processing 3 accounts...

ℹ [1] Authenticating user1@example.com...
✓ [1] ✓ user1@example.com - cleaned 4 items
ℹ [2] Authenticating user2@example.com...
✓ [2] ✓ user2@example.com - cleaned 2 items
ℹ [3] Authenticating user3@example.com...
ℹ [3] ℹ user3@example.com - no items to clean

📊 BATCH CLEANUP REPORT
================================================================================
⏱️  Total Duration: 2.34s
👥 Total Accounts: 3

🎯 SUMMARY:
✅ Successfully processed: 3/3 accounts
🔐 Successfully authenticated: 3/3 accounts
👤 Profiles deleted: 2
📊 Analysis results deleted: 4
⚙️  Analysis jobs cancelled: 2
✅ No errors occurred

⚠️  IMPORTANT NOTES:
• This cleanup only removes user profiles and analysis data
• User accounts themselves still exist in the system
• Complete account deletion requires admin privileges
• Contact an administrator for complete account removal

================================================================================
✅ Batch cleanup completed!
```

## 🔧 Integration with Testing

### E2E Test Integration

The E2E test (`e2e-test.js`) now automatically uses the cleanup functionality:

```javascript
// Test 7 now performs proper cleanup
async test7_DeleteAccount() {
  TestUtils.logStage('Test 7: Clean Up User Account Data');
  
  const cleanupResults = await TestUtils.cleanupUserAccount(this.testUser.token, config.api.baseUrl);
  // ... handles cleanup results
}
```

### Load Test Integration

The load test (`load-test.js`) also uses the cleanup functionality for all test users:

```javascript
// Stage 7 now performs proper cleanup for all users
async stage7_DeleteAccounts() {
  TestUtils.logStage('Stage 7: Clean Up User Account Data');
  // ... cleans up all test users
}
```

## 📊 What Gets Cleaned Up

| Data Type | Endpoint Used | Description |
|-----------|---------------|-------------|
| **User Profile** | `DELETE /api/auth/profile` | Removes profile data (username, full_name, school_id, etc.) |
| **Analysis Results** | `DELETE /api/archive/results/:id` | Removes completed analysis results |
| **Analysis Jobs** | `DELETE /api/archive/jobs/:jobId` | Cancels pending jobs or removes completed job records |

## ⚠️ What Does NOT Get Cleaned Up

- **User Account**: The core user record (email, password, user_type) remains in the system
- **Authentication Data**: Login credentials and user permissions are preserved
- **System Logs**: Server logs and audit trails are not affected

## 🔐 Admin-Only Complete Deletion

For complete user account deletion, administrators can use:

```bash
# Admin endpoint (requires admin token)
DELETE /api/archive/admin/users/:userId
Authorization: Bearer <admin_token>
```

This endpoint:
- Performs a soft delete (changes email to `deleted_{timestamp}_{original_email}`)
- Resets token balance to 0
- Requires admin or superadmin role
- Is irreversible

## 🚀 Quick Start Examples

### Clean up a single test account:
```bash
node cleanup-account.js testuser@example.com TestPass123
```

### Clean up multiple accounts from file:
```bash
echo '[{"email":"user1@test.com","password":"pass1"},{"email":"user2@test.com","password":"pass2"}]' > test-accounts.json
node batch-cleanup.js test-accounts.json
```

### Run E2E test with automatic cleanup:
```bash
node e2e-test.js
```

### Run load test with automatic cleanup:
```bash
node load-test.js
```

## 🔍 Troubleshooting

### Common Issues:

1. **Authentication Failed**
   ```
   Error: Authentication failed - invalid credentials
   ```
   **Solution**: Verify email and password are correct

2. **No Items to Clean**
   ```
   ℹ No analysis results found to delete
   ```
   **Solution**: This is normal if the account has no data

3. **Partial Cleanup**
   ```
   ⚠ Partial cleanup completed with 2 errors
   ```
   **Solution**: Check error messages for specific issues

4. **Service Unavailable**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Ensure all ATMA services are running

## 📞 Need Help?

1. Check that all ATMA backend services are running
2. Verify user credentials are correct
3. Check the console output for specific error messages
4. For complete account deletion, contact an administrator
5. Review the API documentation for endpoint details
