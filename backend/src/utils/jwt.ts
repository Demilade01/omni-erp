import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { JWTPayload } from '../types';

/**
 * Generate JWT access token
 * @param payload - User data to encode in token
 * @returns JWT access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  try {
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
      issuer: 'omni-erp',
      audience: 'omni-erp-api',
    } as jwt.SignOptions);
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 * @param payload - User data to encode in token
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  try {
    const token = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as string,
      issuer: 'omni-erp',
      audience: 'omni-erp-api',
    } as jwt.SignOptions);
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify JWT access token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'omni-erp',
      audience: 'omni-erp-api',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    logger.error('Error verifying access token:', error);
    throw new Error('Failed to verify access token');
  }
};

/**
 * Verify JWT refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded token payload
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
      issuer: 'omni-erp',
      audience: 'omni-erp-api',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    logger.error('Error verifying refresh token:', error);
    throw new Error('Failed to verify refresh token');
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded token payload or null
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

