# ATMA E2E Testing Suite - Setup Summary

## 📁 Folder Structure Created

```
testing/
├── package.json                 # Dependencies and scripts
├── .env                        # Environment configuration
├── README.md                   # Main documentation
├── TESTING_GUIDE.md           # Comprehensive testing guide
├── SETUP_SUMMARY.md           # This file
├── run-tests.sh               # Main test runner script
├── cleanup.js                 # Test data cleanup utility
├── test-runner.js             # Test orchestrator
├── single-user-test.js        # Single user E2E test
├── dual-user-test.js          # Dual user parallel test
├── websocket-test.js          # WebSocket focused test
├── chatbot-test.js            # Chatbot interaction test
├── stress-test.js             # Stress/load testing
├── lib/                       # Shared utilities
│   ├── api-client.js          # API client wrapper
│   ├── websocket-client.js    # WebSocket client wrapper
│   ├── test-data.js           # Test data generator
│   └── test-logger.js         # Logging utility
├── data/                      # Test data templates
│   ├── sample-assessment.json # Sample assessment data
│   └── chat-messages.json     # Sample chat messages
├── scripts/                   # Utility scripts
│   ├── install.sh             # Installation script
│   └── check-services.js      # Service health checker
└── reports/                   # Test execution reports (auto-created)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd testing
npm install
```

### 2. Check Services
```bash
npm run check-services
```

### 3. Run Tests
```bash
# Run all tests
npm test

# Or use the shell script (Linux/Mac)
./run-tests.sh
```

## 📋 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all E2E tests |
| `npm run test:single` | Single user complete flow |
| `npm run test:dual` | Two users parallel testing |
| `npm run test:websocket` | WebSocket functionality |
| `npm run test:chatbot` | Chatbot interactions |
| `npm run test:stress` | Stress testing (5 users) |
| `npm run check-services` | Check service health |
| `npm run clean` | Clean test data |

## 🔧 Configuration

### Environment Variables (.env)
```bash
# API Configuration
API_BASE_URL=http://localhost:3000/api
WEBSOCKET_URL=http://localhost:3000

# Timeouts (milliseconds)
TEST_TIMEOUT=30000
ASSESSMENT_TIMEOUT=300000
WEBSOCKET_TIMEOUT=10000

# Test Settings
ENABLE_CLEANUP=true
ENABLE_DETAILED_LOGS=true
PARALLEL_USERS=2
STRESS_TEST_USERS=5

# Test Data
EMAIL_DOMAIN=example.com
USERNAME_PREFIX=testuser
DEFAULT_ASSESSMENT_NAME=AI-Driven Talent Mapping
```

## 🧪 Test Flow Overview

Each test follows this complete user journey:

1. **Registration** - Create user with random email
2. **Login** - Authenticate and get JWT token
3. **WebSocket** - Connect and authenticate WebSocket
4. **Profile Update** - Update user profile information
5. **Assessment** - Submit assessment data
6. **Notification** - Wait for WebSocket completion notification
7. **Results** - Retrieve assessment results and persona
8. **Chatbot** - Test chatbot interactions
9. **Cleanup** - Delete test account (optional)

## 📊 Test Types Explained

### Single User Test
- Complete end-to-end flow for one user
- Tests all API endpoints and WebSocket functionality
- Validates complete user journey
- **Duration**: ~5-10 minutes

### Dual User Test
- Runs 2 users simultaneously
- Tests concurrent operations
- Validates no data cross-contamination
- **Duration**: ~8-15 minutes

### WebSocket Test
- Focused WebSocket functionality testing
- Connection, authentication, notifications
- Reconnection and error handling
- **Duration**: ~3-8 minutes

### Chatbot Test
- Comprehensive chatbot testing
- Conversation creation and management
- Assessment integration
- **Duration**: ~5-12 minutes

### Stress Test
- Multiple concurrent users (default: 5)
- Performance metrics collection
- System limit testing
- **Duration**: ~10-20 minutes

## 🔍 Service Requirements

Before running tests, ensure these services are running:

| Service | Port | Health Check |
|---------|------|--------------|
| API Gateway | 3000 | `http://localhost:3000/api/health` |
| Auth Service | 3001 | `http://localhost:3001/health` |
| Assessment Service | 3002 | `http://localhost:3002/health` |
| Archive Service | 3003 | `http://localhost:3003/health` |
| Notification Service | 3005 | `http://localhost:3005/health` |
| Chatbot Service | 3006 | `http://localhost:3006/health` |

**Start services:**
```bash
docker-compose up -d
```

## 📈 Expected Performance

| Operation | Expected Time |
|-----------|---------------|
| User Registration | < 2 seconds |
| User Login | < 1 second |
| WebSocket Connection | < 3 seconds |
| Assessment Submission | < 5 seconds |
| Assessment Completion | < 5 minutes |
| Chatbot Response | < 10 seconds |

## 🧹 Test Data Management

### Automatic Cleanup
- Enabled by default (`ENABLE_CLEANUP=true`)
- Removes test accounts after completion
- Cleans associated data (conversations, results)

### Manual Cleanup
```bash
npm run clean
```

### Test Data Identification
Test data is marked with:
- Email domain: `test.atma.local`
- Username prefix: `testuser_`
- Assessment names: Contains "AI-Driven Talent Mapping"
- Conversation metadata: `test_session: true`

## 🐛 Troubleshooting

### Common Issues

1. **Services Not Running**
   ```bash
   npm run check-services
   docker-compose up -d
   ```

2. **WebSocket Connection Failed**
   - Check notification service (port 3005)
   - Verify API Gateway WebSocket proxy

3. **Assessment Timeout**
   - Increase `ASSESSMENT_TIMEOUT` in .env
   - Check analysis worker service

4. **Authentication Errors**
   - Verify JWT token validity
   - Check auth service status

### Debug Mode
```bash
ENABLE_DETAILED_LOGS=true npm test
```

## 📝 Test Reports

Test execution generates detailed reports in `reports/` directory:
- JSON format with timestamps
- Success/failure metrics
- Error details and stack traces
- Performance metrics

## 🔄 Continuous Integration

Example GitHub Actions workflow:
```yaml
- name: Run E2E Tests
  run: |
    cd testing
    npm install
    npm run check-services
    npm test
```

## 📚 Documentation

- `README.md` - Basic setup and usage
- `TESTING_GUIDE.md` - Comprehensive testing guide
- `SETUP_SUMMARY.md` - This quick reference
- API documentation in `../api-gateway/api_external.md`
- WebSocket manual in `../notification-service/WEBSOCKET_MANUAL.md`

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Start ATMA services**: `docker-compose up -d`
3. **Check service health**: `npm run check-services`
4. **Run your first test**: `npm run test:single`
5. **Review test reports**: Check `reports/` directory
6. **Customize configuration**: Edit `.env` file as needed

## 💡 Tips

- Start with single user test to verify setup
- Use detailed logging for debugging: `ENABLE_DETAILED_LOGS=true`
- Monitor service logs during test execution
- Adjust timeouts based on your system performance
- Use stress tests to validate system limits

## 🆘 Support

If you encounter issues:
1. Check service health with `npm run check-services`
2. Review test logs in `reports/` directory
3. Enable detailed logging for more information
4. Consult the comprehensive `TESTING_GUIDE.md`
5. Check API documentation for endpoint details

---

**Ready to test!** 🚀

The E2E testing suite is now fully configured and ready to validate your ATMA backend services with comprehensive automated testing.
