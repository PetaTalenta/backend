const request = require('supertest');
const app = require('../../src/app');
const { User, UserProfile } = require('../../src/models');
const jwt = require('jsonwebtoken');

describe('UserController - updateProfile', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      user_type: 'user',
      is_active: true
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up
    await UserProfile.destroy({ where: { user_id: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe('profile update', () => {
    it('should successfully update profile with valid data', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Test User',
          gender: 'male',
          date_of_birth: '1990-01-01'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile.full_name).toBe('Test User');
      expect(response.body.data.user.profile.gender).toBe('male');
    });

    it('should handle partial profile updates', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Updated Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile.full_name).toBe('Updated Name');
    });

    it('should reject invalid gender values', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Test User',
          gender: 'invalid_gender'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
