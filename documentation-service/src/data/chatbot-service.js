export const chatbotServiceData = {
  name: "Chatbot Service",
  description: "AI-powered conversational service for career guidance and personalized recommendations. Provides intelligent chat interactions based on user profile persona data.",
  baseUrl: "api.futureguide.id",
  version: "1.0.0",
  port: "3004",
  endpoints: [
    {
      method: "POST",
      path: "/api/chatbot/conversations",
      title: "Create Conversation",
      description: "Create a new conversation for the authenticated user with optional profile persona data for personalized AI guidance. Dapat mengaitkan conversation dengan hasil analisis menggunakan resultsId.",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes; Create limit: 100 conversations/day per user",
      requestBody: {
        title: "New Conversation (optional)",
        resultsId: "UUID (optional) - ID hasil analisis untuk mengaitkan conversation dengan analysis result",
        profilePersona: {
          "name": "string (optional)",
          "age": "number (optional)",
          "education": "string (optional)",
          "personality": "string (optional)",
          "interests": "array (optional)",
          "strengths": "array (optional)",
          "careerGoals": "string (optional)",
          "workStyle": "string (optional)",
          "values": "array (optional)"
        },
        metadata: {"any": "object (optional)"}
      },
      response: {
        success: true,
        message: "Conversation created successfully",
        data: {
          conversation: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Career Guidance Session",
            context_type: "career_guidance",
            status: "active"
          },
          initial_messages: [
            {
              id: "msg-user-001",
              sender_type: "user",
              content: "Halo! Berdasarkan profile persona saya, bisakah Anda memperkenalkan diri dan memberikan gambaran singkat tentang bagaimana Anda bisa membantu saya dalam pengembangan karir?",
              content_type: "text"
            },
            {
              id: "msg-assistant-001",
              sender_type: "assistant",
              content: "Halo! Saya adalah Guider, asisten AI yang akan membantu Anda dalam pengembangan karir berdasarkan profil persona yang Anda berikan...",
              content_type: "text"
            }
          ]
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/chatbot/conversations \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Career Guidance Session",
    "resultsId": "550e8400-e29b-41d4-a716-446655440000",
    "profilePersona": {
      "name": "Sarah Johnson",
      "age": 26,
      "education": "Bachelor in Computer Science",
      "personality": "Creative, analytical, and collaborative",
      "interests": ["Web Development", "UI/UX Design"],
      "strengths": ["Problem-solving", "Communication"],
      "careerGoals": "Become a Full-Stack Developer",
      "workStyle": "Collaborative environment",
      "values": ["Innovation", "Growth", "Work-life balance"]
    }
  }'`
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations",
      title: "Get Conversations",
      description: "Retrieve all conversations for the authenticated user with pagination and filtering options.",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes",
      parameters: [
        { name: "page", type: "integer", required: false, description: "Default: 1" },
        { name: "limit", type: "integer", required: false, description: "Default: 20, max: 100" },
        { name: "include_archived", type: "string", required: false, description: "'true' or 'false' (default 'false')" },
        { name: "context_type", type: "string", required: false, description: "Filter by 'general' | 'career_guidance'" }
      ],
      response: {
        success: true,
        data: {
          conversations: [
            { id: "550e8400-e29b-41d4-a716-446655440000", title: "Career Guidance Session", context_type: "career_guidance", status: "active" }
          ],
          pagination: {
            current_page: 1,
            total_pages: 3,
            total_items: 25,
            items_per_page: 20,
            has_next: true,
            has_prev: false
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/chatbot/conversations?page=1&limit=10&status=active" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
      // Example with filters: "&include_archived=false&context_type=career_guidance"
    },
    {
      method: "GET",
      path: "/api/chatbot/conversations/:id",
      title: "Get Conversation Details",
      description: "Get a single conversation. Optionally include messages.",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes",
      parameters: [
        { name: "id", type: "string", required: true, description: "Conversation ID (UUID)" },
        { name: "include_messages", type: "string", required: false, description: "'true' or 'false' (default 'false')" },
        { name: "message_limit", type: "integer", required: false, description: "Default: 50, max: 200" }
      ],
      response: {
        success: true,
        data: {
          conversation: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Career Guidance Session",
            context_type: "career_guidance",
            status: "active"
          }
        }
      },
      example: `curl -X GET "https://api.futureguide.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000?include_messages=true&message_limit=50" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`

    },
    {
      method: "POST",
      path: "/api/chatbot/conversations/:conversationId/messages",
      title: "Send Message",
      description: "Send a message to the AI chatbot and receive an intelligent response based on context and user data.",
      authentication: "Bearer Token Required",
      rateLimit: "Free model: 20 requests/minute per user; Global: 200 requests/15 minutes",
      parameters: [
        { name: "conversationId", type: "string", required: true, description: "UUID of the conversation" }
      ],
      requestBody: {
        content: "What career paths would be best suited for my personality type?",
        content_type: "text",
        parent_message_id: "optional UUID"
      },
      response: {
        success: true,
        data: {
          user_message: { id: "...", content: "...", sender_type: "user", content_type: "text" },
          assistant_message: { id: "...", content: "...", sender_type: "assistant", content_type: "text" },
          usage: { model: "...", prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0 },
          processing_time: 1200
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/messages \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "What career paths would be best suited for my personality type?",
    "content_type": "text"
  }'`
    },
    {
      method: "POST",
      path: "/api/chatbot/conversations/:conversationId/messages/:messageId/regenerate",
      title: "Regenerate AI Response",
      description: "Regenerate assistant response for a specific assistant message in a conversation.",
      authentication: "Bearer Token Required",
      rateLimit: "Free model: 20 requests/minute per user; Global: 200 requests/15 minutes",
      parameters: [
        { name: "conversationId", type: "string", required: true },
        { name: "messageId", type: "string", required: true }
      ],
      response: {
        success: true,
        data: {
          message: { id: "...", content: "...", sender_type: "assistant" },
          usage: { model: "...", prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, cost: 0 }
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/chatbot/conversations/CONV_ID/messages/MESSAGE_ID/regenerate \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "PUT",
      path: "/api/chatbot/conversations/:id",
      title: "Update Conversation",
      description: "Update conversation details such as title, context_data, metadata, or status (active|archived).",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes",
      parameters: [ { name: "id", type: "string", required: true, description: "UUID of the conversation" } ],
      requestBody: {
        title: "Updated title (optional)",
        context_data: {"any": "object (optional)"},
        metadata: {"any": "object (optional)"},
        status: "active | archived"
      },
      response: {
        success: true,
        message: "Conversation updated successfully",
        data: {
          conversation: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Updated Career Discussion",
            context_type: "career_guidance",
            status: "archived"
          }
        }
      },
      example: `curl -X PUT https://api.futureguide.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Updated Career Discussion",
    "status": "archived"
  }'`
    },
    {
      method: "DELETE",
      path: "/api/chatbot/conversations/:id",
      title: "Delete Conversation",
      description: "Delete a conversation and all its messages. This action cannot be undone.",
      authentication: "Bearer Token Required",
      rateLimit: "200 requests per 15 minutes",
      parameters: [
        { name: "id", type: "string", required: true, description: "UUID of the conversation to delete" }
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
      example: `curl -X DELETE https://api.futureguide.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
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
              content: "Hello! I'm here to help you with your career guidance based on your profile.",
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
            context: "career_guidance",
            status: "active",
            createdAt: "2024-01-01T10:00:00Z"
          }
        },
        message: "Messages retrieved successfully"
      },
      example: `curl -X GET "https://api.futureguide.id/api/chatbot/conversations/550e8400-e29b-41d4-a716-446655440000/messages?page=1&limit=50" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
    },
    {
      method: "GET",
      path: "/api/chatbot/health",
      title: "Service Health Check",
      description: "Basic health check for chatbot service.",
      authentication: null,
      rateLimit: "5000 requests per 10 minutes",
      response: {
        status: "healthy",
        timestamp: "2024-01-01T00:00:00.000Z",
        service: "chatbot-service",
        version: "1.0.0"
      },
      example: `curl -X GET https://api.futureguide.id/api/chatbot/health`
    },
    {
      method: "GET",
      path: "/api/chatbot/usage/stats",
      title: "Get User Usage Stats",
      description: "Retrieve usage statistics for the authenticated user.",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes",
      parameters: [
        { name: "start_date", type: "ISO date", required: false },
        { name: "end_date", type: "ISO date", required: false },
        { name: "group_by", type: "string", required: false, description: "day|week|month (default day)" }
      ],
      response: { success: true, data: {} }
    },
    {
      method: "GET",
      path: "/api/chatbot/usage/summary",
      title: "Get Usage Summary",
      description: "Retrieve weekly and monthly usage summary for dashboard.",
      authentication: "Bearer Token Required",
      rateLimit: "Global: 200 requests/15 minutes",
      response: { success: true, data: { /* summary fields */ } }
    },
    {
      method: "GET",
      path: "/api/chatbot/usage/system",
      title: "Get System Usage Stats (Admin)",
      description: "Retrieve system-wide usage statistics (admin only).",
      authentication: "Bearer Token Required (admin)",
      rateLimit: "Global: 200 requests/15 minutes",
      parameters: [
        { name: "start_date", type: "ISO date", required: false },
        { name: "end_date", type: "ISO date", required: false }
      ],
      response: { success: true, data: { /* system stats */ } }
    },
    {
      method: "GET",
      path: "/api/chatbot/health/ready",
      title: "Readiness Probe",
      description: "Service readiness status (checks database).",
      authentication: null,
      rateLimit: "5000 requests per 10 minutes",
      response: { status: "ready|not ready" }
    },
    {
      method: "GET",
      path: "/api/chatbot/health/live",
      title: "Liveness Probe",
      description: "Service liveness status.",
      authentication: null,
      rateLimit: "5000 requests per 10 minutes",
      response: { status: "alive" }
    },
    {
      method: "GET",
      path: "/api/chatbot/health/metrics",
      title: "Service Metrics",
      description: "Internal HTTP metrics.",
      authentication: "Bearer Token Recommended",
      rateLimit: "200 requests per 15 minutes",
      response: { success: true, data: { /* metrics */ } }
    }

  ]
};
