const request = require('supertest');
const app = require('../../src/app');
const { User, UserProfile } = require('../../src/models');
const { generateToken } = require('../../src/utils/jwt');

describe('UserController - deleteAccount', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'testuser@example.com',
      password_hash: 'hashedpassword',
      user_type: 'user',
      is_active: true,
      token_balance: 10
    });

    // Create user profile
    await UserProfile.create({
      user_id: testUser.id,
      full_name: 'Test User',
      gender: 'male'
    });

    // Generate auth token
    authToken = generateToken({ id: testUser.id, email: testUser.email });
  });

  afterEach(async () => {
    // Clean up - find user by id since email might be changed
    const user = await User.findByPk(testUser.id);
    if (user) {
      await UserProfile.destroy({ where: { user_id: testUser.id } });
      await User.destroy({ where: { id: testUser.id } });
    }
  });

  describe('DELETE /api/auth/account', () => {
    it('should successfully delete user account (soft delete)', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');
      expect(response.body.data).toHaveProperty('deletedAt');
      expect(response.body.data).toHaveProperty('originalEmail', 'testuser@example.com');

      // Verify user is soft deleted
      const deletedUser = await User.findByPk(testUser.id);
      expect(deletedUser.email).toMatch(/^deleted_\d+_testuser@example\.com$/);
      expect(deletedUser.token_balance).toBe(0);
      expect(deletedUser.is_active).toBe(false);

      // Verify profile is deleted
      const profile = await UserProfile.findByPk(testUser.id);
      expect(profile).toBeNull();
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when user not found', async () => {
      // Delete user first
      await User.destroy({ where: { id: testUser.id } });

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 404 when user is already inactive', async () => {
      // Set user as inactive
      await testUser.update({ is_active: false });

      const response = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
