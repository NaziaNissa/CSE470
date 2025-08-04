const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthService {
  // Generate JWT token
  generateToken(userId, isAdmin = false) {
    return jwt.sign(
      { userId, isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  // Register new user
  async registerUser(userData) {
    try {
      if (!userData.email || !userData.password || !userData.name) {
        throw new Error('Please provide all required fields');
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = new User({
        name: userData.name,
        email: userData.email,
        passwordHash: userData.password, // Will be hashed by pre-save middleware
        phone: userData.phone || '',
        isAdmin: userData.isAdmin || false
      });

      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async loginUser({ email, password, isAdmin }) {
    try {
      // Check for admin login with hardcoded credentials
      if (isAdmin) {
        const ADMIN_EMAIL = 'admin@gmail.com';
        const ADMIN_PASSWORD = 'admin123';
        
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const token = this.generateToken('admin', true);
          
          return {
            token,
            user: {
              _id: 'admin',
              name: 'Administrator',
              email: ADMIN_EMAIL,
              isAdmin: true,
              phone: '1234567890'
            }
          };
        }
        throw new Error('Invalid admin credentials');
      }

      // Regular user login
      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = this.generateToken(user._id);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId).select('-passwordHash');
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userId, userData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update only allowed fields
      if (userData.name) user.name = userData.name;
      if (userData.phone) user.phone = userData.phone;
      if (userData.email && userData.email !== user.email) {
        // Check if email is already in use
        const existingUser = await User.findOne({ 
          email: userData.email,
          _id: { $ne: userId } // Exclude current user from check
        });
        if (existingUser) {
          throw new Error('Email is already in use');
        }
        user.email = userData.email;
      }

      const updatedUser = await user.save();
      // Generate new token with updated user info
      const token = this.generateToken(updatedUser._id, updatedUser.isAdmin);
      
      return {
        user: updatedUser.toJSON(),
        token
      };
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Verify token
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user || !user.isActive) {
        throw new Error('Invalid token');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}

// Export the service instance directly
const authService = new AuthService();
module.exports = authService;
