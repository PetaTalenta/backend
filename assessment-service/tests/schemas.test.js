const {
  assessmentSchema,
  riasecSchema,
  oceanSchema,
  viaIsSchema
} = require('../src/schemas/assessment');

describe('Assessment Schemas', () => {
  describe('RIASEC Schema', () => {
    const validRiasec = {
      realistic: 75,
      investigative: 85,
      artistic: 60,
      social: 50,
      enterprising: 70,
      conventional: 55
    };

    it('should validate correct RIASEC data', () => {
      const { error } = riasecSchema.validate(validRiasec);
      expect(error).toBeUndefined();
    });

    it('should reject missing dimensions', () => {
      const { realistic, ...incomplete } = validRiasec;
      const { error } = riasecSchema.validate(incomplete);
      expect(error).toBeDefined();
    });

    it('should reject values outside 0-100 range', () => {
      const invalid = { ...validRiasec, realistic: 150 };
      const { error } = riasecSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should reject non-integer values', () => {
      const invalid = { ...validRiasec, realistic: 75.5 };
      const { error } = riasecSchema.validate(invalid);
      expect(error).toBeDefined();
    });
  });

  describe('OCEAN Schema', () => {
    const validOcean = {
      openness: 80,
      conscientiousness: 65,
      extraversion: 55,
      agreeableness: 45,
      neuroticism: 30
    };

    it('should validate correct OCEAN data', () => {
      const { error } = oceanSchema.validate(validOcean);
      expect(error).toBeUndefined();
    });

    it('should reject missing dimensions', () => {
      const { openness, ...incomplete } = validOcean;
      const { error } = oceanSchema.validate(incomplete);
      expect(error).toBeDefined();
    });
  });

  describe('VIA-IS Schema', () => {
    const validViaIs = {
      creativity: 85,
      curiosity: 78,
      judgment: 70,
      loveOfLearning: 65,
      perspective: 75,
      bravery: 60,
      perseverance: 80,
      honesty: 90,
      zest: 70,
      love: 85,
      kindness: 88,
      socialIntelligence: 75,
      teamwork: 82,
      fairness: 85,
      leadership: 70,
      forgiveness: 75,
      humility: 65,
      prudence: 70,
      selfRegulation: 75,
      appreciationOfBeauty: 80,
      gratitude: 85,
      hope: 80,
      humor: 75,
      spirituality: 60
    };

    it('should validate correct VIA-IS data', () => {
      const { error } = viaIsSchema.validate(validViaIs);
      expect(error).toBeUndefined();
    });

    it('should reject missing character strengths', () => {
      const { creativity, ...incomplete } = validViaIs;
      const { error } = viaIsSchema.validate(incomplete);
      expect(error).toBeDefined();
    });
  });



  describe('Complete Assessment Schema', () => {
    const validAssessment = {
      riasec: {
        realistic: 75,
        investigative: 85,
        artistic: 60,
        social: 50,
        enterprising: 70,
        conventional: 55
      },
      ocean: {
        openness: 80,
        conscientiousness: 65,
        extraversion: 55,
        agreeableness: 45,
        neuroticism: 30
      },
      viaIs: {
        creativity: 85,
        curiosity: 78,
        judgment: 70,
        loveOfLearning: 65,
        perspective: 75,
        bravery: 60,
        perseverance: 80,
        honesty: 90,
        zest: 70,
        love: 85,
        kindness: 88,
        socialIntelligence: 75,
        teamwork: 82,
        fairness: 85,
        leadership: 70,
        forgiveness: 75,
        humility: 65,
        prudence: 70,
        selfRegulation: 75,
        appreciationOfBeauty: 80,
        gratitude: 85,
        hope: 80,
        humor: 75,
        spirituality: 60
      }
    };

    it('should validate complete assessment data', () => {
      const { error } = assessmentSchema.validate(validAssessment);
      expect(error).toBeUndefined();
    });

    it('should reject incomplete assessment data', () => {
      const { riasec, ...incomplete } = validAssessment;
      const { error } = assessmentSchema.validate(incomplete);
      expect(error).toBeDefined();
    });
  });
});
