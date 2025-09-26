/**
 * Simple test to verify mock AI configuration
 */

require('dotenv').config();

const ai = require('./src/config/ai');

console.log('Environment variables:');
console.log('USE_MOCK_MODEL:', process.env.USE_MOCK_MODEL);
console.log('GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET');

console.log('\nAI Config:');
console.log('useMockModel:', ai.config.useMockModel);
console.log('apiKey:', ai.config.apiKey ? 'SET' : 'NOT SET');

console.log('\nIs configured:', ai.isConfigured());

// Test mock AI service directly
const mockAiService = require('./src/services/mockAiService');

const testData = {
  riasec: { realistic: 65, investigative: 85, artistic: 45, social: 70, enterprising: 55, conventional: 40 },
  ocean: { openness: 80, conscientiousness: 75, extraversion: 60, agreeableness: 70, neuroticism: 35 },
  viaIs: { creativity: 85, curiosity: 90, judgment: 75 }
};

console.log('\nTesting mock AI service directly...');
mockAiService.generateMockPersonaProfile(testData, 'test-job')
  .then(result => {
    console.log('✅ Mock AI service works!');
    console.log('Archetype:', result.archetype);
  })
  .catch(error => {
    console.log('❌ Mock AI service failed:', error.message);
  });
