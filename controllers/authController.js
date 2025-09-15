const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { success, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
});

class AuthController {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiry = process.env.JWT_EXPIRY || '7d';
        
        if (!this.jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required');
        }
    }
    
    get rateLimiter() {
        return authLimiter;
    }

    _validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    register = async (req, res) => {
        try {
            const { name, email, password } = req.body;
            
            // Validation
            if (!name || !email || !password) {
                return error(res, {
                    status: 400,
                    message: 'Name, email, and password are required',
                    code: 'MISSING_FIELDS'
                });
            }

            if (!this._validateEmail(email)) {
                return error(res, {
                    status: 400,
                    message: 'Invalid email format',
                    code: 'INVALID_EMAIL'
                });
            }

            if (password.length < 8) {
                return error(res, {
                    status: 400,
                    message: 'Password must be at least 8 characters long',
                    code: 'PASSWORD_TOO_SHORT'
                });
            }

            logger.debug('User registration attempt', { email, name });
            
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                logger.warn('Registration failed - user already exists', { email });
                return error(res, {
                    status: 409,
                    message: 'User already exists',
                    code: 'USER_EXISTS'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const role = email === 'fsinta@gmail.com' ? 'admin' : 'user';
            
            const user = await User.create({
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role,
                lastLogin: new Date(),
                isActive: true
            });

            const token = this._generateToken(user);

            logger.audit('user_registered', user, {
                source: 'api',
                role: user.role
            });

            return success(res, {
                message: 'User registered successfully',
                user: this._sanitizeUser(user),
                token,
                expiresIn: this.jwtExpiry
            });

        } catch (err) {
            logger.error('Registration failed', {
                error: err.message,
                stack: err.stack,
                email: req.body.email
            });

            return error(res, {
                status: 500,
                message: 'Registration failed',
                code: 'REGISTRATION_FAILED'
            });
        }
    }

    login = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return error(res, {
                    status: 400,
                    message: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS'
                });
            }

            logger.debug('Login attempt', { email });

            // Find user
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                logger.warn('Login failed - user not found', { email });
                return error(res, {
                    status: 401,
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                logger.warn('Login failed - user inactive', { email, userId: user._id });
                return error(res, {
                    status: 401,
                    message: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                logger.warn('Login failed - invalid password', { email, userId: user._id });
                return error(res, {
                    status: 401,
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate token
            const token = this._generateToken(user);

            logger.audit('user_login', user, {
                source: 'api',
                successful: true
            });

            return success(res, {
                message: 'Login successful',
                user: this._sanitizeUser(user),
                token,
                expiresIn: this.jwtExpiry
            });

        } catch (err) {
            logger.error('Login failed', {
                error: err.message,
                stack: err.stack,
                email: req.body.email
            });

            return error(res, {
                status: 500,
                message: 'Login failed',
                code: 'LOGIN_FAILED'
            });
        }
    }

    // Get current user profile
    getProfile = async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return error(res, {
                    status: 404,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            return success(res, {
                user: this._sanitizeUser(user)
            });

        } catch (err) {
            logger.error('Profile fetch failed', {
                error: err.message,
                userId: req.user.id,
                stack: err.stack
            });

            return error(res, {
                status: 500,
                message: 'Failed to fetch profile',
                code: 'PROFILE_FETCH_FAILED'
            });
        }
    }

    // Update user profile
    updateProfile = async (req, res) => {
        try {
            const { name, email } = req.body;
            const updates = {};

            if (name) updates.name = name;
            if (email && email !== req.user.email) {
                // Check if email is already taken
                const existingUser = await User.findOne({ email: email.toLowerCase() });
                if (existingUser && existingUser._id.toString() !== req.user.id) {
                    return error(res, {
                        status: 409,
                        message: 'Email already taken',
                        code: 'EMAIL_TAKEN'
                    });
                }
                updates.email = email.toLowerCase();
            }

            const user = await User.findByIdAndUpdate(
                req.user.id,
                updates,
                { new: true, runValidators: true }
            );

            logger.audit('profile_updated', req.user, {
                updates: Object.keys(updates)
            });

            return success(res, {
                message: 'Profile updated successfully',
                user: this._sanitizeUser(user)
            });

        } catch (err) {
            logger.error('Profile update failed', {
                error: err.message,
                userId: req.user.id,
                stack: err.stack
            });

            return error(res, {
                status: 500,
                message: 'Failed to update profile',
                code: 'PROFILE_UPDATE_FAILED'
            });
        }
    }

    // Change password
    changePassword = async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return error(res, {
                    status: 400,
                    message: 'Current and new password are required',
                    code: 'MISSING_PASSWORDS'
                });
            }

            if (newPassword.length < 8) {
                return error(res, {
                    status: 400,
                    message: 'New password must be at least 8 characters',
                    code: 'PASSWORD_TOO_SHORT'
                });
            }

            const user = await User.findById(req.user.id);
            if (!user) {
                return error(res, {
                    status: 404,
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                logger.warn('Password change failed - invalid current password', {
                    userId: req.user.id
                });
                return error(res, {
                    status: 401,
                    message: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }

            // Hash new password
            user.password = await bcrypt.hash(newPassword, 12);
            await user.save();

            logger.audit('password_changed', req.user, {
                source: 'api'
            });

            return success(res, {
                message: 'Password changed successfully'
            });

        } catch (err) {
            logger.error('Password change failed', {
                error: err.message,
                userId: req.user.id,
                stack: err.stack
            });

            return error(res, {
                status: 500,
                message: 'Failed to change password',
                code: 'PASSWORD_CHANGE_FAILED'
            });
        }
    }

    // Verify token (for frontend token validation)
    verifyToken = async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return error(res, {
                    status: 401,
                    message: 'No token provided',
                    code: 'NO_TOKEN'
                });
            }

            const decoded = jwt.verify(token, this.jwtSecret);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive) {
                return error(res, {
                    status: 401,
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }

            return success(res, {
                valid: true,
                user: this._sanitizeUser(user),
                expiresIn: decoded.exp - Math.floor(Date.now() / 1000)
            });

        } catch (err) {
            return error(res, {
                status: 401,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Logout (client-side token removal)
    logout = async (req, res) => {
        try {
            logger.audit('user_logout', req.user, {
                source: 'api'
            });

            return success(res, {
                message: 'Logout successful'
            });

        } catch (err) {
            logger.error('Logout failed', {
                error: err.message,
                userId: req.user.id,
                stack: err.stack
            });

            return error(res, {
                status: 500,
                message: 'Logout failed',
                code: 'LOGOUT_FAILED'
            });
        }
    }

    // Add token refresh endpoint
    refreshToken = async (req, res) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return error(res, {
                    status: 401,
                    message: 'No token provided',
                    code: 'NO_TOKEN'
                });
            }

            const decoded = jwt.verify(token, this.jwtSecret);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive) {
                return error(res, {
                    status: 401,
                    message: 'Invalid token',
                    code: 'INVALID_TOKEN'
                });
            }

            // Generate new token
            const newToken = this._generateToken(user);

            return success(res, {
                message: 'Token refreshed successfully',
                token: newToken,
                expiresIn: this.jwtExpiry,
                user: this._sanitizeUser(user)
            });

        } catch (err) {
            return error(res, {
                status: 401,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
    }

    // Private helper methods
    _generateToken = (user) => {
        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            this.jwtSecret,
            { expiresIn: this.jwtExpiry }
        );
    }

    _sanitizeUser = (user) => {
        return {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin,
            isActive: user.isActive,
            createdAt: user.createdAt
        };
    }
}

module.exports = new AuthController();