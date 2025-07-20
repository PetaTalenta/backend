# Analysis Worker - AI-Driven Persona Analysis

The Analysis Worker is a microservice that processes assessment data using Google's Gemini AI to generate comprehensive persona profiles. It includes advanced token counting and usage tracking capabilities for cost monitoring and optimization.

## Features

### Core Functionality
- **AI-Powered Analysis**: Uses Google Gemini 2.5 Flash for persona profile generation
- **Queue-Based Processing**: Consumes assessment jobs from RabbitMQ
- **Structured Output**: Generates JSON-formatted persona profiles with validation
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Optimized Processing**: Uses optimized processor with rate limiting, deduplication, and audit logging

### Optimized Processing Engine
- **Rate Limiting**: Multi-level rate limiting (per user, per IP, global)
- **Job Deduplication**: Prevents duplicate processing and saves resources
- **Audit Logging**: Comprehensive security and compliance logging
- **Token Refund**: Automatic token refund for failed operations
- **Connection Pooling**: Optimized HTTP connections with keep-alive
- **Batch Operations**: Efficient batch processing for database operations
- **Async Operations**: Non-blocking operations for better performance

### Token Counting & Usage Tracking
- **Accurate Token Counting**: Uses Gemini's native `countTokens` API
- **Cost Estimation**: Real-time cost calculations based on token usage
- **Usage Analytics**: Detailed statistics and reporting capabilities
- **Performance Monitoring**: Non-intrusive monitoring with minimal overhead
- **Mock Support**: Consistent behavior for testing without API costs

## Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   RabbitMQ      │───▶│   Analysis Worker    │───▶│  Archive Service│
│                 │    │                      │    │                 │
│ - Job Queue     │    │ - AI Service         │    │ - Result Storage│
│ - Dead Letter   │    │ - Token Counting     │    │ - Data Archival │
│ - Retry Logic   │    │ - Usage Tracking     │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Google Gemini  │
                       │                 │
                       │ - AI Generation │
                       │ - Token Counting│
                       │ - Usage Metadata│
                       └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- RabbitMQ 3.11+
- Google AI API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Worker**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start

   # With mock AI (for testing)
   npm run dev:mock
   ```

## Configuration

### Essential Environment Variables

```env
# Google AI Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GOOGLE_AI_MODEL=gemini-2.5-flash
AI_TEMPERATURE=0.7

# Token Counting Configuration
ENABLE_TOKEN_COUNTING=true
TOKEN_USAGE_RETENTION_DAYS=30
INPUT_TOKEN_PRICE_PER_1K=0.000075
OUTPUT_TOKEN_PRICE_PER_1K=0.0003

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
QUEUE_NAME=assessment_analysis

# Service URLs
ARCHIVE_SERVICE_URL=http://localhost:3002
ASSESSMENT_SERVICE_URL=http://localhost:3003
```

### Configuration Profiles

#### Development
```env
NODE_ENV=development
USE_MOCK_MODEL=true
LOG_LEVEL=debug
TOKEN_USAGE_RETENTION_DAYS=7
```

#### Production
```env
NODE_ENV=production
USE_MOCK_MODEL=false
LOG_LEVEL=info
TOKEN_USAGE_RETENTION_DAYS=90
```

For complete configuration options, see [Configuration Guide](./docs/CONFIGURATION_GUIDE.md).

## Token Counting System

### Overview

The token counting system provides comprehensive monitoring of Gemini API usage:

- **Input Token Counting**: Counts tokens before API calls using Gemini's `countTokens` API
- **Output Token Extraction**: Extracts usage metadata from API responses
- **Cost Calculation**: Real-time cost estimation based on current pricing
- **Usage Analytics**: Aggregated statistics with time-based reporting
- **Graceful Degradation**: Continues operation even when token counting fails

### Usage Statistics

```javascript
const UsageTracker = require('./src/services/usageTracker');
const usageTracker = new UsageTracker();

// Get daily usage
const dailyStats = usageTracker.getDailyUsage();
console.log('Today:', dailyStats);

// Get usage for specific timeframe
const weeklyStats = usageTracker.getUsageStats('weekly');
console.log('This week:', weeklyStats);
```

### Cost Monitoring

```javascript
// Automatic cost calculation in logs
{
  "message": "AI response received with token usage",
  "jobId": "job-123",
  "inputTokens": 1250,
  "outputTokens": 850, 
  "totalTokens": 2100,
  "estimatedCost": 0.000349,
  "responseTime": 2500
}
```

## API Reference

### Core Services

#### AI Service
```javascript
const aiService = require('./src/services/aiService');

// Generate persona profile (with automatic token counting)
const result = await aiService.generatePersonaProfile(assessmentData, jobId);
```

#### Token Counter Service
```javascript
const TokenCounterService = require('./src/services/tokenCounterService');
const tokenCounter = new TokenCounterService();

// Count input tokens
const tokenData = await tokenCounter.countInputTokens(client, model, prompt, jobId);

// Calculate costs
const cost = tokenCounter.calculateEstimatedCost(inputTokens, outputTokens);
```

#### Usage Tracker
```javascript
const UsageTracker = require('./src/services/usageTracker');
const usageTracker = new UsageTracker();

// Track usage
usageTracker.trackUsage(jobId, tokenData);

// Get statistics
const stats = usageTracker.getUsageStats('daily');
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "token"
npm test -- --grep "usage"

# Run integration tests
npm run test:integration

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- **Unit Tests**: 45+ test cases covering core functionality
- **Integration Tests**: End-to-end testing with real and mock APIs
- **Performance Tests**: Response time and memory usage validation
- **Error Handling Tests**: Failure scenarios and recovery mechanisms

### Mock Testing

For development and testing without API costs:

```env
USE_MOCK_MODEL=true
```

This provides:
- Consistent mock responses
- Mock token counting
- No API charges
- Faster test execution

## Monitoring & Logging

### Log Levels

- **ERROR**: Critical failures requiring immediate attention
- **WARN**: Issues that don't stop operation (e.g., token counting failures)
- **INFO**: Normal operation events (job processing, token usage)
- **DEBUG**: Detailed diagnostic information

### Key Metrics

Monitor these metrics for optimal performance:

- **Response Time**: Average time per AI operation
- **Token Usage Rate**: Tokens consumed per hour/day
- **Cost Accumulation**: Estimated costs over time
- **Success Rate**: Percentage of successful operations
- **Queue Depth**: Number of pending jobs

### Sample Logs

```json
{
  "level": "info",
  "message": "Processing assessment job",
  "jobId": "job-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

{
  "level": "info", 
  "message": "Input token counting completed",
  "jobId": "job-123",
  "inputTokens": 1250,
  "success": true,
  "timestamp": "2024-01-15T10:30:01.000Z"
}

{
  "level": "info",
  "message": "Persona profile generated successfully",
  "jobId": "job-123",
  "totalTokens": 2100,
  "estimatedCost": 0.000349,
  "responseTime": 2500,
  "timestamp": "2024-01-15T10:30:02.500Z"
}
```

## Performance

### Optimization Features

- **Parallel Processing**: Token counting runs concurrently with AI generation
- **Efficient Storage**: Circular buffer for usage data management
- **Graceful Degradation**: Fallback mechanisms for reliability
- **Memory Management**: Automatic cleanup of old usage data

### Performance Metrics

Based on testing:
- **Latency Overhead**: < 100ms additional response time
- **Memory Usage**: ~10MB for 30 days of usage data
- **CPU Impact**: < 5% additional CPU usage
- **Throughput**: Processes 100+ assessments per minute

## Error Handling

### Graceful Degradation

The system is designed to never interrupt AI operations:

1. **Token Counting Failure**: Logs warning, continues with AI operation
2. **Usage Tracking Failure**: Logs warning, continues with AI operation
3. **Cost Calculation Failure**: Uses fallback estimation
4. **API Timeout**: Falls back to character-based estimation

### Retry Logic

- **Infrastructure Errors**: Automatic retry with exponential backoff
- **AI Service Errors**: No retry to prevent token waste
- **Validation Errors**: Immediate failure with detailed logging

## Troubleshooting

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| No token logs | Missing usage information | Check `ENABLE_TOKEN_COUNTING=true` |
| High costs | Unexpected cost estimates | Verify pricing configuration |
| Slow performance | High response times | Reduce `TOKEN_COUNT_TIMEOUT` |
| Memory issues | High memory usage | Reduce `TOKEN_USAGE_RETENTION_DAYS` |

### Debug Mode

Enable detailed debugging:

```env
LOG_LEVEL=debug
```

For comprehensive troubleshooting, see [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md).

## Documentation

### Complete Documentation

- [Token Counting System](./docs/TOKEN_COUNTING_SYSTEM.md) - Comprehensive system overview
- [Configuration Guide](./docs/CONFIGURATION_GUIDE.md) - Detailed configuration instructions
- [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md) - Problem diagnosis and solutions
- [Usage Reporting Demo](./examples/usage-reporting-demo.js) - Example usage reporting

### API Documentation

Detailed API documentation is available in the source code with JSDoc comments.

## Examples

### Basic Usage

```javascript
// The worker automatically processes jobs from the queue
// Token counting and usage tracking happen automatically

// To manually generate a persona profile:
const aiService = require('./src/services/aiService');
const result = await aiService.generatePersonaProfile(assessmentData, 'job-123');
```

### Usage Reporting

```javascript
// Get comprehensive usage report
const UsageTracker = require('./src/services/usageTracker');
const usageTracker = new UsageTracker();

const report = {
  daily: usageTracker.getDailyUsage(),
  weekly: usageTracker.getUsageStats('weekly'),
  monthly: usageTracker.getUsageStats('monthly'),
  current: usageTracker.getCurrentUsage()
};

console.log('Usage Report:', JSON.stringify(report, null, 2));
```

See [Usage Reporting Demo](./examples/usage-reporting-demo.js) for a complete example.

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm test`
6. Submit a pull request

### Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Add tests for new features
- Update documentation as needed

## License

MIT License - see LICENSE file for details.

## Support

For issues or questions:

1. Check the [Troubleshooting Guide](./docs/TROUBLESHOOTING_GUIDE.md)
2. Review the logs for error details
3. Run the test suite to verify functionality
4. Check configuration against the [Configuration Guide](./docs/CONFIGURATION_GUIDE.md)