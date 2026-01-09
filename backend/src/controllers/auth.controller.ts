import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/appError';
import { logger } from '../config/logger';
import { UserRole } from '../types';

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 * @access Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      throw new AppError('Please provide email, password, and name', 400);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message || 'Invalid password', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: role || UserRole.USER, // Default to USER role
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/v1/auth/login
 * @access Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Find user and explicitly select password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', 401);
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Update last login and save refresh token
    user.lastLogin = new Date();
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh
 * @access Public
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token matches
    const user = await User.findById(decoded.userId).select('+refreshToken');

    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Clear refresh token
    await User.findByIdAndUpdate(req.user.userId, {
      refreshToken: null,
    });

    logger.info(`User logged out: ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 * @route GET /api/v1/auth/me
 * @access Private
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @route PUT /api/v1/auth/password
 * @access Private
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current and new password', 400);
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError(passwordValidation.message || 'Invalid password', 400);
    }

    // Get user with password
    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password and save
    user.password = await hashPassword(newPassword);
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

