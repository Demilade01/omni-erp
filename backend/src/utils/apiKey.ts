import crypto from 'crypto';
import { hashPassword } from './password';

/**
 * Generate a secure API key
 * @returns Object with key and hashed key
 */
export const generateApiKey = async (): Promise<{
  key: string;
  hashedKey: string;
}> => {
  // Generate a random 32-byte key and convert to hex
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

  // Hash the key for storage
  const hashedKey = await hashPassword(key);

  return { key, hashedKey };
};

/**
 * Validate API key format
 * @param key - API key to validate
 * @returns True if valid format, false otherwise
 */
export const isValidApiKeyFormat = (key: string): boolean => {
  // API keys should start with 'sk_' and be 67 characters long (sk_ + 64 hex chars)
  return /^sk_[a-f0-9]{64}$/.test(key);
};

/**
 * Mask API key for display
 * @param key - Full API key
 * @returns Masked key showing only first 8 and last 4 characters
 */
export const maskApiKey = (key: string): string => {
  if (!key || key.length < 12) {
    return '***';
  }
  return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
};

