# ATMA Backend K6 Testing Suite

Comprehensive load and performance testing suite for ATMA Backend API using K6.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Levels](#test-levels)
- [Configuration](#configuration)
- [Results and Reports](#results-and-reports)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This testing suite implements the comprehensive testing plan outlined in `COMPREHENSIVE_TESTING_PLAN.md`. It includes:

- **End-to-End Testing**: Complete 14-phase user flow from registration to logout
- **Load Testing**: 5 levels from 1 to 200 concurrent users
- **Performance Metrics**: Response times, error rates, throughput
- **Smoke Testing**: Quick health checks for all services

## 📦 Prerequisites

### Required Software

1. **K6** - Load testing tool
   ```bash
   # Ubuntu/Debian
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   
   # Or using Docker
   docker pull grafana/k6:latest
   ```

2. **Node.js** (optional, for package.json scripts)
   ```bash
   # Already installed in your system
   node --version
   ```

### System Requirements

- **Memory**: Minimum 4GB RAM (8GB+ recommended for high load tests)
- **CPU**: Multi-core processor recommended
- **Network**: Stable internet connection
- **Disk**: 1GB free space for test results

## 🚀 Installation

1. Navigate to the testing directory:
   ```bash
   cd testing/k6
   ```

2. Make the runner script executable:
   ```bash
   chmod +x run-all-tests.sh
   ```

3. Verify K6 installation:
   ```bash
   k6 version
   ```

## 📁 Test Structure

```
testing/k6/
├── lib/
│   ├── config.js              # Central configuration
│   ├── helpers.js             # Helper functions and metrics
│   ├── assessment-data.js     # Sample assessment data
│   └── websocket.js           # WebSocket utilities
├── scripts/
│   ├── e2e-full-flow.js       # Main E2E test (14 phases)
│   ├── smoke-test.js          # Quick smoke test
│   ├── load-test-level1.js    # 1 user baseline
│   ├── load-test-level2.js    # 5 users light load
│   ├── load-test-level3.js    # 25 users medium load
│   ├── load-test-level4.js    # 100 users high load
│   └── load-test-level5.js    # 200 users peak load
├── results/                   # Test results (generated)
├── package.json               # NPM scripts
├── run-all-tests.sh          # Run all tests sequentially
└── README.md                  # This file
```

## 🏃 Running Tests

### Quick Start

1. **Smoke Test** (30 seconds):
   ```bash
   k6 run scripts/smoke-test.js
   ```

2. **E2E Full Flow** (single user):
   ```bash
   k6 run scripts/e2e-full-flow.js
   ```

3. **Load Test Level 1** (baseline):
   ```bash
   k6 run scripts/load-test-level1.js
   ```

### Using NPM Scripts

```bash
# Smoke test
npm run test:smoke

# E2E test
npm run test:e2e

# Load tests
npm run test:load:level1
npm run test:load:level2
npm run test:load:level3
npm run test:load:level4
npm run test:load:level5
```

### Run All Tests

```bash
./run-all-tests.sh
```

This will:
- Run all tests sequentially
- Generate JSON reports
- Create HTML summary
- Save results to `results/TIMESTAMP/`

### Using Docker

```bash
# Smoke test
docker run --rm -v $(pwd):/tests grafana/k6:latest run /tests/scripts/smoke-test.js

# E2E test
docker run --rm -v $(pwd):/tests grafana/k6:latest run /tests/scripts/e2e-full-flow.js
```

## 📊 Test Levels

### Level 1: Baseline (1 User)
- **Duration**: 10 minutes
- **Purpose**: Establish baseline performance
- **Expected**: < 5s response time, < 1% error rate

### Level 2: Light Load (5 Users)
- **Duration**: 15 minutes
- **Ramp-up**: 50 seconds
- **Purpose**: Test basic concurrency
- **Expected**: < 10s response time, < 2% error rate

### Level 3: Medium Load (25 Users)
- **Duration**: 30 minutes
- **Ramp-up**: 2.5 minutes
- **Purpose**: Test realistic usage
- **Expected**: < 15s response time, < 5% error rate

### Level 4: High Load (100 Users)
- **Duration**: 60 minutes
- **Ramp-up**: 10 minutes
- **Purpose**: Test under stress
- **Expected**: < 30s response time, < 10% error rate

### Level 5: Peak Load (200 Users)
- **Duration**: 120 minutes
- **Ramp-up**: 10 minutes
- **Purpose**: Find breaking point
- **Expected**: < 60s response time, < 15% error rate

## ⚙️ Configuration

### Environment Variables

Create a `.env` file or export variables:

```bash
# API Configuration
export BASE_URL="https://api.futureguide.id"
export WS_URL="wss://api.futureguide.id"

# Test User Configuration
export TEST_USER_PREFIX="k6test"
export TEST_USER_DOMAIN="example.com"
export TEST_PASSWORD="TestPass123!"

# Existing User (for quick tests)
export EXISTING_USER_EMAIL="kasykoi@gmail.com"
export EXISTING_USER_PASSWORD="Anjas123"

# Logging
export LOG_LEVEL="info"  # debug, info, warn, error
export VERBOSE="false"
```

### Custom Configuration

Edit `lib/config.js` to customize:
- Timeouts
- Thresholds
- Load levels
- Assessment data

## 📈 Results and Reports

### Output Files

After running tests, results are saved to `results/TIMESTAMP/`:

```
results/20251008_143022/
├── index.html                    # HTML summary
├── smoke-test.json              # Raw K6 output
├── smoke-test_summary.json      # Summary metrics
├── e2e-full-flow.json
├── e2e-full-flow_summary.json
├── load-test-level1.json
├── load-test-level1_summary.json
└── ...
```

### Viewing Results

1. **Console Output**: Real-time metrics during test execution
2. **JSON Files**: Detailed metrics for analysis
3. **HTML Report**: Open `results/TIMESTAMP/index.html` in browser

### Key Metrics

- **http_req_duration**: Response time (avg, p95, p99)
- **http_req_failed**: Error rate
- **http_reqs**: Total requests
- **iterations**: Completed test iterations
- **vus**: Virtual users
- **Custom Metrics**:
  - `errors`: Error rate
  - `success`: Success rate
  - `phase_completion_time`: Time per phase
  - `total_flow_time`: Total E2E flow time
  - `assessment_processing_time`: Assessment processing duration

### Example Output

```
✓ Phase 1: User Registration passed
✓ Phase 2: First Logout passed
✓ Phase 3: Re-login passed
...
✓ Phase 14: Final Logout passed

Total Duration: 487s
Job ID: 550e8400-e29b-41d4-a716-446655440000
Result ID: 550e8400-e29b-41d4-a716-446655440001
Conversation ID: 550e8400-e29b-41d4-a716-446655440002
```

## 🔧 Troubleshooting

### Common Issues

#### 1. K6 Not Found
```bash
# Verify installation
k6 version

# Reinstall if needed
sudo apt-get install k6
```

#### 2. Connection Timeout
- Check network connectivity
- Verify BASE_URL is correct
- Increase timeout in `lib/config.js`

#### 3. Authentication Errors
- Verify test user credentials
- Check if Firebase is configured
- Ensure tokens are not expired

#### 4. High Error Rates
- Check service health: `curl https://api.futureguide.id/health`
- Verify database is running
- Check RabbitMQ status
- Review service logs

#### 5. WebSocket Issues
- K6 has limited Socket.IO support
- Tests use polling fallback
- For full WebSocket testing, consider Artillery

### Debug Mode

Enable verbose logging:

```bash
export LOG_LEVEL="debug"
export VERBOSE="true"
k6 run scripts/e2e-full-flow.js
```

### Performance Tips

1. **For High Load Tests**:
   - Run on dedicated machine
   - Close unnecessary applications
   - Monitor system resources

2. **For Accurate Results**:
   - Run tests during off-peak hours
   - Ensure stable network
   - Run multiple iterations

3. **For Faster Iteration**:
   - Use smoke test first
   - Start with Level 1-2
   - Gradually increase load

## 📝 Test Phases

The E2E test covers 14 phases:

1. ✅ User Registration
2. ✅ First Logout
3. ✅ Re-login
4. ⚠️ WebSocket Connection (polling fallback)
5. ✅ Get User Profile
6. ✅ Get Archive Data
7. ✅ Submit Assessment
8. ⚠️ Wait for Notification (polling)
9. ✅ Poll Job Status
10. ✅ Get Result Details
11. ✅ Create Chatbot Conversation
12. ✅ Send Chatbot Messages
13. ✅ Get Conversation Messages
14. ✅ Final Logout

## 🎯 Success Criteria

### Functional
- ✅ All endpoints responding
- ✅ Complete flow executable
- ✅ Data consistency maintained
- ✅ Error handling graceful

### Performance
- ✅ Response times within targets
- ✅ Error rate < 5% (normal load)
- ✅ System handles 100 concurrent users
- ✅ No memory leaks

### Reliability
- ✅ System recovers from failures
- ✅ No data loss
- ✅ Graceful degradation under load

## 📚 Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [ATMA Testing Plan](../COMPREHENSIVE_TESTING_PLAN.md)
- [API Documentation](https://api.futureguide.id/docs)

## 🤝 Contributing

To add new tests:

1. Create test script in `scripts/`
2. Use helpers from `lib/`
3. Follow existing patterns
4. Update this README
5. Test thoroughly

## 📄 License

MIT License - ATMA Team

