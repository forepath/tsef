import { validateEmail, validatePassword, validateUsername, validateLoginRequest } from './auth-shared-util-validation';

describe('Auth Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = validatePassword('123');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOO_SHORT')).toBe(true);
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });
  });

  describe('validateUsername', () => {
    it('should validate correct username', () => {
      const result = validateUsername('testuser');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short username', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOO_SHORT')).toBe(true);
    });

    it('should reject empty username', () => {
      const result = validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });
  });

  describe('validateLoginRequest', () => {
    it('should validate correct login request', () => {
      const result = validateLoginRequest({
        username: 'testuser',
        password: 'password123'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate email login request', () => {
      const result = validateLoginRequest({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject login request without credentials', () => {
      const result = validateLoginRequest({
        password: 'password123'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject login request without password', () => {
      const result = validateLoginRequest({
        username: 'testuser'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });
  });
});
