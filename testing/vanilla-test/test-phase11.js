// Test Phase 11 logic with mock data
import axios from 'axios';
import { config } from './config.js';

const api = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout.http,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Mock state
const state = {
  resultId: 'mock-result-id',
  idToken: 'mock-token'
};

// Mock testResult
const testResult = undefined; // Simulate the undefined case

// Test the profilePersona creation
const profilePersona = {
  name: 'Test User',
  personality: testResult?.archetype || 'Unknown',
  strengths: testResult?.strengths?.slice(0, 3) || [],
  interests: testResult?.careerRecommendations?.slice(0, 2).map(c => c.careerName) || [],
  careerGoals: testResult?.careerRecommendations?.[0]?.careerName || 'Career development'
};

console.log('Profile Persona:', profilePersona);

// Test the API call structure
const requestData = {
  resultsId: state.resultId,
  profilePersona: profilePersona,
  title: 'Test Conversation'
};

console.log('Request Data:', JSON.stringify(requestData, null, 2));

console.log('Phase 11 logic test passed - no errors thrown');
