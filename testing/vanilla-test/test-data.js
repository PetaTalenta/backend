// Generate unique email for each test run
export function generateTestEmail() {
  const timestamp = Date.now();
  return `test_user_${timestamp}@example.com`;
}

// Test password
export const testPassword = 'TestPass123!';

// Sample assessment data with realistic scores (New format v2)
export const assessmentData = {
  assessment_name: "AI-Driven Talent Mapping",
  assessment_data: {
    riasec: {
      realistic: 65,
      investigative: 85,
      artistic: 72,
      social: 58,
      enterprising: 70,
      conventional: 55
    },
    ocean: {
      openness: 82,
      conscientiousness: 75,
      extraversion: 60,
      agreeableness: 70,
      neuroticism: 45
    },
    viaIs: {
      creativity: 85,
      curiosity: 88,
      judgment: 78,
      loveOfLearning: 82,
      perspective: 75,
      bravery: 68,
      perseverance: 80,
      honesty: 85,
      zest: 65,
      love: 70,
      kindness: 75,
      socialIntelligence: 72,
      teamwork: 68,
      fairness: 80,
      leadership: 70,
      forgiveness: 65,
      humility: 72,
      prudence: 75,
      selfRegulation: 70,
      appreciationOfBeauty: 78,
      gratitude: 75,
      hope: 80,
      humor: 68,
      spirituality: 60
    }
  }
};

// Alternative assessment data for variation testing
export const assessmentDataVariation2 = {
  assessment_name: "AI-Driven Talent Mapping",
  assessment_data: {
    riasec: {
      realistic: 50,
      investigative: 60,
      artistic: 90,
      social: 85,
      enterprising: 55,
      conventional: 45
    },
    ocean: {
      openness: 90,
      conscientiousness: 65,
      extraversion: 80,
      agreeableness: 85,
      neuroticism: 40
    },
    viaIs: {
      creativity: 92,
      curiosity: 85,
      judgment: 70,
      loveOfLearning: 80,
      perspective: 75,
      bravery: 75,
      perseverance: 70,
      honesty: 80,
      zest: 85,
      love: 88,
      kindness: 90,
      socialIntelligence: 85,
      teamwork: 82,
      fairness: 85,
      leadership: 75,
      forgiveness: 80,
      humility: 75,
      prudence: 65,
      selfRegulation: 70,
      appreciationOfBeauty: 95,
      gratitude: 85,
      hope: 88,
      humor: 80,
      spirituality: 70
    }
  }
};

