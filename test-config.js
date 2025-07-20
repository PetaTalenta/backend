// Configuration and setup for ATMA testing
const axios = require('axios');

// Service URLs
const API_GATEWAY_URL = 'http://localhost:3000';
const AUTH_SERVICE_URL = 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = 'http://localhost:3005';

// Generate random email for each test run
function generateRandomEmail() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);
  return `testuser_${timestamp}_${randomNum}@example.com`;
}

// Function to regenerate test user with new random email and username
function regenerateTestUser() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);

  const testUser = {
    email: generateRandomEmail(),
    password: 'password123'
  };

  // Also update profile data with random username (alphanumeric only)
  const profileData = {
    username: `testuser${timestamp}${randomNum}`,
    full_name: 'Test User',
    school_id: 1,
    date_of_birth: '1995-01-01',
    gender: 'male'
  };

  console.log(`Generated new test user email: ${testUser.email}`);
  console.log(`Generated new username: ${profileData.username}`);

  return { testUser, profileData };
}

// Assessment data for WebSocket flow testing
const assessmentData = {
  riasec: {
    realistic: 75,
    investigative: 85,
    artistic: 60,
    social: 50,
    enterprising: 70,
    conventional: 55
  },
  ocean: {
    conscientiousness: 65,
    extraversion: 55,
    agreeableness: 45,
    neuroticism: 30,
    openness: 80
  },
  viaIs: {
    creativity: 85,
    curiosity: 78,
    judgment: 70,
    loveOfLearning: 82,
    perspective: 60,
    bravery: 65,
    perseverance: 70,
    honesty: 75,
    zest: 60,
    love: 55,
    kindness: 68,
    socialIntelligence: 72,
    teamwork: 65,
    fairness: 70,
    leadership: 60,
    forgiveness: 55,
    humility: 50,
    prudence: 65,
    selfRegulation: 70,
    appreciationOfBeauty: 75,
    gratitude: 80,
    hope: 70,
    humor: 65,
    spirituality: 45
  }
};

// Create test user for mass testing
async function createTestUser(index) {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 10000);

  return {
    email: `masstest_${timestamp}_${index}_${randomNum}@example.com`,
    password: 'password123',
    username: `massuser${timestamp}${index}${randomNum}`,
    full_name: `Mass Test User ${index}`,
    school_id: 1,
    date_of_birth: '1995-01-01',
    gender: 'male'
  };
}

module.exports = {
  API_GATEWAY_URL,
  AUTH_SERVICE_URL,
  NOTIFICATION_SERVICE_URL,
  generateRandomEmail,
  regenerateTestUser,
  assessmentData,
  createTestUser
};
