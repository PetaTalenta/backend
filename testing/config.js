// Configuration for E2E and Load Testing
module.exports = {
  // API Configuration
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retries: 3
  },
  
  // WebSocket Configuration - Updated to use API Gateway
  websocket: {
    url: 'http://localhost:3000', // Changed from 3005 to 3000 (API Gateway)
    timeout: 10000,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  },
  
  // Test Configuration
  test: {
    userCount: 100,
    concurrency: 20, // Number of concurrent operations
    delayBetweenStages: 2000, // 2 seconds between stages
    assessmentTimeout: 300000, // 5 minutes timeout for assessment completion
    cleanupDelay: 20, // 1 second delay between cleanup operations
    forceDirect: true // Force direct processing to avoid batch "resultId" issues
  },
  
  // Assessment Data Template
  assessmentTemplate: {
    assessmentName: "AI-Driven Talent Mapping",
    riasec: {
      realistic: 75,
      investigative: 80,
      artistic: 65,
      social: 70,
      enterprising: 85,
      conventional: 60
    },
    ocean: {
      openness: 80,
      conscientiousness: 75,
      extraversion: 70,
      agreeableness: 85,
      neuroticism: 40
    },
    viaIs: {
      creativity: 80,
      curiosity: 85,
      judgment: 75,
      loveOfLearning: 90,
      perspective: 70,
      bravery: 65,
      perseverance: 80,
      honesty: 85,
      zest: 75,
      love: 80,
      kindness: 85,
      socialIntelligence: 75,
      teamwork: 80,
      fairness: 85,
      leadership: 70,
      forgiveness: 75,
      humility: 80,
      prudence: 75,
      selfRegulation: 80,
      appreciationOfBeauty: 70,
      gratitude: 85,
      hope: 80,
      humor: 75,
      spirituality: 60
    }
  },
  
  // Schools data for random selection
  schools: [
    { name: "SMA Negeri 1 Jakarta", city: "Jakarta", province: "DKI Jakarta" },
    { name: "SMA Negeri 2 Bandung", city: "Bandung", province: "Jawa Barat" },
    { name: "SMA Negeri 3 Surabaya", city: "Surabaya", province: "Jawa Timur" },
    { name: "SMA Negeri 4 Medan", city: "Medan", province: "Sumatera Utara" },
    { name: "SMA Negeri 5 Yogyakarta", city: "Yogyakarta", province: "DI Yogyakarta" }
  ]
};
