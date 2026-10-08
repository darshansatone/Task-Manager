const User = require('../models/User');
const { generateToken, seedDefaultCategories } = require('../utils/helpers');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const userExists = await User.findByEmail(email);
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Create user in Supabase
    const user = await User.create({
      name,
      email,
      password
    });

    // Seed initial categories for new user
    await seedDefaultCategories(user.id);

    // Generate JWT
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user with password included
    const user = await User.findByEmail(email, true);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request password reset (generate verification code)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account email address.'
      });
    }

    const resetData = await User.createPasswordResetToken(email.trim());

    if (!resetData) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    // Return reset details (including code for immediate dev/demo convenience)
    res.status(200).json({
      success: true,
      message: 'Password reset code generated successfully. Please check your email or enter the verification code below.',
      resetCode: resetData.code,
      resetToken: resetData.token,
      expiresAt: resetData.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using verification code or token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, token, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, verification code, and new password.'
      });
    }

    const codeOrToken = code || token;
    if (!codeOrToken) {
      return res.status(400).json({
        success: false,
        message: 'Verification code or reset token is required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    await User.resetPassword(email, codeOrToken, newPassword);

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to reset password.'
    });
  }
};

// @desc    Update user preferences (theme, notification options, sound)
// @route   PUT /api/auth/preferences
// @access  Private
exports.updatePreferences = async (req, res, next) => {
  try {
    const {
      theme,
      emailNotifications,
      browserNotifications,
      soundAlerts,
      reminderLeadMinutes
    } = req.body;

    const currentPrefs = req.user.preferences || {};

    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      currentPrefs.theme = theme;
    }
    if (typeof emailNotifications === 'boolean') {
      currentPrefs.emailNotifications = emailNotifications;
    }
    if (typeof browserNotifications === 'boolean') {
      currentPrefs.browserNotifications = browserNotifications;
    }
    if (typeof soundAlerts === 'boolean') {
      currentPrefs.soundAlerts = soundAlerts;
    }
    if (typeof reminderLeadMinutes === 'number') {
      currentPrefs.reminderLeadMinutes = reminderLeadMinutes;
    }

    const updatedUser = await User.updatePreferences(req.user.id, currentPrefs);
    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user (clears session client-side)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};
