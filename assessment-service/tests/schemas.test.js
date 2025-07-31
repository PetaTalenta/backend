const {
  assessmentSchema,
  riasecSchema,
  oceanSchema,
  viaIsSchema,
  industryScoreSchema
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

  describe('Industry Score Schema', () => {
    const validIndustryScore = {
      teknologi: 70,
      kesehatan: 70,
      keuangan: 66,
      pendidikan: 67,
      rekayasa: 70,
      pemasaran: 69,
      hukum: 71,
      kreatif: 64,
      media: 69,
      penjualan: 70,
      sains: 71,
      manufaktur: 69,
      agrikultur: 69,
      pemerintahan: 68,
      konsultasi: 71,
      pariwisata: 71,
      logistik: 67,
      energi: 69,
      sosial: 71,
      olahraga: 68,
      properti: 72,
      kuliner: 69,
      perdagangan: 68,
      telekomunikasi: 72
    };

    it('should validate correct industry score data', () => {
      const { error } = industryScoreSchema.validate(validIndustryScore);
      expect(error).toBeUndefined();
    });

    it('should allow partial industry scores (all fields are optional)', () => {
      const partialIndustryScore = {
        teknologi: 70,
        kesehatan: 80,
        keuangan: 60
      };
      const { error } = industryScoreSchema.validate(partialIndustryScore);
      expect(error).toBeUndefined();
    });

    it('should allow empty industry score object', () => {
      const { error } = industryScoreSchema.validate({});
      expect(error).toBeUndefined();
    });

    it('should reject values outside 0-100 range', () => {
      const invalid = { ...validIndustryScore, teknologi: 150 };
      const { error } = industryScoreSchema.validate(invalid);
      expect(error).toBeDefined();
    });

    it('should reject non-integer values', () => {
      const invalid = { ...validIndustryScore, teknologi: 75.5 };
      const { error } = industryScoreSchema.validate(invalid);
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

    // Backward compatibility tests
    it('should validate assessment data without industryScore (backward compatibility)', () => {
      const { error } = assessmentSchema.validate(validAssessment);
      expect(error).toBeUndefined();
    });

    it('should validate assessment data with industryScore', () => {
      const assessmentWithIndustryScore = {
        ...validAssessment,
        industryScore: {
          teknologi: 70,
          kesehatan: 80,
          keuangan: 60,
          pendidikan: 75
        }
      };
      const { error } = assessmentSchema.validate(assessmentWithIndustryScore);
      expect(error).toBeUndefined();
    });

    it('should validate assessment data with empty industryScore', () => {
      const assessmentWithEmptyIndustryScore = {
        ...validAssessment,
        industryScore: {}
      };
      const { error } = assessmentSchema.validate(assessmentWithEmptyIndustryScore);
      expect(error).toBeUndefined();
    });

    it('should validate assessment data with partial industryScore', () => {
      const assessmentWithPartialIndustryScore = {
        ...validAssessment,
        industryScore: {
          teknologi: 85,
          kesehatan: 70
        }
      };
      const { error } = assessmentSchema.validate(assessmentWithPartialIndustryScore);
      expect(error).toBeUndefined();
    });

    it('should reject assessment with invalid industryScore values', () => {
      const assessmentWithInvalidIndustryScore = {
        ...validAssessment,
        industryScore: {
          teknologi: 150, // Invalid: > 100
          kesehatan: 70
        }
      };
      const { error } = assessmentSchema.validate(assessmentWithInvalidIndustryScore);
      expect(error).toBeDefined();
    });
  });
});
