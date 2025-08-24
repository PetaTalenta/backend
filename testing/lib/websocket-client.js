const io = require('socket.io-client');
const chalk = require('chalk');

// Prefer API Gateway URL for WebSocket connections (see notification-service/WEBSOCKET_MANUAL.md)
function resolveDefaultWsUrl() {
  if (process.env.WEBSOCKET_URL) return process.env.WEBSOCKET_URL;
  if (process.env.API_GATEWAY_URL) return process.env.API_GATEWAY_URL;
  if (process.env.API_BASE_URL) {
    try {
      const u = new URL(process.env.API_BASE_URL);
      return `${u.protocol}//${u.host}`;
    } catch (e) {
      // Fallback: strip trailing /api if present
      return process.env.API_BASE_URL.replace(/\/api\/?$/, '');
    }
  }
  return 'http://localhost:3000';
}
const DEFAULT_WS_URL = resolveDefaultWsUrl();


class WebSocketClient {
  constructor(url = DEFAULT_WS_URL) {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.notifications = [];
    this.eventHandlers = new Map();
    this.authTimeout = parseInt(process.env.WEBSOCKET_TIMEOUT) || 10000;
  }

  connect(options = {}) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false
      };

      const socketOptions = { ...defaultOptions, ...options };

      this.socket = io(this.url, socketOptions);

      // Connection events
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log(chalk.green('✓ WebSocket connected'));
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.log(chalk.red(`✗ WebSocket connection error: ${error.message}`));
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.isAuthenticated = false;
        console.log(chalk.yellow(`⚠ WebSocket disconnected: ${reason}`));
      });

      // Authentication events
      this.socket.on('authenticated', (data) => {
        this.isAuthenticated = true;
        console.log(chalk.green(`✓ WebSocket authenticated for user: ${data.email}`));
      });

      this.socket.on('auth_error', (data) => {
        console.log(chalk.red(`✗ WebSocket authentication error: ${data.message}`));
      });

      // Notification events
      this.socket.on('analysis-started', (data) => {
        console.log(chalk.blue(`📊 Analysis started: ${data.jobId}`));
        this.notifications.push({ type: 'analysis-started', data, timestamp: new Date() });
        this.triggerHandler('analysis-started', data);
      });

      this.socket.on('analysis-complete', (data) => {
        console.log(chalk.green(`✅ Analysis complete: ${data.jobId} -> ${data.resultId}`));
        this.notifications.push({ type: 'analysis-complete', data, timestamp: new Date() });
        this.triggerHandler('analysis-complete', data);
      });

      this.socket.on('analysis-failed', (data) => {
        console.log(chalk.red(`❌ Analysis failed: ${data.jobId} - ${data.error}`));
        this.notifications.push({ type: 'analysis-failed', data, timestamp: new Date() });
        this.triggerHandler('analysis-failed', data);
      });

      // Start connection
      this.socket.connect();
    });
  }

  authenticate(token) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, this.authTimeout);

      const onAuthenticated = (data) => {
        clearTimeout(timeout);
        this.socket.off('authenticated', onAuthenticated);
        this.socket.off('auth_error', onAuthError);
        resolve(data);
      };

      const onAuthError = (data) => {
        clearTimeout(timeout);
        this.socket.off('authenticated', onAuthenticated);
        this.socket.off('auth_error', onAuthError);
        reject(new Error(data.message));
      };

      this.socket.on('authenticated', onAuthenticated);
      this.socket.on('auth_error', onAuthError);

      // Send authentication
      this.socket.emit('authenticate', { token });
    });
  }

  waitForNotification(type, timeout = 300000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(type, handler);
        reject(new Error(`Timeout waiting for ${type} notification`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timeoutId);
        this.off(type, handler);
        resolve(data);
      };

      this.on(type, handler);
    });
  }

  waitForAssessmentComplete(jobId, timeout = 300000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off('analysis-complete', completeHandler);
        this.off('analysis-failed', failedHandler);
        reject(new Error(`Timeout waiting for assessment ${jobId} to complete`));
      }, timeout);

      const completeHandler = (data) => {
        if (data.jobId === jobId) {
          clearTimeout(timeoutId);
          this.off('analysis-complete', completeHandler);
          this.off('analysis-failed', failedHandler);
          resolve(data);
        }
      };

      const failedHandler = (data) => {
        if (data.jobId === jobId) {
          clearTimeout(timeoutId);
          this.off('analysis-complete', completeHandler);
          this.off('analysis-failed', failedHandler);
          reject(new Error(`Assessment failed: ${data.error}`));
        }
      };

      this.on('analysis-complete', completeHandler);
      this.on('analysis-failed', failedHandler);
    });
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  triggerHandler(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(chalk.red(`Error in ${event} handler:`, error));
        }
      });
    }
  }

  getNotifications(type = null) {
    if (type) {
      return this.notifications.filter(n => n.type === type);
    }
    return this.notifications;
  }

  clearNotifications() {
    this.notifications = [];
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.eventHandlers.clear();
    console.log(chalk.yellow('WebSocket disconnected'));
  }

  getStatus() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      notificationCount: this.notifications.length,
      url: this.url
    };
  }
}

module.exports = WebSocketClient;
