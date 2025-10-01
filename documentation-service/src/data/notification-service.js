export const notificationServiceData = {
  name: "Notification Service",
  description: "Real-time notification system for ATMA using WebSocket (Socket.IO). Provides instant notifications for analysis status updates including started, completed, and failed events.",
  baseUrl: "api.futureguide.id",
  websocketUrl: "https://api.futureguide.id",
  version: "1.0.0",
  protocol: "Socket.IO v4.7.2",
  authentication: "JWT Token Required",
  
  websocket: {
    title: "WebSocket Connection",
    description: "Real-time bidirectional communication using Socket.IO for instant notifications",
    connectionFlow: [
      "Connect to WebSocket server",
      "Authenticate with JWT token within 10 seconds",
      "Listen for notification events",
      "Handle disconnect and reconnection"
    ],
    authenticationFlow: [
      "After connection, emit 'authenticate' event with JWT token",
      "Server responds with 'authenticated' (success) or 'auth_error' (failure)",
      "Token must be valid and not expired",
      "User is joined to room 'user:{userId}' for personal notifications"
    ],
    connectionExample: `// Install dependency
npm install socket.io-client

// Basic connection setup
import { io } from 'socket.io-client';

const socket = io('https://api.futureguide.id', {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

// Connect and authenticate
socket.connect();

socket.on('connect', () => {
  console.log('Connected to notification service');

  // Authenticate with JWT token
  socket.emit('authenticate', {
    token: 'your-jwt-token-here'
  });
});

// Handle authentication response
socket.on('authenticated', (data) => {
  console.log('Authenticated successfully:', data);
  // { success: true, userId: "uuid", email: "user@example.com" }
});

socket.on('auth_error', (error) => {
  console.error('Authentication failed:', error);
  // { message: "Token required" | "Authentication timeout" | "Invalid token" }
});`,
    
    events: [
      {
        name: "analysis-started",
        description: "Emitted when an analysis job begins processing",
        data: {
          jobId: "uuid",
          resultId: "uuid",
          status: "processing",
          assessment_name: "Assessment Name",
          message: "Your analysis has started processing...",
          estimated_time: "1-3 minutes",
          timestamp: "2024-01-01T12:00:00.000Z"
        },
        example: `socket.on('analysis-started', (data) => {
  console.log('Analysis started:', data);
  // data.status will be "processing"
  // Show notification to user with estimated time
  showNotification(
    'Analysis Started', 
    \`\${data.message} Estimated time: \${data.estimated_time}\`,
    'info'
  );
});`
      },
      {
        name: "analysis-complete",
        description: "Emitted when an analysis job completes successfully",
        data: {
          status: "completed",
          result_id: "uuid",
          assessment_name: "Assessment Name",
          timestamp: "2024-01-01T12:00:00.000Z"
        },
        example: `socket.on('analysis-complete', (data) => {
  console.log('Analysis completed:', data);
  // data.status will be "completed"
  // Show success notification and redirect to results
  showNotification('Analysis Complete', 'Your analysis is ready!', 'success');
  // Optionally redirect to results page
  window.location.href = \`/results/\${data.result_id}\`;
});`
      },
      {
        name: "analysis-failed",
        description: "Emitted when an analysis job fails",
        data: {
          status: "failed",
          result_id: null,
          assessment_name: "Assessment Name",
          error_message: "Error message",
          timestamp: "2024-01-01T12:00:00.000Z"
        },
        example: `socket.on('analysis-failed', (data) => {
  console.error('Analysis failed:', data);
  // data.status will be "failed"
  // Show error notification
  showNotification('Analysis Failed', data.error_message, 'error');
  // Optionally show retry button
});`
      },
      {
        name: "authenticated",
        description: "Emitted when authentication is successful",
        data: {
          success: true,
          userId: "uuid",
          email: "user@example.com"
        },
        example: `socket.on('authenticated', (data) => {
  console.log('User authenticated:', data);
  setConnectionStatus('connected');
});`
      },
      {
        name: "auth_error",
        description: "Emitted when authentication fails",
        data: {
          message: "Token required | Authentication timeout | Invalid token"
        },
        example: `socket.on('auth_error', (error) => {
  console.error('Authentication error:', error);
  setConnectionStatus('error');
  // Handle re-authentication or redirect to login
});`
      }
    ]
  },

  endpoints: [
    {
      method: "POST",
      path: "/api/notifications/analysis-started",
      title: "Notify Analysis Started (Internal)",
      description: "Internal webhook called by services when analysis begins. Emits WebSocket 'analysis-started' with minimal payload.",
      authentication: "Internal Service Token",
      rateLimit: "No limit",
      requestBody: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        jobId: "job-uuid",
        assessment_name: "AI-Driven Talent Mapping",
        message: "Your analysis has started processing... (optional)"
      },
      response: {
        success: true,
        message: "Notification sent",
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          jobId: "job-uuid",
          assessment_name: "AI-Driven Talent Mapping",
          status: "processing",
          sent: true
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/notifications/analysis-started \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer INTERNAL_SERVICE_TOKEN" \\
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "job-uuid",
    "assessment_name": "AI-Driven Talent Mapping",
    "message": "Your analysis has started processing..."
  }'`
    },
    {
      method: "POST",
      path: "/api/notifications/analysis-complete",
      title: "Notify Analysis Completed (Internal)",
      description: "Internal webhook called by worker when analysis completes. Emits 'analysis-complete' with streamlined payload.",
      authentication: "Internal Service Token",
      rateLimit: "No limit",
      requestBody: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        jobId: "job-uuid",
        result_id: "result-uuid",
        assessment_name: "AI-Driven Talent Mapping"
      },
      response: {
        success: true,
        message: "Notification sent",
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          jobId: "job-uuid",
          result_id: "result-uuid",
          assessment_name: "AI-Driven Talent Mapping",
          status: "completed",
          sent: true
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/notifications/analysis-complete \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer INTERNAL_SERVICE_TOKEN" \\
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "job-uuid",
    "result_id": "result-uuid",
    "assessment_name": "AI-Driven Talent Mapping"
  }'`
    },
    {
      method: "POST",
      path: "/api/notifications/analysis-failed",
      title: "Notify Analysis Failed (Internal)",
      description: "Internal webhook called by worker when analysis fails. Emits 'analysis-failed' with payload {status: 'gagal', result_id, assessment_name, error_message}.",
      authentication: "Internal Service Token",
      rateLimit: "No limit",
      requestBody: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        jobId: "job-uuid",
        assessment_name: "AI-Driven Talent Mapping",
        error_message: "Error message",
        result_id: null
      },
      response: {
        success: true,
        message: "Notification sent",
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          jobId: "job-uuid",
          assessment_name: "AI-Driven Talent Mapping",
          status: "failed",
          sent: true
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/notifications/analysis-failed \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer INTERNAL_SERVICE_TOKEN" \\
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "job-uuid",
    "assessment_name": "AI-Driven Talent Mapping",
    "error_message": "Validation failed"
  }'`
    },
    {
      method: "POST",
      path: "/api/notifications/analysis-unknown",
      title: "Notify Unknown Assessment (Internal)",
      description: "Internal webhook used when assessment type is unsupported. Emits 'analysis-unknown' with {status: 'gagal', result_id, assessment_name, error_message}.",
      authentication: "Internal Service Token",
      rateLimit: "No limit",
      requestBody: {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        jobId: "job-uuid",
        assessment_name: "Unknown Assessment",
        error_message: "Unsupported assessment type",
        result_id: null
      },
      response: {
        success: true,
        message: "Unknown assessment notification sent",
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000",
          jobId: "job-uuid",
          assessment_name: "Unknown Assessment",
          status: "failed",
          sent: true
        }
      },
      example: `curl -X POST https://api.futureguide.id/api/notifications/analysis-unknown \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer INTERNAL_SERVICE_TOKEN" \\
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "jobId": "job-uuid",
    "assessment_name": "Unknown Assessment",
    "error_message": "Unsupported assessment type"
  }'`
    },
    {
      method: "GET",
      path: "/api/notifications/status",
      title: "Service Status (Internal)",
      description: "Check service operational status and connection stats.",
      authentication: "Internal Service Token",
      rateLimit: "No limit",
      response: {
        success: true,
        service: "notification-service",
        status: "operational",
        connections: {
          total: 15,
          authenticated: 12,
          users: 8
        },
        timestamp: "2024-01-01T12:00:00.000Z"
      },
      example: `curl -X GET https://api.futureguide.id/api/notifications/status \\
  -H "Authorization: Bearer INTERNAL_SERVICE_TOKEN"`
    }
  ],

  implementation: {
    title: "Frontend Implementation Guide",
    description: "Complete guide for implementing WebSocket notifications in your frontend application",
    
    reactExample: `// React Hook for WebSocket notifications
import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export const useNotifications = (token) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!token) return;

    const newSocket = io('https://api.futureguide.id', {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    newSocket.connect();

    newSocket.on('connect', () => {
      console.log('Connected to notification service');
      newSocket.emit('authenticate', { token });
    });

    newSocket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setConnected(true);
    });

    newSocket.on('auth_error', (error) => {
      console.error('Auth error:', error);
      setConnected(false);
    });

    // Listen for analysis events
    newSocket.on('analysis-started', (data) => {
      setNotifications(prev => [...prev, { ...data, type: 'info' }]);
    });

    newSocket.on('analysis-complete', (data) => {
      setNotifications(prev => [...prev, { ...data, type: 'success' }]);
    });

    newSocket.on('analysis-failed', (data) => {
      setNotifications(prev => [...prev, { ...data, type: 'error' }]);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    socket,
    connected,
    notifications,
    clearNotifications
  };
};`,

    vueExample: `// Vue 3 Composable for WebSocket notifications
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useNotifications(token) {
  const socket = ref(null);
  const connected = ref(false);
  const notifications = ref([]);

  const connect = () => {
    if (!token.value) return;

    socket.value = io('https://api.futureguide.id', {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });

    socket.value.connect();

    socket.value.on('connect', () => {
      console.log('Connected to notification service');
      socket.value.emit('authenticate', { token: token.value });
    });

    socket.value.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      connected.value = true;
    });

    socket.value.on('auth_error', (error) => {
      console.error('Auth error:', error);
      connected.value = false;
    });

    // Analysis events
    socket.value.on('analysis-started', (data) => {
      notifications.value.push({ ...data, type: 'info' });
    });

    socket.value.on('analysis-complete', (data) => {
      notifications.value.push({ ...data, type: 'success' });
    });

    socket.value.on('analysis-failed', (data) => {
      notifications.value.push({ ...data, type: 'error' });
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
      connected.value = false;
    }
  };

  const clearNotifications = () => {
    notifications.value = [];
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    connected,
    notifications,
    clearNotifications,
    connect,
    disconnect
  };
}`
  },

  troubleshooting: {
    title: "Troubleshooting Guide",
    commonIssues: [
      {
        issue: "CORS Error",
        solution: "Service is configured to allow all origins. Ensure you're connecting to the correct URL."
      },
      {
        issue: "Authentication Timeout",
        solution: "Emit 'authenticate' event within 10 seconds after connection. Check if JWT token is valid."
      },
      {
        issue: "Token Invalid",
        solution: "Ensure JWT token is valid and not expired. Token must contain 'id' and 'email' fields."
      },
      {
        issue: "Connection Failed",
        solution: "Check if notification service is accessible via API Gateway."
      },
      {
        issue: "No Notifications Received",
        solution: "Verify authentication was successful and user is in the correct room. Check server logs for delivery status."
      }
    ],
    debugSteps: [
      "Check service status: GET https://api.futureguide.id/api/notifications/health",
      "Enable debug mode: localStorage.debug = 'socket.io-client:socket'",
      "Monitor network tab for WebSocket connections",
      "Verify JWT token payload and expiry",
      "Check console logs for connection events"
    ]
  }
};
