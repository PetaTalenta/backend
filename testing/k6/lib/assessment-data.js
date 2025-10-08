/**
 * Assessment Data Samples
 * Various assessment data variations for testing
 */

/**
 * Balanced assessment data - all dimensions relatively equal
 */
export const BALANCED_ASSESSMENT = {
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
    riasec: {
      realistic: 70,
      investigative: 72,
      artistic: 68,
      social: 71,
      enterprising: 69,
      conventional: 70,
    },
    ocean: {
      openness: 70,
      conscientiousness: 72,
      extraversion: 68,
      agreeableness: 71,
      neuroticism: 45,
    },
    viaIs: {
      creativity: 70,
      curiosity: 72,
      judgment: 71,
      loveOfLearning: 73,
      perspective: 69,
      bravery: 68,
      perseverance: 72,
      honesty: 74,
      zest: 70,
      love: 71,
      kindness: 73,
      socialIntelligence: 70,
      teamwork: 72,
      fairness: 74,
      leadership: 69,
      forgiveness: 71,
      humility: 70,
      prudence: 72,
      selfRegulation: 71,
      appreciationOfBeauty: 68,
      gratitude: 73,
      hope: 72,
      humor: 70,
      spirituality: 65,
    },
    industryScore: {
      teknologi: 24,
      kesehatan: 24,
      keuangan: 24,
    },
  },
  raw_responses: {
    riasec: [
      { questionId: 'Riasec-R-01', value: 4 },
      { questionId: 'Riasec-I-01', value: 4 },
      { questionId: 'Riasec-A-01', value: 4 },
    ],
    ocean: [
      { questionId: 'Ocean-O-01', value: 4 },
      { questionId: 'Ocean-C-01', value: 4 },
      { questionId: 'Ocean-E-01', value: 4 },
    ],
    viaIs: [
      { questionId: 'VIA-Creativity-01', value: 4 },
      { questionId: 'VIA-Curiosity-01', value: 4 },
      { questionId: 'VIA-Judgement-01', value: 4 },
    ],
  },
  raw_schema_version: 'v1',
};

/**
 * High investigative assessment - strong analytical and research orientation
 */
export const INVESTIGATIVE_ASSESSMENT = {
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
    riasec: {
      realistic: 60,
      investigative: 90,
      artistic: 65,
      social: 55,
      enterprising: 58,
      conventional: 62,
    },
    ocean: {
      openness: 88,
      conscientiousness: 82,
      extraversion: 50,
      agreeableness: 70,
      neuroticism: 35,
    },
    viaIs: {
      creativity: 85,
      curiosity: 92,
      judgment: 88,
      loveOfLearning: 95,
      perspective: 86,
      bravery: 70,
      perseverance: 84,
      honesty: 88,
      zest: 72,
      love: 68,
      kindness: 75,
      socialIntelligence: 65,
      teamwork: 70,
      fairness: 82,
      leadership: 68,
      forgiveness: 72,
      humility: 78,
      prudence: 85,
      selfRegulation: 84,
      appreciationOfBeauty: 80,
      gratitude: 76,
      hope: 78,
      humor: 70,
      spirituality: 60,
    },
    industryScore: {
      teknologi: 30,
      kesehatan: 20,
      keuangan: 22,
    },
  },
  raw_responses: {
    riasec: [
      { questionId: 'Riasec-R-01', value: 3 },
      { questionId: 'Riasec-I-01', value: 5 },
      { questionId: 'Riasec-A-01', value: 4 },
    ],
    ocean: [
      { questionId: 'Ocean-O-01', value: 5 },
      { questionId: 'Ocean-C-01', value: 5 },
      { questionId: 'Ocean-E-01', value: 3 },
    ],
    viaIs: [
      { questionId: 'VIA-Creativity-01', value: 5 },
      { questionId: 'VIA-Curiosity-01', value: 5 },
      { questionId: 'VIA-Judgement-01', value: 5 },
    ],
  },
  raw_schema_version: 'v1',
};

/**
 * High artistic assessment - creative and expressive orientation
 */
export const ARTISTIC_ASSESSMENT = {
  assessment_name: 'AI-Driven Talent Mapping',
  assessment_data: {
    riasec: {
      realistic: 55,
      investigative: 68,
      artistic: 92,
      social: 78,
      enterprising: 72,
      conventional: 50,
    },
    ocean: {
      openness: 95,
      conscientiousness: 70,
      extraversion: 82,
      agreeableness: 85,
      neuroticism: 55,
    },
    viaIs: {
      creativity: 95,
      curiosity: 88,
      judgment: 75,
      loveOfLearning: 82,
      perspective: 80,
      bravery: 78,
      perseverance: 76,
      honesty: 82,
      zest: 88,
      love: 85,
      kindness: 88,
      socialIntelligence: 84,
      teamwork: 80,
      fairness: 82,
      leadership: 75,
      forgiveness: 80,
      humility: 72,
      prudence: 68,
      selfRegulation: 70,
      appreciationOfBeauty: 96,
      gratitude: 86,
      hope: 84,
      humor: 88,
      spirituality: 78,
    },
    industryScore: {
      teknologi: 22,
      kesehatan: 18,
      keuangan: 16,
    },
  },
  raw_responses: {
    riasec: [
      { questionId: 'Riasec-R-01', value: 3 },
      { questionId: 'Riasec-I-01', value: 4 },
      { questionId: 'Riasec-A-01', value: 5 },
    ],
    ocean: [
      { questionId: 'Ocean-O-01', value: 5 },
      { questionId: 'Ocean-C-01', value: 4 },
      { questionId: 'Ocean-E-01', value: 5 },
    ],
    viaIs: [
      { questionId: 'VIA-Creativity-01', value: 5 },
      { questionId: 'VIA-Curiosity-01', value: 5 },
      { questionId: 'VIA-Judgement-01', value: 4 },
    ],
  },
  raw_schema_version: 'v1',
};

/**
 * Get assessment data by variation name
 */
export function getAssessmentData(variation = 'balanced') {
  const variations = {
    balanced: BALANCED_ASSESSMENT,
    investigative: INVESTIGATIVE_ASSESSMENT,
    artistic: ARTISTIC_ASSESSMENT,
  };
  
  return variations[variation] || BALANCED_ASSESSMENT;
}

/**
 * Generate random assessment data with some variation
 */
export function generateRandomAssessment() {
  const variations = ['balanced', 'investigative', 'artistic'];
  const randomVariation = variations[Math.floor(Math.random() * variations.length)];
  
  const baseData = getAssessmentData(randomVariation);
  
  // Add small random variations to make each submission unique
  const data = JSON.parse(JSON.stringify(baseData)); // Deep clone
  
  // Add random variation of ±5 to each score
  Object.keys(data.assessment_data.riasec).forEach(key => {
    const variation = Math.floor(Math.random() * 11) - 5; // -5 to +5
    data.assessment_data.riasec[key] = Math.max(0, Math.min(100, 
      data.assessment_data.riasec[key] + variation));
  });
  
  Object.keys(data.assessment_data.ocean).forEach(key => {
    const variation = Math.floor(Math.random() * 11) - 5;
    data.assessment_data.ocean[key] = Math.max(0, Math.min(100, 
      data.assessment_data.ocean[key] + variation));
  });
  
  return data;
}

export default {
  BALANCED_ASSESSMENT,
  INVESTIGATIVE_ASSESSMENT,
  ARTISTIC_ASSESSMENT,
  getAssessmentData,
  generateRandomAssessment,
};

