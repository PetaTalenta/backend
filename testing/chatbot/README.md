# Chatbot Service Testing

Testing suite untuk Chatbot Service yang mencakup Phase 1 (Core Service Setup) dan Phase 2 (OpenRouter Integration).

## 📋 Test Files

### Core Service Tests
- `test-chatbot-proxy.js` - Test proxy routing dari API Gateway ke Chatbot Service
- `test-chatbot-simple.js` - Test basic chatbot functionality

### OpenRouter Integration Tests
- `test-openrouter-integration.js` - Test complete OpenRouter integration
- `test-openrouter-ai-integration.js` - Test AI conversation flow
- `test-openrouter-direct.js` - Test direct OpenRouter API calls
- `test-openrouter-direct-ai.js` - Test direct AI functionality
- `test-openrouter-final-report.js` - Comprehensive test report

## 🚀 Running Tests

### Individual Tests
```bash
# Test proxy routing
npm run test:chatbot:proxy

# Test simple chatbot
npm run test:chatbot:simple

# Test OpenRouter integration
npm run test:chatbot:openrouter

# Test AI integration
npm run test:chatbot:ai

# Test direct OpenRouter
npm run test:chatbot:direct

# Generate final report
npm run test:chatbot:report
```

### Run All Chatbot Tests
```bash
npm run test:chatbot:all
```

## 📊 Test Coverage

### Phase 1 - Core Service Setup ✅
- [x] Database schema (conversations, messages, usage_tracking)
- [x] Basic API endpoints (CRUD operations)
- [x] Authentication & JWT validation
- [x] Rate limiting
- [x] Input validation
- [x] Health checks

### Phase 2 - OpenRouter Integration ✅
- [x] OpenRouter service implementation
- [x] Free model optimization (Qwen, Llama)
- [x] Fallback strategy (3-tier fallback)
- [x] Message processing pipeline
- [x] Usage tracking & analytics
- [x] Error handling & retry logic

## ⚙️ Configuration

Tests menggunakan environment variables:
- `API_BASE_URL` - Base URL untuk API Gateway (default: http://localhost:3000)
- `TEST_EMAIL` - Email untuk test user (default: test@example.com)
- `TEST_PASSWORD` - Password untuk test user (default: testpassword123)

## 🔧 Prerequisites

Pastikan services berikut berjalan:
- API Gateway (port 3000)
- Auth Service (port 3001)
- Chatbot Service (port 3006)
- PostgreSQL database dengan chat schema

## 📈 Expected Results

### Successful Test Output
```
✅ Phase 1 - Core Service Setup: PASSED
✅ Phase 2 - OpenRouter Integration: PASSED
✅ All chatbot tests completed successfully
```

### Performance Metrics
- Response time < 5 seconds untuk free models
- Rate limiting: 20 requests/minute
- Zero cost dengan free models
- 99%+ availability dengan fallback strategy

## 🐛 Troubleshooting

### Common Issues
1. **Service not running**: Pastikan semua services aktif
2. **Authentication failed**: Check JWT token dan auth service
3. **OpenRouter API error**: Verify API key dan model availability
4. **Rate limiting**: Tunggu sebelum retry atau gunakan different user

### Debug Mode
```bash
DEBUG=* npm run test:chatbot:all
```
