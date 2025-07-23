# Phase 2: OpenRouter Integration - AI-Powered Conversations

## 🎯 Tujuan Fase

**Mengintegrasikan OpenRouter API untuk memberikan AI conversation capabilities** dengan fokus pada:
- Implementasi OpenRouter service dengan free model optimization
- Message handling yang robust dengan fallback strategy
- Token usage tracking dan cost management
- Performance optimization untuk free models

**Mengapa Fase Ini Penting:**
- Memberikan core AI functionality yang menjadi jantung chatbot
- Mengoptimalkan penggunaan free models untuk cost efficiency
- Membangun foundation untuk personalized conversations di fase selanjutnya

## 🏗️ Komponen Utama

### 1. OpenRouter Service Integration
- **Free Model Strategy**: Prioritas pada Qwen3-235B dan Llama-3.2 free models
- **Fallback Mechanism**: Smart fallback chain untuk reliability
- **Token Management**: Efficient token counting dan usage tracking
- **Error Handling**: Comprehensive error handling dengan retry logic

### 2. Message Processing Pipeline
- **Message API**: Complete message CRUD operations
- **Context Building**: Basic conversation history management
- **Response Generation**: AI response generation dengan metadata
- **Usage Tracking**: Detailed tracking untuk analytics

### 3. Free Model Optimizations
- **Rate Limiting**: Specialized rate limiting untuk free models
- **Response Time Management**: Handling slower response times
- **Cost Tracking**: Zero-cost tracking untuk free models
- **Performance Monitoring**: Metrics khusus untuk free model usage

## 📋 Implementasi Detail

### OpenRouter Service Core
```javascript
// src/services/openrouterService.js
class OpenRouterService {
  constructor() {
    this.baseURL = process.env.OPENROUTER_BASE_URL;
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.defaultModel = 'qwen/qwen3-235b-a22b-07-25:free';
    this.fallbackModel = 'meta-llama/llama-3.2-3b-instruct:free';
    this.emergencyFallbackModel = 'openai/gpt-4o-mini';
    this.useFreeModelsOnly = process.env.USE_FREE_MODELS_ONLY === 'true';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://atma.chhrone.web.id',
        'X-Title': 'ATMA - AI Talent Mapping'
      },
      timeout: 45000 // Increased timeout for free models
    });
  }

  async generateResponse(messages, options = {}) {
    const startTime = Date.now();
    
    try {
      const model = options.model || this.defaultModel;
      const isFreeModel = this.isFreeModel(model);

      const payload = {
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || parseInt(process.env.MAX_TOKENS),
        temperature: options.temperature || parseFloat(process.env.TEMPERATURE),
        user: options.userId,
        usage: { include: true }
      };

      const response = await this.client.post('/chat/completions', payload);
      const processingTime = Date.now() - startTime;

      return {
        content: response.data.choices[0].message.content,
        model: response.data.model,
        usage: {
          ...response.data.usage,
          cost: isFreeModel ? 0 : response.data.usage.cost || 0,
          isFreeModel: isFreeModel
        },
        processingTime,
        finishReason: response.data.choices[0].finish_reason
      };
    } catch (error) {
      return this.handleFallback(messages, options, error);
    }
  }

  async handleFallback(messages, options, originalError) {
    const currentModel = options.model || this.defaultModel;

    // First fallback: try free fallback model
    if (currentModel !== this.fallbackModel && !options.isFirstRetry) {
      return this.generateResponse(messages, {
        ...options,
        model: this.fallbackModel,
        isFirstRetry: true
      });
    }

    // Second fallback: try emergency paid model (if allowed)
    if (!this.useFreeModelsOnly && currentModel !== this.emergencyFallbackModel && !options.isSecondRetry) {
      return this.generateResponse(messages, {
        ...options,
        model: this.emergencyFallbackModel,
        isSecondRetry: true
      });
    }

    throw new Error(`All OpenRouter models failed. Original error: ${originalError.message}`);
  }

  isFreeModel(model) {
    return model.includes(':free') ||
           model === 'qwen/qwen3-235b-a22b-07-25:free' ||
           model === 'meta-llama/llama-3.2-3b-instruct:free';
  }
}
```

### Message Controller
```javascript
// src/controllers/messageController.js
class MessageController {
  async sendMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const { content, content_type = 'text', parent_message_id } = req.body;
      const userId = req.user.id;

      // Validate conversation access
      const conversation = await Conversation.findOne({
        where: { id: conversationId, user_id: userId }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Save user message
      const userMessage = await Message.create({
        conversation_id: conversationId,
        sender_type: 'user',
        content: content,
        content_type: content_type,
        parent_message_id: parent_message_id
      });

      // Build conversation context
      const conversationHistory = await this.buildConversationHistory(conversationId);
      
      // Generate AI response
      const aiResponse = await openrouterService.generateResponse(
        conversationHistory,
        { userId: userId }
      );

      // Save assistant message
      const assistantMessage = await Message.create({
        conversation_id: conversationId,
        sender_type: 'assistant',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          finish_reason: aiResponse.finishReason,
          processing_time: aiResponse.processingTime
        }
      });

      // Track usage
      await UsageTracking.create({
        conversation_id: conversationId,
        message_id: assistantMessage.id,
        model_used: aiResponse.model,
        prompt_tokens: aiResponse.usage.prompt_tokens,
        completion_tokens: aiResponse.usage.completion_tokens,
        total_tokens: aiResponse.usage.total_tokens,
        cost_credits: aiResponse.usage.cost,
        is_free_model: aiResponse.usage.isFreeModel,
        processing_time_ms: aiResponse.processingTime
      });

      // Update conversation timestamp
      await conversation.update({ updated_at: new Date() });

      res.json({
        user_message: userMessage,
        assistant_message: assistantMessage,
        usage: aiResponse.usage
      });

    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  async buildConversationHistory(conversationId) {
    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
      limit: 20 // Limit untuk token efficiency
    });

    return messages.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }
}
```

### Free Model Rate Limiter
```javascript
// src/middleware/freeModelRateLimiter.js
const rateLimit = require('express-rate-limit');

const freeModelLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute for free models
  message: {
    error: 'Free model rate limit exceeded. Please wait before sending another message.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `free_model_${req.user?.id || req.ip}`;
  }
});

module.exports = freeModelLimiter;
```

### Environment Configuration Updates
```env
# OpenRouter Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_MODEL=qwen/qwen3-235b-a22b-07-25:free
FALLBACK_MODEL=meta-llama/llama-3.2-3b-instruct:free
EMERGENCY_FALLBACK_MODEL=openai/gpt-4o-mini
MAX_TOKENS=1000
TEMPERATURE=0.7
USE_FREE_MODELS_ONLY=true

# Rate Limiting for Free Models
FREE_MODEL_RATE_LIMIT_PER_MINUTE=20
MAX_CONVERSATION_HISTORY_TOKENS=6000
```

## 🔗 Dependencies

**Prerequisites dari Phase 1:**
- Database schema dengan conversations dan messages tables
- Basic API structure dan authentication
- Health check dan logging system

**External Services:**
- **OpenRouter API**: Account dan API key untuk free models
- **Auth Service**: Untuk user identification dalam requests

## 📦 Deliverables

### ✅ Yang Harus Diselesaikan:

1. **OpenRouter Integration Complete**
   - Service class dengan free model optimization
   - Fallback strategy untuk reliability
   - Error handling dan retry logic
   - Token usage tracking

2. **Message API Endpoints**
   - `POST /conversations/{id}/messages` - Send message dan get AI response
   - `GET /conversations/{id}/messages` - Get message history
   - `POST /conversations/{id}/messages/{id}/regenerate` - Regenerate response

3. **Free Model Optimizations**
   - Specialized rate limiting untuk free models
   - Response time handling untuk slower models
   - Cost tracking (zero cost untuk free models)
   - Performance metrics collection

4. **Usage Analytics**
   - Token usage tracking per conversation
   - Model performance metrics
   - Cost analysis (free vs paid model comparison)
   - Response time analytics

5. **Testing & Validation**
   - Unit tests untuk OpenRouter service
   - Integration tests untuk message flow
   - Load testing untuk free model rate limits
   - Error scenario testing

## 🚀 Pengembangan Selanjutnya

**Persiapan untuk Phase 3:**
- Message system siap untuk context enhancement
- Usage tracking foundation untuk assessment integration
- AI response generation ready untuk personalization
- Performance baseline established untuk optimization

**Foundation yang Dibangun:**
- **AI Conversation Core**: Fully functional chatbot dengan free models
- **Cost Efficiency**: Zero API costs dengan quality responses
- **Scalable Architecture**: Ready untuk high-volume conversations
- **Analytics Ready**: Usage data untuk optimization insights

## ⏱️ Timeline & Resources

**Estimasi Waktu:** 2-3 minggu
**Team Requirements:**
- 1 Backend Developer (senior level untuk AI integration)
- 1 QA Engineer (untuk testing AI responses)

**Milestones:**
- **Week 1**: OpenRouter service implementation
- **Week 2**: Message API dan rate limiting
- **Week 3**: Testing, optimization, documentation

**Success Criteria:**
- AI responses dengan quality score >8/10
- Response time <5 seconds untuk free models
- Zero API costs dengan free model usage
- Rate limiting working properly
- Ready untuk assessment context integration

---

**🎯 Outcome:** Fully functional AI chatbot dengan cost-efficient free models, siap untuk personalization dengan assessment data di Phase 3.
