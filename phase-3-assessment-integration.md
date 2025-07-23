# Phase 3: Assessment Integration - Personalized AI Career Advisor

## 🎯 Tujuan Fase

**Mengintegrasikan assessment results dengan chatbot untuk memberikan personalized career guidance** dengan fokus pada:
- Event-driven assessment-to-chatbot flow yang seamless
- Context management dengan full assessment data (RIASEC, Big Five, VIA-IS)
- Auto-generation conversation dengan personalized welcome messages
- Assessment-specific API endpoints dan suggested questions

**Mengapa Fase Ini Penting:**
- Memberikan value proposition utama: AI career advisor yang truly personalized
- Mengotomatisasi flow dari assessment completion ke chatbot readiness
- Meningkatkan user engagement dengan contextual conversations
- Membangun foundation untuk advanced career guidance features

## 🏗️ Komponen Utama

### 1. Assessment-to-Chatbot Event Flow
- **RabbitMQ Event Consumer**: Listen untuk `analysis_complete` events
- **Auto-Conversation Creation**: Otomatis membuat conversation dengan assessment context
- **Personalized Welcome Messages**: AI-generated berdasarkan assessment results
- **Context Data Management**: Full integration dengan assessment dan analysis data

### 2. Context Service Enhancement
- **Assessment Context Builder**: Mengambil dan memformat assessment data
- **System Prompt Generation**: Dynamic prompts berdasarkan assessment type
- **Context Optimization**: Token-efficient context management
- **Assessment Summary**: Concise summary untuk AI context

### 3. Assessment-Specific API Endpoints
- **Assessment Integration Endpoints**: Specialized endpoints untuk assessment flow
- **Suggested Questions Generator**: AI-generated questions berdasarkan profile
- **Assessment Readiness Check**: Validasi assessment completion status
- **Manual Initialization**: Fallback untuk event-driven flow

## 📋 Implementasi Detail

### Assessment Event Handler
```javascript
// src/services/assessmentEventHandler.js
class AssessmentEventHandler {
  constructor() {
    this.queueService = require('./queueService');
    this.contextService = require('./contextService');
    this.openrouterService = require('./openrouterService');
  }

  async initialize() {
    // Subscribe to analysis_complete events
    await this.queueService.subscribe('analysis_complete', this.handleAssessmentComplete.bind(this));
  }

  async handleAssessmentComplete(eventData) {
    try {
      const { user_id, assessment_id, analysis_results } = eventData;
      
      logger.info('Processing assessment completion event', {
        userId: user_id,
        assessmentId: assessment_id
      });

      // Check if assessment conversation already exists
      const existingConversation = await this.findAssessmentConversation(user_id, assessment_id);
      
      if (existingConversation) {
        // Update existing conversation with new assessment data
        await this.updateConversationContext(existingConversation.id, analysis_results);
      } else {
        // Create new assessment-based conversation
        await this.createAssessmentConversation(user_id, assessment_id, analysis_results);
      }

      // Notify client that chatbot is ready
      await this.notifyClientChatbotReady(user_id, assessment_id);

    } catch (error) {
      logger.error('Error handling assessment completion:', error);
      // Implement retry logic or fallback notification
    }
  }

  async createAssessmentConversation(userId, assessmentId, analysisResults) {
    // Create conversation with assessment context
    const conversation = await Conversation.create({
      user_id: userId,
      title: 'Career Guidance - Assessment Results',
      context_type: 'assessment',
      context_data: {
        assessment_id: assessmentId,
        analysis_results: analysisResults,
        created_from_event: true
      },
      metadata: {
        auto_generated: true,
        assessment_date: new Date(),
        source: 'analysis_complete_event'
      }
    });

    // Generate personalized welcome message
    const welcomeMessage = await this.generateAssessmentWelcomeMessage(
      conversation.id, 
      analysisResults
    );

    // Generate suggested questions
    const suggestions = await this.generateAssessmentSuggestions(analysisResults);

    // Save welcome message
    await Message.create({
      conversation_id: conversation.id,
      sender_type: 'assistant',
      content: welcomeMessage,
      metadata: {
        type: 'assessment_welcome',
        suggestions: suggestions,
        auto_generated: true
      }
    });

    return { conversation, welcomeMessage, suggestions };
  }

  async generateAssessmentWelcomeMessage(conversationId, analysisResults) {
    const assessmentSummary = this.contextService.summarizeAssessmentData(analysisResults);
    
    const systemPrompt = `You are a career advisor AI. Generate a warm, personalized welcome message for a user who just completed their career assessment. 

Assessment Summary: ${assessmentSummary}

Create a welcome message that:
1. Acknowledges their assessment completion
2. Highlights 2-3 key insights from their results
3. Expresses enthusiasm about helping with career guidance
4. Invites them to ask questions

Keep it conversational, encouraging, and under 150 words.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate my personalized welcome message based on my assessment results.' }
    ];

    const response = await this.openrouterService.generateResponse(messages, {
      maxTokens: 200,
      temperature: 0.8
    });

    return response.content;
  }

  async generateAssessmentSuggestions(analysisResults) {
    const riasecTop = this.getTopRiasecTypes(analysisResults.riasec);
    const oceanTop = this.getTopOceanTraits(analysisResults.ocean);
    
    const suggestions = [
      `What career paths align with my ${riasecTop[0]} and ${riasecTop[1]} interests?`,
      `How can I leverage my high ${oceanTop[0]} trait in my career?`,
      `What are my strongest personality traits for leadership roles?`,
      `Based on my assessment, what skills should I develop?`,
      `What work environments would suit my personality best?`,
      `How do my values align with different career options?`
    ];

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }
}
```

### Context Service Enhancement
```javascript
// src/services/contextService.js
class ContextService {
  async buildConversationContext(conversationId) {
    const conversation = await Conversation.findByPk(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    let systemPrompt = this.getSystemPrompt(conversation.context_type);
    let assessmentContext = '';

    // Add assessment context if available
    if (conversation.context_type === 'assessment' && conversation.context_data) {
      assessmentContext = await this.getAssessmentContext(conversation.context_data);
      systemPrompt += `\n\nUser Assessment Context:\n${assessmentContext}`;
    }

    // Get conversation history
    const messages = await this.getConversationHistory(conversationId);

    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
  }

  getSystemPrompt(contextType) {
    const prompts = {
      general: `You are a helpful career counseling AI assistant. Provide thoughtful, actionable career guidance based on the user's questions and context.`,
      
      assessment: `You are an expert career advisor AI with access to the user's comprehensive personality and career assessment results. 

Your role:
- Provide personalized career guidance based on their RIASEC interests, Big Five personality traits, and VIA Character Strengths
- Explain how their traits translate to career opportunities
- Suggest specific career paths, work environments, and development areas
- Be encouraging and help them understand their unique strengths
- Reference their specific assessment results when relevant

Always be supportive, insightful, and actionable in your responses.`,
      
      career_guidance: `You are a specialized career guidance AI focused on helping users make informed career decisions through detailed analysis and recommendations.`
    };

    return prompts[contextType] || prompts.general;
  }

  async getAssessmentContext(contextData) {
    if (!contextData.assessment_id) {
      return '';
    }

    try {
      // Fetch assessment data from archive service
      const assessmentData = await this.fetchAssessmentData(contextData.assessment_id);
      return this.summarizeAssessmentData(assessmentData);
    } catch (error) {
      logger.error('Error fetching assessment context:', error);
      return '';
    }
  }

  summarizeAssessmentData(assessmentData) {
    const { riasec, ocean, viaIs, personaProfile } = assessmentData;
    
    // Get top RIASEC types
    const topRiasec = Object.entries(riasec)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, score]) => `${type}: ${score}`)
      .join(', ');

    // Get top Big Five traits
    const topOcean = Object.entries(ocean)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([trait, score]) => `${trait}: ${score}`)
      .join(', ');

    // Get top VIA strengths
    const topVia = Object.entries(viaIs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([strength, score]) => `${strength}: ${score}`)
      .join(', ');

    return `RIASEC Interests (${topRiasec}), Big Five Traits (${topOcean}), Top Strengths (${topVia}). ${personaProfile?.summary || ''}`;
  }

  async fetchAssessmentData(assessmentId) {
    // Integration with archive service to get assessment results
    const response = await axios.get(
      `${process.env.ARCHIVE_SERVICE_URL}/api/archive/assessments/${assessmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_KEY}`
        }
      }
    );

    return response.data;
  }
}
```

### Assessment Integration Controller
```javascript
// src/controllers/assessmentIntegrationController.js
class AssessmentIntegrationController {
  async createFromAssessment(req, res) {
    try {
      const { assessment_id, title, auto_start_message = true } = req.body;
      const userId = req.user.id;

      // Validate assessment exists and belongs to user
      const assessmentData = await this.validateAssessmentAccess(userId, assessment_id);
      
      if (!assessmentData) {
        return res.status(404).json({ error: 'Assessment not found or access denied' });
      }

      // Create conversation with assessment context
      const result = await assessmentEventHandler.createAssessmentConversation(
        userId, 
        assessment_id, 
        assessmentData
      );

      res.status(201).json({
        conversation: result.conversation,
        initial_message: auto_start_message ? result.welcomeMessage : null,
        suggestions: result.suggestions
      });

    } catch (error) {
      logger.error('Error creating conversation from assessment:', error);
      res.status(500).json({ error: 'Failed to create assessment conversation' });
    }
  }

  async checkAssessmentReady(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if user has completed assessment
      const assessmentStatus = await this.getLatestAssessmentStatus(userId);
      
      if (!assessmentStatus.has_assessment) {
        return res.json({
          has_assessment: false,
          ready_for_chatbot: false,
          message: 'No assessment found. Please complete your career assessment first.'
        });
      }

      // Check if conversation already exists
      const existingConversation = await this.findAssessmentConversation(
        userId, 
        assessmentStatus.assessment_id
      );

      res.json({
        has_assessment: true,
        assessment_date: assessmentStatus.assessment_date,
        assessment_id: assessmentStatus.assessment_id,
        conversation_exists: !!existingConversation,
        conversation_id: existingConversation?.id || null,
        ready_for_chatbot: true
      });

    } catch (error) {
      logger.error('Error checking assessment readiness:', error);
      res.status(500).json({ error: 'Failed to check assessment status' });
    }
  }

  async generateSuggestions(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = await Conversation.findOne({
        where: { id: conversationId, user_id: userId }
      });

      if (!conversation || conversation.context_type !== 'assessment') {
        return res.status(404).json({ error: 'Assessment conversation not found' });
      }

      const suggestions = await assessmentEventHandler.generateAssessmentSuggestions(
        conversation.context_data.analysis_results
      );

      res.json({ suggestions });

    } catch (error) {
      logger.error('Error generating suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  }
}
```

## 🔗 Dependencies

**Prerequisites dari Phase 2:**
- OpenRouter integration dengan message handling
- AI response generation working
- Usage tracking system
- Rate limiting untuk free models

**External Services:**
- **Analysis Worker**: Untuk `analysis_complete` events
- **Archive Service**: Untuk assessment data retrieval
- **RabbitMQ**: Untuk event-driven communication
- **Notification Service**: Untuk real-time client notifications

## 📦 Deliverables

### ✅ Yang Harus Diselesaikan:

1. **Event-Driven Assessment Integration**
   - RabbitMQ consumer untuk `analysis_complete` events
   - Auto-conversation creation dengan assessment context
   - Error handling dan retry logic untuk event processing

2. **Assessment-Specific API Endpoints**
   - `POST /api/chat/conversations/from-assessment` - Create dari assessment
   - `GET /api/chat/conversations/assessment-ready/{userId}` - Check readiness
   - `GET /api/chat/conversations/{id}/suggestions` - Get suggested questions
   - `POST /api/chat/conversations/auto-initialize` - Manual initialization

3. **Context Management Enhancement**
   - Assessment data integration dengan conversation context
   - Dynamic system prompts berdasarkan assessment type
   - Token-efficient context optimization
   - Assessment summary generation

4. **Personalized Welcome Messages**
   - AI-generated welcome messages berdasarkan assessment results
   - Highlight key insights dari RIASEC, Big Five, VIA-IS
   - Contextual suggestions untuk conversation starters

5. **Testing & Validation**
   - Integration tests untuk assessment flow
   - Event processing tests
   - Context building validation
   - AI response quality dengan assessment context

## 🚀 Pengembangan Selanjutnya

**Persiapan untuk Phase 4:**
- Assessment context ready untuk real-time notifications
- Personalized conversation foundation untuk advanced features
- Event-driven architecture ready untuk WebSocket integration
- API structure ready untuk client-side chatbot embedding

**Foundation yang Dibangun:**
- **Personalized AI**: Chatbot dengan full assessment context
- **Event-Driven Flow**: Seamless assessment-to-chatbot transition
- **Context Intelligence**: Smart context management untuk quality responses
- **User Experience**: Auto-generated, ready-to-use chatbot

## ⏱️ Timeline & Resources

**Estimasi Waktu:** 2-3 minggu
**Team Requirements:**
- 1 Backend Developer (senior level untuk event integration)
- 1 AI/ML Engineer (untuk context optimization)

**Milestones:**
- **Week 1**: Event handler dan assessment integration
- **Week 2**: Context service enhancement dan API endpoints
- **Week 3**: Testing, optimization, documentation

**Success Criteria:**
- Assessment-to-chatbot flow working end-to-end
- Personalized welcome messages dengan quality >8/10
- Context integration providing relevant responses
- Event processing reliability >99%
- Ready untuk real-time notifications di Phase 4

---

**🎯 Outcome:** Fully personalized AI career advisor yang otomatis tersedia setelah assessment completion, dengan context-aware responses dan suggested questions.
