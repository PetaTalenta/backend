export const config = {
  baseURL: 'https://api.futureguide.id',
  wsURL: 'wss://api.futureguide.id',
  
  // Timeouts (in milliseconds)
  timeout: {
    http: 30000,           // 30 seconds for HTTP requests
    wsConnect: 10000,      // 10 seconds for WebSocket connection
    wsAuth: 10000,         // 10 seconds for WebSocket authentication
    wsNotification: 600000, // 10 minutes for analysis notification
    polling: 60000,        // 1 minute total polling time
    pollingInterval: 3000  // 3 seconds between polls
  },
  
  // Test configuration
  test: {
    maxPollingAttempts: 20,
    chatbotMessages: [
      "Bisakah kamu jelaskan lebih detail tentang archetype saya?",
      "Apa langkah konkret yang bisa saya ambil untuk mengembangkan karir saya?",
      "Bagaimana cara mengembangkan kelemahan yang kamu sebutkan?"
    ]
  }
};

