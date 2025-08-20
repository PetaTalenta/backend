export const chatbotServiceData = {
  name: "Chatbot Service",
  description: "AI-powered conversational service for career guidance, assessment interpretation, and personalized recommendations. Provides intelligent chat interactions based on user assessment data.",
  baseUrl: "https://api.chhrone.web.id/api/chatbot",
  version: "1.0.0",
  port: "3004",
  endpoints: [
    {
      method: "POST",
      path: "/api/chatbot/conversations",
      title: "Create Conversation",
      description: "Create a new conversation session with the AI chatbot for career guidance and assessment discussion.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      requestBody: {
        title: "Career Guidance Session",
        context: "assessment",
        initialMessage: "I'd like to discuss my recent assessment results"
      },
      parameters: [
        {
          name: "title",
          type: "string",
          required: false,
          description: "Conversation title (default: auto-generated based on context)"
        },
        {
          name: "context",
          type: "string",
          required: false,
          description: "Conversation context: 'assessment', 'career', 'general' (default: 'general')"
        },
        {
          name: "initialMessage",
          type: "string",
          required: false,
          description: "Optional initial message to start the conversation"
        }
      ],
      response: {
        success: true,
        data: {
          conversationId: "550e8400-e29b-41d4-a716-446655440000",
          title: "Career Guidance Session",
          context: "assessment",
          createdAt: "2024-01-01T10:00:00Z",
          status: "active",
          messageCount: 1,
          lastActivity: "2024-01-01T10:00:00Z",
          aiResponse: {
            messageId: "550e8400-e29b-41d4-a716-446655440001",
            content: "Hello! I'm here to help you understand your assessment results and explore career opportunities. What would you like to discuss?",
            timestamp: "2024-01-01T10:00:00Z",
            type: "text"
          }
        },
        message: "Conversation created successfully"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/chatbot/conversations \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Career Guidance Session",
    "context": "assessment",
    "initialMessage": "I would like to discuss my recent assessment results"
  }'`
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations",
      title: "Get Conversations",
      description: "Retrieve all conversations for the authenticated user with pagination and filtering options.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "page",
          type: "integer",
          required: false,
          description: "Page number for pagination (default: 1)"
        },
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Number of conversations per page (default: 10, max: 50)"
        },
        {
          name: "status",
          type: "string",
          required: false,
          description: "Filter by status: 'active', 'archived' (default: all)"
        },
        {
          name: "context",
          type: "string",
          required: false,
          description: "Filter by context: 'assessment', 'career', 'general'"
        }
      ],
      response: {
        success: true,
        data: {
          conversations: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              title: "Career Guidance Session",
              context: "assessment",
              status: "active",
              messageCount: 15,
              createdAt: "2024-01-01T10:00:00Z",
              lastActivity: "2024-01-01T10:30:00Z",
              lastMessage: {
                content: "Thank you for the insights about my personality type!",
                timestamp: "2024-01-01T10:30:00Z",
                sender: "user"
              }
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalConversations: 25,
            hasNextPage: true,
            hasPreviousPage: false
          }
        }
      },
      example: `curl -X GET "https://api.chhrone.web.id/api/chatbot/conversations?page=1&limit=10&status=active" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations/:conversationId",
      title: "Get Conversation Details",
      description: "Retrieve detailed information about a specific conversation including full message history.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation"
        },
        {
          name: "includeMessages",
          type: "boolean",
          required: false,
          description: "Include full message history (default: true)"
        },
        {
          name: "messageLimit",
          type: "integer",
          required: false,
          description: "Limit number of messages returned (default: 100)"
        }
      ],
      response: {
        success: true,
        data: {
          conversation: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Career Guidance Session",
            context: "assessment",
            status: "active",
            messageCount: 15,
            createdAt: "2024-01-01T10:00:00Z",
            lastActivity: "2024-01-01T10:30:00Z",
            messages: [
              {
                id: "550e8400-e29b-41d4-a716-446655440001",
                content: "Hello! I'm here to help you understand your assessment results.",
                sender: "ai",
                timestamp: "2024-01-01T10:00:00Z",
                type: "text"
              },
              {
                id: "550e8400-e29b-41d4-a716-446655440002",
                content: "I'd like to understand what my RIASEC scores mean for my career.",
                sender: "user",
                timestamp: "2024-01-01T10:01:00Z",
                type: "text"
              }
            ]
          }
        }
      },
      example: `curl -X GET https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/chatbot/conversations/:conversationId/messages",
      title: "Send Message",
      description: "Send a message to the AI chatbot and receive an intelligent response based on context and user data.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation"
        }
      ],
      requestBody: {
        content: "What career paths would be best suited for my personality type?",
        type: "text"
      },
      response: {
        success: true,
        data: {
          userMessage: {
            id: "550e8400-e29b-41d4-a716-446655440002",
            content: "What career paths would be best suited for my personality type?",
            sender: "user",
            timestamp: "2024-01-01T10:01:00Z",
            type: "text"
          },
          aiResponse: {
            id: "550e8400-e29b-41d4-a716-446655440003",
            content: "Based on your ENFP personality type and high scores in enterprising and investigative areas, I recommend exploring careers in technology leadership, product management, or innovation consulting. Your strong creativity and people skills make you well-suited for roles that combine technical problem-solving with team collaboration.",
            sender: "ai",
            timestamp: "2024-01-01T10:01:30Z",
            type: "text",
            metadata: {
              responseTime: 1500,
              confidence: 0.92,
              sources: ["assessment_results", "personality_database", "career_mapping"]
            }
          },
          conversationStats: {
            messageCount: 16,
            lastActivity: "2024-01-01T10:01:30Z"
          }
        },
        message: "Message sent and response generated successfully"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/messages \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "What career paths would be best suited for my personality type?",
    "type": "text"
  }'`
    },
    {
      method: "PUT",
      path: "/api/chatbot/conversations/:conversationId",
      title: "Update Conversation",
      description: "Update conversation details such as title or archive status.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation"
        }
      ],
      requestBody: {
        title: "Updated Career Discussion",
        status: "archived"
      },
      response: {
        success: true,
        data: {
          conversation: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Updated Career Discussion",
            context: "assessment",
            status: "archived",
            messageCount: 15,
            createdAt: "2024-01-01T10:00:00Z",
            lastActivity: "2024-01-01T10:30:00Z",
            updatedAt: "2024-01-01T11:00:00Z"
          }
        },
        message: "Conversation updated successfully"
      },
      example: `curl -X PUT https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Updated Career Discussion",
    "status": "archived"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/chatbot/conversations/:conversationId",
      title: "Delete Conversation",
      description: "Delete a conversation and all its messages. This action cannot be undone.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation to delete"
        }
      ],
      response: {
        success: true,
        message: "Conversation deleted successfully",
        data: {
          deletedConversationId: "550e8400-e29b-41d4-a716-446655440000",
          deletedMessageCount: 15,
          deletedAt: "2024-01-01T11:00:00Z"
        }
      },
      example: `curl -X DELETE https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations/:conversationId/suggestions",
      title: "Get Conversation Suggestions",
      description: "Get AI-generated suggestions for a specific conversation (assessment context only).",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation"
        }
      ],
      response: {
        success: true,
        data: {
          suggestions: [
            "What career paths align with my personality type?",
            "How can I develop my identified strengths?",
            "What skills should I focus on improving?"
          ],
          context: {
            assessment_based: true,
            conversation_stage: "initial",
            user_archetype: "The Innovator"
          }
        }
      },
      example: `curl -X GET https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/suggestions \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "POST",
      path: "/api/chatbot/assessment/from-assessment",
      title: "Create Conversation from Assessment",
      description: "Create a new conversation session based on user's assessment results with personalized context and suggestions.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      requestBody: {
        assessment_id: "550e8400-e29b-41d4-a716-446655440000",
        conversation_type: "career_guidance",
        include_suggestions: true
      },
      parameters: [
        {
          name: "assessment_id",
          type: "string",
          required: true,
          description: "UUID of the assessment result to base conversation on"
        },
        {
          name: "conversation_type",
          type: "string",
          required: false,
          description: "Type of conversation: 'career_guidance', 'skill_development', 'personality_insights' (default: 'career_guidance')"
        },
        {
          name: "include_suggestions",
          type: "boolean",
          required: false,
          description: "Include AI-generated conversation starters (default: true)"
        }
      ],
      response: {
        success: true,
        data: {
          conversationId: "550e8400-e29b-41d4-a716-446655440000",
          title: "Career Guidance Based on Your Assessment",
          context: "assessment",
          assessmentId: "550e8400-e29b-41d4-a716-446655440000",
          createdAt: "2024-01-01T10:00:00Z",
          status: "active",
          personalizedWelcome: {
            messageId: "550e8400-e29b-41d4-a716-446655440001",
            content: "Hello! I've reviewed your assessment results showing strong investigative and enterprising traits. I'm here to help you explore career paths that align with your analytical and leadership strengths.",
            timestamp: "2024-01-01T10:00:00Z",
            type: "text"
          },
          suggestions: [
            {
              id: "suggestion_1",
              title: "Explore Data Science Careers",
              description: "Discuss how your analytical skills translate to data science opportunities"
            },
            {
              id: "suggestion_2",
              title: "Leadership Development Path",
              description: "Learn about developing your natural leadership abilities"
            }
          ]
        },
        message: "Assessment-based conversation created successfully"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/chatbot/assessment/from-assessment \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "assessment_id": "550e8400-e29b-41d4-a716-446655440000",
    "conversation_type": "career_guidance",
    "include_suggestions": true
  }'`
    },
    {
      method: "POST",
      path: "/api/chatbot/auto-initialize",
      title: "Auto-Initialize Chatbot",
      description: "Automatically create and initialize a conversation based on user's latest assessment results.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      requestBody: {
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        conversation_type: "career_guidance"
      },
      parameters: [
        {
          name: "user_id",
          type: "string",
          required: true,
          description: "UUID of the user to initialize conversation for"
        },
        {
          name: "conversation_type",
          type: "string",
          required: false,
          description: "Type of conversation to initialize (default: 'career_guidance')"
        }
      ],
      response: {
        success: true,
        data: {
          conversationId: "550e8400-e29b-41d4-a716-446655440000",
          title: "AI Career Guidance Session",
          context: "assessment",
          userId: "550e8400-e29b-41d4-a716-446655440000",
          assessmentId: "550e8400-e29b-41d4-a716-446655440001",
          createdAt: "2024-01-01T10:00:00Z",
          status: "active",
          initialized: true,
          welcomeMessage: {
            messageId: "550e8400-e29b-41d4-a716-446655440002",
            content: "Welcome! I've automatically set up this conversation based on your recent assessment. Let's explore your career potential together!",
            timestamp: "2024-01-01T10:00:00Z",
            type: "text"
          }
        },
        message: "Chatbot auto-initialized successfully"
      },
      example: `curl -X POST https://api.chhrone.web.id/api/chatbot/auto-initialize \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "conversation_type": "career_guidance"
  }'`
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations/:conversationId/messages",
      title: "Get Conversation Messages",
      description: "Retrieve all messages from a specific conversation with pagination and filtering options.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        {
          name: "conversationId",
          type: "string",
          required: true,
          description: "UUID of the conversation"
        },
        {
          name: "page",
          type: "integer",
          required: false,
          description: "Page number for pagination (default: 1)"
        },
        {
          name: "limit",
          type: "integer",
          required: false,
          description: "Number of messages per page (default: 50, max: 100)"
        },
        {
          name: "include_usage",
          type: "boolean",
          required: false,
          description: "Include usage tracking information (default: false)"
        }
      ],
      response: {
        success: true,
        data: {
          conversationId: "550e8400-e29b-41d4-a716-446655440000",
          messages: [
            {
              id: "550e8400-e29b-41d4-a716-446655440001",
              content: "Hello! I'm here to help you understand your assessment results.",
              sender: "ai",
              timestamp: "2024-01-01T10:00:00Z",
              type: "text"
            },
            {
              id: "550e8400-e29b-41d4-a716-446655440002",
              content: "I'd like to understand what my RIASEC scores mean for my career.",
              sender: "user",
              timestamp: "2024-01-01T10:01:00Z",
              type: "text"
            }
          ],
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalMessages: 25,
            hasNextPage: true,
            hasPreviousPage: false
          },
          conversationInfo: {
            title: "Career Guidance Session",
            context: "assessment",
            status: "active",
            createdAt: "2024-01-01T10:00:00Z"
          }
        },
        message: "Messages retrieved successfully"
      },
      example: `curl -X GET "https://api.chhrone.web.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/messages?page=1&limit=50" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/chatbot/health",
      title: "Service Health Check",
      description: "Check the health status of the chatbot service and its AI components.",
      authentication: null,
      rateLimit: "5000 requests per 10 minutes",
      response: {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00.000Z",
        service: "chatbot-service",
        version: "1.0.0",
        dependencies: {
          aiEngine: {
            status: "healthy",
            responseTime: "1.2s",
            lastCheck: "2024-01-01T00:00:00.000Z"
          },
          authService: {
            status: "healthy"
          },
          archiveService: {
            status: "healthy"
          }
        },
        statistics: {
          activeConversations: 150,
          totalMessages: 5000,
          averageResponseTime: "1.5s",
          successRate: "99.2%"
        }
      },
      example: `curl -X GET https://api.chhrone.web.id/api/chatbot/health`
    }
  ]
};
