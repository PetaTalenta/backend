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
    
    completeReactExample: `// Complete React Implementation with TypeScript
// types/notification.ts
export interface NotificationData {
  jobId?: string;
  resultId?: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  assessment_name: string;
  message?: string;
  estimated_time?: string;
  error_message?: string;
  result_id?: string;
  timestamp: string;
}

export type NotificationEvent = 
  | 'analysis-started'
  | 'analysis-complete'
  | 'analysis-failed'
  | 'analysis-unknown';

// hooks/useNotificationService.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { NotificationData, NotificationEvent } from '../types/notification';

interface NotificationState {
  connected: boolean;
  authenticated: boolean;
  notifications: Array<NotificationData & { type: NotificationEvent; id: string }>;
  error: string | null;
}

export const useNotificationService = (token: string | null) => {
  const [state, setState] = useState<NotificationState>({
    connected: false,
    authenticated: false,
    notifications: [],
    error: null
  });
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token) {
      setState(prev => ({ ...prev, error: 'No authentication token' }));
      return;
    }

    if (socketRef.current?.connected) {
      return; // Already connected
    }

    const socket = io('https://api.futureguide.id', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Connection handlers
    socket.on('connect', () => {
      console.log('[Notification] Connected to server');
      setState(prev => ({ ...prev, connected: true, error: null }));
      reconnectAttempts.current = 0;
      
      // Authenticate immediately after connection
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      console.log('[Notification] Authenticated:', data);
      setState(prev => ({ ...prev, authenticated: true }));
    });

    socket.on('auth_error', (error) => {
      console.error('[Notification] Auth error:', error);
      setState(prev => ({ 
        ...prev, 
        authenticated: false,
        error: error.message || 'Authentication failed'
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('[Notification] Disconnected:', reason);
      setState(prev => ({ ...prev, connected: false, authenticated: false }));
      
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Notification] Reconnected after', attemptNumber, 'attempts');
      // Re-authenticate after reconnection
      socket.emit('authenticate', { token });
    });

    socket.on('reconnect_failed', () => {
      console.error('[Notification] Reconnection failed after max attempts');
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to reconnect to notification service'
      }));
    });

    socket.on('connect_error', (error) => {
      reconnectAttempts.current++;
      console.error('[Notification] Connection error:', error.message);
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setState(prev => ({ 
          ...prev, 
          error: 'Unable to connect to notification service. Please check your connection.'
        }));
      }
    });

    // Analysis event handlers
    const addNotification = (type: NotificationEvent, data: NotificationData) => {
      setState(prev => ({
        ...prev,
        notifications: [
          {
            ...data,
            type,
            id: \`\${type}-\${data.jobId || Date.now()}\`,
            timestamp: data.timestamp || new Date().toISOString()
          },
          ...prev.notifications
        ].slice(0, 50) // Keep only last 50 notifications
      }));
    };

    socket.on('analysis-started', (data: NotificationData) => {
      console.log('[Notification] Analysis started:', data);
      addNotification('analysis-started', data);
    });

    socket.on('analysis-complete', (data: NotificationData) => {
      console.log('[Notification] Analysis complete:', data);
      addNotification('analysis-complete', data);
    });

    socket.on('analysis-failed', (data: NotificationData) => {
      console.log('[Notification] Analysis failed:', data);
      addNotification('analysis-failed', data);
    });

    socket.on('analysis-unknown', (data: NotificationData) => {
      console.log('[Notification] Unknown assessment:', data);
      addNotification('analysis-unknown', data);
    });

    socketRef.current = socket;
    socket.connect();
  }, [token]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setState({
        connected: false,
        authenticated: false,
        notifications: [],
        error: null
      });
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [] }));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    clearNotifications,
    removeNotification,
    socket: socketRef.current
  };
};

// components/NotificationProvider.tsx
import React, { createContext, useContext } from 'react';
import { useNotificationService } from '../hooks/useNotificationService';

const NotificationContext = createContext<ReturnType<typeof useNotificationService> | null>(null);

export const NotificationProvider: React.FC<{ token: string | null; children: React.ReactNode }> = ({ 
  token, 
  children 
}) => {
  const notification = useNotificationService(token);

  return (
    <NotificationContext.Provider value={notification}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// components/NotificationDisplay.tsx
import React, { useEffect } from 'react';
import { useNotifications } from './NotificationProvider';
import toast from 'react-hot-toast'; // or your preferred toast library

export const NotificationDisplay: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  useEffect(() => {
    const latest = notifications[0];
    if (!latest) return;

    switch (latest.type) {
      case 'analysis-started':
        toast.loading(
          \`\${latest.message || 'Processing...'} (\${latest.estimated_time || '2-5 min'})\`,
          { id: latest.jobId, duration: 5000 }
        );
        break;

      case 'analysis-complete':
        toast.success('Analysis completed successfully!', {
          id: latest.jobId,
          duration: 5000
        });
        // Auto-redirect or show result button
        setTimeout(() => {
          if (latest.result_id) {
            window.location.href = \`/results/\${latest.result_id}\`;
          }
        }, 2000);
        break;

      case 'analysis-failed':
      case 'analysis-unknown':
        toast.error(
          latest.error_message || 'Analysis failed. Please try again.',
          { id: latest.jobId, duration: 8000 }
        );
        break;
    }
  }, [notifications]);

  return null; // This component only handles toast notifications
};

// Usage in App.tsx
import { NotificationProvider, NotificationDisplay } from './components';

function App() {
  const { token } = useAuth(); // Your auth hook

  return (
    <NotificationProvider token={token}>
      <NotificationDisplay />
      {/* Your app content */}
    </NotificationProvider>
  );
}`,
    
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

  statusValues: {
    title: "Status Values Reference",
    description: "All status values used in notifications match the database schema exactly. Use these values for comparison and UI state management.",
    values: [
      {
        status: "queued",
        description: "Job is waiting in queue to be processed",
        source: "Initial state when job is submitted",
        uiSuggestion: "Show loading indicator with 'Queued' message"
      },
      {
        status: "processing",
        description: "Job is currently being analyzed by worker",
        source: "WebSocket event: 'analysis-started'",
        uiSuggestion: "Show progress indicator with estimated time"
      },
      {
        status: "completed",
        description: "Job completed successfully with results available",
        source: "WebSocket event: 'analysis-complete'",
        uiSuggestion: "Show success message and redirect to results page"
      },
      {
        status: "failed",
        description: "Job failed due to error (includes unknown assessment types)",
        source: "WebSocket events: 'analysis-failed' or 'analysis-unknown'",
        uiSuggestion: "Show error message with details and retry option"
      }
    ],
    example: `// Status handling example
const handleNotificationStatus = (status, data) => {
  switch(status) {
    case 'queued':
      showMessage('Your assessment is queued for processing', 'info');
      break;
    case 'processing':
      showMessage(\`Processing... Estimated time: \${data.estimated_time || '2-5 minutes'}\`, 'info');
      break;
    case 'completed':
      showMessage('Analysis completed successfully!', 'success');
      navigateToResults(data.result_id);
      break;
    case 'failed':
      showMessage(\`Analysis failed: \${data.error_message || 'Unknown error'}\`, 'error');
      showRetryButton();
      break;
    default:
      console.warn('Unknown status:', status);
  }
};

// Usage with WebSocket events
socket.on('analysis-started', (data) => {
  handleNotificationStatus(data.status, data); // status = "processing"
});

socket.on('analysis-complete', (data) => {
  handleNotificationStatus(data.status, data); // status = "completed"
});

socket.on('analysis-failed', (data) => {
  handleNotificationStatus(data.status, data); // status = "failed"
});`,
    notes: [
      "⚠️ IMPORTANT: Status values are in English and match database exactly",
      "✅ Always use === comparison for status checks",
      "✅ Handle all four status values in your UI state management",
      "❌ DO NOT translate status values - they are API constants",
      "💡 If you need translated UI text, map status to translations in frontend"
    ]
  },

  bestPractices: {
    title: "Frontend Best Practices",
    description: "Recommended patterns for implementing notifications in your application",
    practices: [
      {
        title: "Connection Management",
        description: "Handle WebSocket lifecycle properly",
        example: `// Reconnection strategy
const socket = io('https://api.futureguide.id', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, need to reconnect manually
    socket.connect();
  }
  // else the socket will automatically try to reconnect
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-authenticate after reconnection
  socket.emit('authenticate', { token: getAuthToken() });
});`
      },
      {
        title: "Token Refresh Handling",
        description: "Handle token expiration and refresh",
        example: `// Token refresh on auth error
socket.on('auth_error', async (error) => {
  if (error.message.includes('expired') || error.message.includes('invalid')) {
    try {
      const newToken = await refreshAuthToken();
      socket.emit('authenticate', { token: newToken });
    } catch (err) {
      // Redirect to login if refresh fails
      redirectToLogin();
    }
  }
});`
      },
      {
        title: "Notification Persistence",
        description: "Store notifications for offline viewing",
        example: `// Save notifications to localStorage
const saveNotification = (notification) => {
  const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
  stored.unshift({
    ...notification,
    receivedAt: new Date().toISOString(),
    read: false
  });
  // Keep only last 50 notifications
  const trimmed = stored.slice(0, 50);
  localStorage.setItem('notifications', JSON.stringify(trimmed));
};

socket.on('analysis-complete', (data) => {
  saveNotification({ type: 'analysis-complete', ...data });
  showNotification(data);
});`
      },
      {
        title: "UI State Synchronization",
        description: "Keep UI state in sync with job status",
        example: `// React example with state management
const [jobStatus, setJobStatus] = useState({});

useEffect(() => {
  if (!socket) return;

  socket.on('analysis-started', (data) => {
    setJobStatus(prev => ({
      ...prev,
      [data.jobId]: { 
        status: data.status, // "processing"
        progress: 0,
        message: data.message 
      }
    }));
  });

  socket.on('analysis-complete', (data) => {
    setJobStatus(prev => ({
      ...prev,
      [data.jobId]: { 
        status: data.status, // "completed"
        progress: 100,
        resultId: data.result_id 
      }
    }));
  });

  socket.on('analysis-failed', (data) => {
    setJobStatus(prev => ({
      ...prev,
      [data.jobId]: { 
        status: data.status, // "failed"
        error: data.error_message 
      }
    }));
  });
}, [socket]);`
      },
      {
        title: "Error Boundary",
        description: "Graceful degradation when WebSocket fails",
        example: `// Fallback to polling if WebSocket fails
const [usePolling, setUsePolling] = useState(false);

socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error);
  // Fall back to polling after 3 failed attempts
  if (error.context?.attempts >= 3) {
    setUsePolling(true);
    startPolling();
  }
});

const startPolling = () => {
  const interval = setInterval(async () => {
    try {
      const response = await fetch('/api/assessment/status/' + jobId);
      const data = await response.json();
      updateJobStatus(data.data);
      
      if (data.data.status === 'completed' || data.data.status === 'failed') {
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000); // Poll every 5 seconds
};`
      }
    ]
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
  },

  uiGuidelines: {
    title: "UI/UX Guidelines for Status Display",
    description: "Recommended UI patterns for displaying different notification statuses",
    
    statusColors: {
      queued: {
        color: "#6B7280", // Gray
        icon: "clock",
        message: "Queued for processing"
      },
      processing: {
        color: "#3B82F6", // Blue
        icon: "spinner",
        message: "Processing your assessment..."
      },
      completed: {
        color: "#10B981", // Green
        icon: "check-circle",
        message: "Analysis completed successfully"
      },
      failed: {
        color: "#EF4444", // Red
        icon: "x-circle",
        message: "Analysis failed"
      }
    },

    cssExample: `/* Tailwind CSS classes for status indicators */
.status-badge {
  @apply px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2;
}

.status-queued {
  @apply bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200;
}

.status-processing {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.status-completed {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.status-failed {
  @apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
}`,

    reactComponentExample: `// Status Badge Component
import React from 'react';
import { 
  ClockIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/outline';

type Status = 'queued' | 'processing' | 'completed' | 'failed';

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const statusConfig = {
  queued: {
    icon: ClockIcon,
    text: 'Queued',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  },
  processing: {
    icon: ArrowPathIcon,
    text: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    animate: 'animate-spin'
  },
  completed: {
    icon: CheckCircleIcon,
    text: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  failed: {
    icon: XCircleIcon,
    text: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  showIcon = true, 
  showText = true,
  className = ''
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={\`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium \${config.className} \${className}\`}>
      {showIcon && (
        <Icon className={\`h-4 w-4 \${config.animate || ''}\`} />
      )}
      {showText && config.text}
    </span>
  );
};

// Usage
<StatusBadge status="processing" />
<StatusBadge status="completed" showIcon={false} />
<StatusBadge status="failed" />`,

    translationMapping: {
      title: "Status Translation Mapping",
      description: "If you need to display status in different languages, use this mapping in your frontend",
      example: `// i18n translation mapping
export const statusTranslations = {
  en: {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed'
  },
  id: {
    queued: 'Dalam Antrian',
    processing: 'Sedang Diproses',
    completed: 'Selesai',
    failed: 'Gagal'
  }
};

// Usage with i18next
import { useTranslation } from 'react-i18next';

const StatusDisplay = ({ status }) => {
  const { t } = useTranslation();
  
  return (
    <div>
      {t(\`status.\${status}\`)} {/* Will use statusTranslations */}
    </div>
  );
};

// Or simple mapping
const getStatusText = (status, language = 'en') => {
  return statusTranslations[language][status] || status;
};`
    }
  },

  apiConsistency: {
    title: "API Consistency Notes",
    description: "Important notes about API consistency across the platform",
    notes: [
      {
        title: "Status Values Are Constants",
        content: "Status values ('queued', 'processing', 'completed', 'failed') are database-level constants. DO NOT translate or modify these values in API requests or responses."
      },
      {
        title: "Status Matches Database",
        content: "All status values in notifications exactly match the database schema. This ensures consistency when polling job status via REST API vs receiving WebSocket notifications."
      },
      {
        title: "Cross-Service Consistency",
        content: "The same status values are used across all services (Assessment Service, Archive Service, Notification Service). You can safely compare status from different endpoints."
      },
      {
        title: "Translation Layer",
        content: "If you need to display status in different languages (e.g., Indonesian), implement translation in the frontend presentation layer only. Never translate status values in API communication."
      }
    ],
    comparisonExample: `// ✅ CORRECT: Compare status from different sources
const jobStatusFromAPI = await fetch('/api/assessment/status/job-id');
const jobData = await jobStatusFromAPI.json();

// Status from WebSocket notification
socket.on('analysis-complete', (notification) => {
  if (notification.status === jobData.data.status) {
    // ✅ This works! Both use the same status values
    console.log('Status matches:', notification.status); // "completed"
  }
});

// ✅ CORRECT: Use status for logic
if (jobData.data.status === 'completed') {
  navigateToResults(jobData.data.result_id);
}

// ✅ CORRECT: Translate only for display
const displayStatus = translateStatus(jobData.data.status, 'id');
// displayStatus = "Selesai" (for UI), but API still uses "completed"

// ❌ WRONG: Don't expect translated values from API
if (notification.status === 'berhasil') {
  // ❌ This will never match! API uses "completed", not "berhasil"
}

// ❌ WRONG: Don't send translated status to API
fetch('/api/assessment/submit', {
  body: JSON.stringify({
    status: 'dalam antrian' // ❌ Wrong! Use 'queued'
  })
});`
  }
};

