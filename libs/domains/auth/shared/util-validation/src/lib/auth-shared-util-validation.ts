/**
 * Authentication domain validation schemas and utilities
 * Framework-agnostic validation for authentication data
 */

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
      value: email,
    });
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT',
      value: email,
    });
  }

  if (email.length > 254) {
    errors.push({
      field: 'email',
      message: 'Email is too long (max 254 characters)',
      code: 'TOO_LONG',
      value: email,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Password validation
export function validatePassword(
  password: string,
  options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  },
): ValidationResult {
  const errors: ValidationError[] = [];
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
  } = options || {};

  if (!password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED',
      value: password,
    });
    return { isValid: false, errors };
  }

  if (password.length < minLength) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${minLength} characters long`,
      code: 'TOO_SHORT',
      value: password,
    });
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: 'MISSING_UPPERCASE',
      value: password,
    });
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
      code: 'MISSING_LOWERCASE',
      value: password,
    });
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
      code: 'MISSING_NUMBER',
      value: password,
    });
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character',
      code: 'MISSING_SPECIAL_CHAR',
      value: password,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Username validation
export function validateUsername(
  username: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  },
): ValidationResult {
  const errors: ValidationError[] = [];
  const { minLength = 3, maxLength = 50, allowSpecialChars = false } = options || {};

  if (!username) {
    errors.push({
      field: 'username',
      message: 'Username is required',
      code: 'REQUIRED',
      value: username,
    });
    return { isValid: false, errors };
  }

  if (username.length < minLength) {
    errors.push({
      field: 'username',
      message: `Username must be at least ${minLength} characters long`,
      code: 'TOO_SHORT',
      value: username,
    });
  }

  if (username.length > maxLength) {
    errors.push({
      field: 'username',
      message: `Username must be no more than ${maxLength} characters long`,
      code: 'TOO_LONG',
      value: username,
    });
  }

  const usernameRegex = allowSpecialChars ? /^[a-zA-Z0-9._-]+$/ : /^[a-zA-Z0-9]+$/;

  if (!usernameRegex.test(username)) {
    errors.push({
      field: 'username',
      message: allowSpecialChars
        ? 'Username can only contain letters, numbers, dots, underscores, and hyphens'
        : 'Username can only contain letters and numbers',
      code: 'INVALID_FORMAT',
      value: username,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Login request validation
export function validateLoginRequest(request: {
  username?: string;
  email?: string;
  password?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate username or email
  if (!request.username && !request.email) {
    errors.push({
      field: 'username',
      message: 'Username or email is required',
      code: 'REQUIRED',
      value: request.username || request.email,
    });
  } else if (request.email) {
    const emailValidation = validateEmail(request.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }
  } else if (request.username) {
    const usernameValidation = validateUsername(request.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }
  }

  // Validate password
  if (!request.password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED',
      value: request.password,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Token validation
export function validateToken(token: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!token) {
    errors.push({
      field: 'token',
      message: 'Token is required',
      code: 'REQUIRED',
      value: token,
    });
    return { isValid: false, errors };
  }

  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    errors.push({
      field: 'token',
      message: 'Invalid token format',
      code: 'INVALID_FORMAT',
      value: token,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Keycloak configuration validation
export function validateKeycloakConfig(config: { url?: string; realm?: string; clientId?: string }): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config.url) {
    errors.push({
      field: 'url',
      message: 'Keycloak URL is required',
      code: 'REQUIRED',
      value: config.url,
    });
  } else {
    try {
      new URL(config.url);
    } catch {
      errors.push({
        field: 'url',
        message: 'Invalid URL format',
        code: 'INVALID_FORMAT',
        value: config.url,
      });
    }
  }

  if (!config.realm) {
    errors.push({
      field: 'realm',
      message: 'Keycloak realm is required',
      code: 'REQUIRED',
      value: config.realm,
    });
  }

  if (!config.clientId) {
    errors.push({
      field: 'clientId',
      message: 'Keycloak client ID is required',
      code: 'REQUIRED',
      value: config.clientId,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Generic field validation
export function validateField(
  value: any,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => ValidationError | null;
  },
): ValidationResult {
  const errors: ValidationError[] = [];

  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push({
      field: 'field',
      message: 'This field is required',
      code: 'REQUIRED',
      value,
    });
    return { isValid: false, errors };
  }

  if (value !== null && value !== undefined && value !== '') {
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: 'field',
          message: `Minimum length is ${rules.minLength}`,
          code: 'TOO_SHORT',
          value,
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: 'field',
          message: `Maximum length is ${rules.maxLength}`,
          code: 'TOO_LONG',
          value,
        });
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field: 'field',
          message: 'Invalid format',
          code: 'INVALID_FORMAT',
          value,
        });
      }
    }

    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
