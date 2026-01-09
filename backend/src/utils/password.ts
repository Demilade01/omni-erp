import bcrypt from 'bcrypt';
import { logger } from '../config/logger';

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw new Error('Failed to compare passwords');
  }
};

/**
 * Validate password strength
 * @param password - Plain text password
 * @returns Object with validation result and message
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  message?: string;
} => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character',
    };
  }

  return { isValid: true };
};

