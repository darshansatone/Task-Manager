const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('../config/supabase');

// In-memory token store (must be declared before class methods reference it)
const resetTokensStore = new Map();

class UserModel {
  // Hash password helper
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password helper
  static async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  // Format user for safe JSON output
  static format(user) {
    if (!user) return null;
    return {
      id: user.id,
      _id: user.id, // Compatibility with existing frontend
      name: user.name,
      email: user.email,
      preferences: user.preferences || { theme: 'dark', emailNotifications: true },
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  // Find user by email
  static async findByEmail(email, includePassword = false) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    const formatted = UserModel.format(data);
    if (includePassword) {
      formatted.password = data.password;
    }
    return formatted;
  }

  // Find user by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return UserModel.format(data);
  }

  // Create new user
  static async create({ name, email, password, preferences }) {
    const hashedPassword = await UserModel.hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        preferences: preferences || { theme: 'dark', emailNotifications: true }
      })
      .select()
      .single();

    if (error) throw error;
    return UserModel.format(data);
  }

  // Update preferences
  static async updatePreferences(id, preferences) {
    const { data, error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return UserModel.format(data);
  }

  // Update password directly
  static async updatePassword(id, newPassword) {
    const hashedPassword = await UserModel.hashPassword(newPassword);
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return UserModel.format(data);
  }

  // Generate password reset code/token
  static async createPasswordResetToken(email) {
    const user = await UserModel.findByEmail(email);
    if (!user) return null;

    // 6-digit verification code & token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const resetPayload = {
      code,
      token,
      expiresAt
    };

    // Store in memory map
    resetTokensStore.set(email.toLowerCase(), resetPayload);

    // Also persist in preferences for reliability
    const currentPrefs = user.preferences || {};
    currentPrefs._reset = resetPayload;
    await UserModel.updatePreferences(user.id, currentPrefs);

    return {
      code,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      user
    };
  }

  // Verify and reset password
  static async resetPassword(email, codeOrToken, newPassword) {
    const user = await UserModel.findByEmail(email, true);
    if (!user) {
      throw new Error('No account found with this email address.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let record = resetTokensStore.get(normalizedEmail);

    // Fallback to user preferences if not in memory
    if (!record && user.preferences && user.preferences._reset) {
      record = user.preferences._reset;
    }

    if (!record) {
      throw new Error('No active password reset request found. Please request a new one.');
    }

    if (Date.now() > record.expiresAt) {
      resetTokensStore.delete(normalizedEmail);
      throw new Error('Reset code has expired. Please request a new one.');
    }

    const provided = (codeOrToken || '').toString().trim();
    if (provided !== record.code && provided !== record.token) {
      throw new Error('Invalid verification code or reset token.');
    }

    // Hash new password and update
    const hashedPassword = await UserModel.hashPassword(newPassword);
    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Clear reset request
    resetTokensStore.delete(normalizedEmail);
    const cleanedPrefs = { ...(user.preferences || {}) };
    delete cleanedPrefs._reset;
    await UserModel.updatePreferences(user.id, cleanedPrefs);

    return UserModel.format(data);
  }

  // Static compatibility wrapper
  static async findOne(query) {
    if (query.email) {
      return {
        select: (fields) => {
          const includePass = fields && fields.includes('+password');
          return UserModel.findByEmail(query.email, includePass);
        }
      };
    }
    return null;
  }
}

module.exports = UserModel;
