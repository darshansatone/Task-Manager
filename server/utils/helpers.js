const jwt = require('jsonwebtoken');
const Category = require('../models/Category');
const ActivityLog = require('../models/ActivityLog');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Seed default categories for a new user
const seedDefaultCategories = async (userId) => {
  const defaultCategories = [
    { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
    { name: 'Study', color: '#8b5cf6', icon: 'book-open' },
    { name: 'Personal', color: '#ec4899', icon: 'user' },
    { name: 'Projects', color: '#10b981', icon: 'folder' },
    { name: 'Important', color: '#ef4444', icon: 'alert-circle' }
  ];

  try {
    const existing = await Category.countDocuments({ user: userId });
    if (existing === 0) {
      const docs = defaultCategories.map((c) => ({ ...c, user: userId }));
      await Category.insertMany(docs);
    }
  } catch (err) {
    console.error('Error seeding default categories:', err.message);
  }
};

// Log user activity
const logActivity = async (userId, action, taskTitle = '', details = '') => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      taskTitle,
      details
    });
  } catch (err) {
    console.error('Error recording activity log:', err.message);
  }
};

module.exports = {
  generateToken,
  seedDefaultCategories,
  logActivity
};
