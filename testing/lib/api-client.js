const axios = require('axios');
const chalk = require('chalk');

class APIClient {
  constructor(baseURL = process.env.API_BASE_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.token = null;
    this.userId = null;
    this.userEmail = null;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.ENABLE_DETAILED_LOGS === 'true') {
          console.log(chalk.green(`✓ ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`));
        }
        return response;
      },
      (error) => {
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        const url = error.config?.url || 'UNKNOWN';
        const status = error.response?.status || 'NO_RESPONSE';
        console.log(chalk.red(`✗ ${method} ${url} - ${status}`));

        if (error.response?.data) {
          console.log(chalk.red(`  Error: ${JSON.stringify(error.response.data, null, 2)}`));
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(userData) {
    const response = await this.client.post('/api/auth/register', userData);
    if (response.data.success && response.data.data.token) {
      this.token = response.data.data.token;
      this.userId = response.data.data.user.id;
      this.userEmail = response.data.data.user.email;
    }
    return response.data;
  }

  async login(credentials) {
    const response = await this.client.post('/api/auth/login', credentials);
    if (response.data.success && response.data.data.token) {
      this.token = response.data.data.token;
      this.userId = response.data.data.user.id;
      this.userEmail = response.data.data.user.email;
    }
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/api/auth/profile');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await this.client.put('/api/auth/profile', profileData);
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/api/auth/logout');
    this.token = null;
    this.userId = null;
    this.userEmail = null;
    return response.data;
  }

  // Assessment endpoints
  async submitAssessment(assessmentData) {
    const response = await this.client.post('/api/assessment/submit', assessmentData);
    return response.data;
  }

  async getAssessmentStatus(jobId) {
    const response = await this.client.get(`/api/assessment/status/${jobId}`);
    return response.data;
  }

  // Archive endpoints
  async getResults(params = {}) {
    const response = await this.client.get('/api/archive/results', { params });
    return response.data;
  }

  async getResult(resultId) {
    const response = await this.client.get(`/api/archive/results/${resultId}`);
    return response.data;
  }

  async getJobs(params = {}) {
    const response = await this.client.get('/api/archive/jobs', { params });
    return response.data;
  }

  async getJob(jobId) {
    const response = await this.client.get(`/api/archive/jobs/${jobId}`);
    return response.data;
  }

  async deleteJob(jobId) {
    const response = await this.client.delete(`/api/archive/jobs/${jobId}`);
    return response.data;
  }

  // Chatbot endpoints
  async createConversation(conversationData) {
    const response = await this.client.post('/api/chatbot/conversations', conversationData);
    return response.data;
  }

  async getConversations(params = {}) {
    const response = await this.client.get('/api/chatbot/conversations', { params });
    return response.data;
  }

  async getConversation(conversationId, params = {}) {
    const response = await this.client.get(`/api/chatbot/conversations/${conversationId}`, { params });
    return response.data;
  }

  async sendMessage(conversationId, messageData) {
    const response = await this.client.post(`/api/chatbot/conversations/${conversationId}/messages`, messageData);
    return response.data;
  }

  async getMessages(conversationId, params = {}) {
    const response = await this.client.get(`/api/chatbot/conversations/${conversationId}/messages`, { params });
    return response.data;
  }

  async createConversationFromAssessment(assessmentData) {
    const response = await this.client.post('/api/chatbot/assessment/from-assessment', assessmentData);
    return response.data;
  }



  // Convenience helpers
  async registerAndLogin(user) {
    // Try register first; if it already returns a token, we're authenticated
    const reg = await this.register(user);
    if (reg?.success && reg?.data?.token) {
      return reg;
    }
    // Fallback to explicit login
    return await this.login({ email: user.email, password: user.password });
  }

  async updateConversation(conversationId, update) {
    const response = await this.client.put(`/api/chatbot/conversations/${conversationId}`, update);
    return response.data;
  }

  async deleteConversation(conversationId) {
    const response = await this.client.delete(`/api/chatbot/conversations/${conversationId}`);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Admin endpoints (for cleanup)
  async deleteAccount() {
    if (!this.userId) {
      throw new Error('No user ID available for deletion');
    }

    try {
      // Try to delete via admin endpoint (if available)
      const response = await this.client.delete(`/api/archive/admin/users/${this.userId}`);
      return response.data;
    } catch (error) {
      // If admin endpoint not available, just logout
      console.log(chalk.yellow('Admin deletion not available, performing logout only'));
      return await this.logout();
    }
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token;
  }

  getUserInfo() {
    return {
      userId: this.userId,
      email: this.userEmail,
      token: this.token
    };
  }

  setToken(token) {
    this.token = token;
  }

  clearAuth() {
    this.token = null;
    this.userId = null;
    this.userEmail = null;
  }
}

module.exports = APIClient;
