const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle hardcoded admin case
    if (decoded.isAdmin && decoded.userId === 'admin') {
      req.user = {
        _id: 'admin',
        name: 'Administrator',
        email: 'admin@gmail.com',
        isAdmin: true,
        phone: '1234567890'
      };
    } else {
      // Regular user case
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid token or user not found' });
      }
      req.user = user;
    }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    console.log('Admin access denied for user:', req.user);
    return res.status(403).json({ message: 'Admin access required' });
  }
  console.log('Admin access granted for:', req.user.email);
  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};
