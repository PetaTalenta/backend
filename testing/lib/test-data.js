const { v4: uuidv4 } = require('uuid');
const { faker } = require('@faker-js/faker');

class TestDataGenerator {
  constructor() {
    this.emailDomain = process.env.EMAIL_DOMAIN || 'example.com';
    this.usernamePrefix = process.env.USERNAME_PREFIX || 'testuser';
  }

  generateRandomUser() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    return {
      email: `${this.usernamePrefix}${timestamp}${randomId}@${this.emailDomain}`,
      username: `${this.usernamePrefix}${randomId}`,
      password: 'TestPassword123!',
      full_name: faker.person.fullName()
    };
  }

  generateProfileUpdate() {
    return {
      username: `updated${Math.random().toString(36).substring(2, 8)}`,
      full_name: faker.person.fullName(),
      bio: faker.lorem.sentence(),
      location: faker.location.city(),
      website: faker.internet.url()
    };
  }

  generateAssessmentData(assessmentName = null) {
    return {
      assessmentName: assessmentName || process.env.DEFAULT_ASSESSMENT_NAME || 'AI-Driven Talent Mapping',
      riasec: {
        realistic: this.randomScore(),
        investigative: this.randomScore(),
        artistic: this.randomScore(),
        social: this.randomScore(),
        enterprising: this.randomScore(),
        conventional: this.randomScore()
      },
      ocean: {
        openness: this.randomScore(),
        conscientiousness: this.randomScore(),
        extraversion: this.randomScore(),
        agreeableness: this.randomScore(),
        neuroticism: this.randomScore()
      },
      viaIs: {
        creativity: this.randomScore(),
        curiosity: this.randomScore(),
        judgment: this.randomScore(),
        loveOfLearning: this.randomScore(),
        perspective: this.randomScore(),
        bravery: this.randomScore(),
        perseverance: this.randomScore(),
        honesty: this.randomScore(),
        zest: this.randomScore(),
        love: this.randomScore(),
        kindness: this.randomScore(),
        socialIntelligence: this.randomScore(),
        teamwork: this.randomScore(),
        fairness: this.randomScore(),
        leadership: this.randomScore(),
        forgiveness: this.randomScore(),
        humility: this.randomScore(),
        prudence: this.randomScore(),
        selfRegulation: this.randomScore(),
        appreciationOfBeauty: this.randomScore(),
        gratitude: this.randomScore(),
        hope: this.randomScore(),
        humor: this.randomScore(),
        spirituality: this.randomScore()
      }
    };
  }

  generateChatbotConversation() {
    return {
      title: `E2E Test Chat - ${Date.now()}`,
      context_type: 'career_guidance',
      context_data: {},
      metadata: {
        test_session: true,
        created_by: 'e2e_test'
      }
    };
  }

  generateChatMessages() {
    return [
      {
        content: "Hello, I need career guidance based on my assessment results.",
        content_type: "text"
      },
      {
        content: "What career paths would suit my personality type?",
        content_type: "text"
      },
      {
        content: "Can you help me understand my strengths and weaknesses?",
        content_type: "text"
      },
      {
        content: "What skills should I focus on developing?",
        content_type: "text"
      },
      {
        content: "Thank you for the guidance!",
        content_type: "text"
      }
    ];
  }

  generateSchoolData() {
    return {
      name: `Test School ${Math.random().toString(36).substring(2, 8)}`,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      province: faker.location.state()
    };
  }

  randomScore(min = 40, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateTestSuite(userCount = 2) {
    const users = [];
    for (let i = 0; i < userCount; i++) {
      users.push({
        user: this.generateRandomUser(),
        profileUpdate: this.generateProfileUpdate(),
        assessment: this.generateAssessmentData(`AI-Driven Talent Mapping User ${i + 1}`),
        conversation: this.generateChatbotConversation(),
        messages: this.generateChatMessages()
      });
    }
    return users;
  }

  generateStressTestData(userCount = 5) {
    return this.generateTestSuite(userCount);
  }

  // Validation helpers
  validateUserData(userData) {
    const required = ['email', 'username', 'password'];
    return required.every(field => userData[field]);
  }

  validateAssessmentData(assessmentData) {
    const required = ['assessmentName', 'riasec', 'ocean', 'viaIs'];
    return required.every(field => assessmentData[field]);
  }

  // Data cleanup helpers
  getTestUserPattern() {
    return new RegExp(`^${this.usernamePrefix}\\d+[a-z0-9]+@${this.emailDomain}$`);
  }

  isTestUser(email) {
    return this.getTestUserPattern().test(email);
  }
}

module.exports = TestDataGenerator;
