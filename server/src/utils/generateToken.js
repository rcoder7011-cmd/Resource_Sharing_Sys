const jwt = require('jsonwebtoken');

/**
 * Generate a signed JSON Web Token (JWT) for an authenticated user.
 * 
 * @param {object} user - User document or object containing _id/id and role
 * @returns {string} Signed JWT token string
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign(
    {
      id: userId,
      role: user.role || 'user',
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

module.exports = generateToken;

