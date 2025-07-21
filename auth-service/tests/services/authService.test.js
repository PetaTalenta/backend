const authService = require('../../src/services/authService');

// Mock dependencies
jest.mock('../../src/models', () => ({
  User: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    sequelize: {
      transaction: jest.fn()
    }
  }
}));

jest.mock('../../src/utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  validatePassword: jest.fn()
}));

jest.mock('../../src/utils/jwt', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn()
}));

const { User } = require('../../src/models');
const { hashPassword, comparePassword, validatePassword } = require('../../src/utils/password');
const { generateToken, verifyToken } = require('../../src/utils/jwt');

describe('AuthService Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser optimization', () => {
    test('should register user faster than 150ms using findOrCreate', async () => {
      // Setup mocks
      validatePassword.mockReturnValue({ isValid: true, errors: [] });
      hashPassword.mockResolvedValue('hashedPassword123');
      generateToken.mockReturnValue('jwt-token');
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        toJSON: () => ({ id: 'user-id', email: 'test@example.com' })
      };
      
      User.findOrCreate.mockResolvedValue([mockUser, true]); // [user, created]

      const userData = {
        email: 'test@example.com',
        password: 'ValidPass123'
      };

      const startTime = Date.now();
      const result = await authService.registerUser(userData);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(duration).toBeLessThan(150); // Performance target
      expect(User.findOrCreate).toHaveBeenCalledTimes(1);
    });

    test('should handle existing email with findOrCreate', async () => {
      validatePassword.mockReturnValue({ isValid: true, errors: [] });
      hashPassword.mockResolvedValue('hashedPassword123');
      
      const mockUser = {
        id: 'existing-user-id',
        email: 'existing@example.com'
      };
      
      User.findOrCreate.mockResolvedValue([mockUser, false]); // [user, created=false]

      const userData = {
        email: 'existing@example.com',
        password: 'ValidPass123'
      };

      await expect(authService.registerUser(userData)).rejects.toThrow('Email already exists');
    });
  });

  describe('loginUser optimization', () => {
    test('should login user faster than 120ms with async last_login', async () => {
      // Set async last login environment
      process.env.ASYNC_LAST_LOGIN = 'true';
      
      comparePassword.mockResolvedValue(true);
      generateToken.mockReturnValue('jwt-token');
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        update: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ id: 'user-id', email: 'test@example.com' })
      };
      
      User.findOne.mockResolvedValue(mockUser);

      const credentials = {
        email: 'test@example.com',
        password: 'ValidPass123'
      };

      const startTime = Date.now();
      const result = await authService.loginUser(credentials);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(duration).toBeLessThan(120); // Performance target with async update
      expect(User.findOne).toHaveBeenCalledTimes(1);
      
      // Clean up
      delete process.env.ASYNC_LAST_LOGIN;
    });

    test('should handle invalid credentials', async () => {
      comparePassword.mockResolvedValue(false);
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashedPassword',
        toJSON: () => ({ id: 'user-id', email: 'test@example.com' })
      };
      
      User.findOne.mockResolvedValue(mockUser);

      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      await expect(authService.loginUser(credentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyUserToken optimization', () => {
    test('should verify token faster than 50ms', async () => {
      verifyToken.mockReturnValue({ id: 'user-id' });
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        is_active: true,
        toJSON: () => ({ id: 'user-id', email: 'test@example.com' })
      };
      
      User.findByPk.mockResolvedValue(mockUser);

      const token = 'valid-jwt-token';

      const startTime = Date.now();
      const result = await authService.verifyUserToken(token);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.id).toBe('user-id');
      expect(duration).toBeLessThan(50); // Performance target
      expect(User.findByPk).toHaveBeenCalledTimes(1);
    });
  });
});
