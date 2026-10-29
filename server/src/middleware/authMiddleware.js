const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Protect middleware
 * Verifies the JWT Bearer token supplied in the Authorization header.
 * Fetches the corresponding user from the database and attaches it to req.user.
 * Rejects requests without valid tokens with a 401 Unauthorized response.
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  // Check if Bearer token is provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ [Auth Middleware Error] JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'Authentication service configuration error',
      });
    }

    // Verify token validity and expiration
    const decoded = jwt.verify(token, secret);

    // Check database connection before querying
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please check server configuration.',
      });
    }

    // Fetch user without password hash
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    // Check if account has been suspended by administration
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.',
      });
    }

    // Attach verified user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired, please log in again',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token, authorization denied',
      });
    }

    // Other unexpected authentication errors
    return res.status(401).json({
      success: false,
      message: 'Authentication failed, not authorized',
    });
  }
};

/**
 * RequireAdmin middleware
 * Enforces administrator privileges. Requires `protect` middleware to run first.
 * Rejects requests from non-admin users with 403 Forbidden.
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, please authenticate',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required',
    });
  }

  next();
};

/**
 * Optional Protect middleware
 * Attempts to extract user context if token is provided, without failing unauthenticated requests.
 */
const optionalProtect = async (req, res, next) => {
  let token;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    const decoded = jwt.verify(token, secret);
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.status !== 'suspended') {
        req.user = user;
      }
    }
  } catch (err) {
    // Malformed/expired token is safely ignored for optional auth
  }
  return next();
};

module.exports = {
  protect,
  requireAdmin,
  optionalProtect,
};

