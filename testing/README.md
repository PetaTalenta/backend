# ATMA E2E Testing Suite

Comprehensive End-to-End testing suite for ATMA Backend Services with WebSocket support and complete user flow testing.

## Overview

This testing suite covers the complete user journey:
1. User registration with random email
2. User login
3. WebSocket connection
4. Profile update
5. Assessment submission
6. WebSocket notification handling
7. Profile persona retrieval
8. Chatbot interaction
9. Account deletion

## Features

- **Dual User Testing**: Tests 2 users simultaneously
- **WebSocket Integration**: Real-time notification testing
- **Random Data Generation**: Unique emails and usernames
- **Complete API Coverage**: All major endpoints tested
- **Stress Testing**: Multiple concurrent users
- **Cleanup Support**: Automatic test data cleanup
- **Detailed Logging**: Comprehensive test reporting

## Prerequisites

1. ATMA Backend services running:
   - API Gateway (port 3000)
   - Auth Service (port 3001)
   - Assessment Service (port 3002)
   - Archive Service (port 3003)
   - Notification Service (port 3005)
   - Chatbot Service (port 3006)

2. Database properly initialized
3. All services healthy and responding

## Installation

```bash
cd testing
npm install
```

## Configuration

Edit `.env` file to configure:
- API endpoints
- Timeouts
- Test parameters
- Email domains

## Usage

### Run All Tests
```bash
npm test
```

### Run Single User Test
```bash
npm run test:single
```

### Run Dual User Test
```bash
npm run test:dual
```

### Run Stress Test
```bash
npm run test:stress
```

### Run WebSocket Only Test
```bash
npm run test:websocket
```

### Run Chatbot Test
```bash
npm run test:chatbot
```

### Clean Test Data
```bash
npm run clean
```

## Test Structure

- `test-runner.js` - Main test orchestrator
- `single-user-test.js` - Single user complete flow
- `dual-user-test.js` - Two users parallel testing
- `stress-test.js` - Multiple users stress testing
- `websocket-test.js` - WebSocket specific testing
- `chatbot-test.js` - Chatbot interaction testing
- `lib/` - Shared utilities and helpers
- `data/` - Test data and fixtures
- `reports/` - Test execution reports

## Test Flow

Each test follows this sequence:
1. **Setup**: Generate random user data
2. **Register**: Create new user account
3. **Login**: Authenticate and get JWT token
4. **WebSocket**: Connect and authenticate WebSocket
5. **Profile**: Update user profile information
6. **Assessment**: Submit assessment data
7. **Notification**: Wait for WebSocket notifications
8. **Results**: Retrieve assessment results
9. **Chatbot**: Test chatbot interactions
10. **Cleanup**: Delete test account (optional)

## Error Handling

- Network timeouts
- Authentication failures
- WebSocket connection issues
- API response validation
- Service unavailability

## Reporting

Test results are logged to:
- Console (real-time)
- `reports/` directory (detailed logs)
- JSON format for CI/CD integration

## Troubleshooting

1. **Services Not Running**: Check docker-compose status
2. **Connection Refused**: Verify service ports
3. **Authentication Errors**: Check JWT token validity
4. **WebSocket Issues**: Verify notification service
5. **Timeout Errors**: Increase timeout values in .env
