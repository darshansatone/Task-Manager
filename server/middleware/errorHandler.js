const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // PostgreSQL / Supabase Unique Violation
  if (err.code === '23505' || err.code === 11000) {
    let message = 'A record with that value already exists.';
    if (err.message && err.message.includes('email')) {
      message = 'An account with that email already exists.';
    } else if (err.message && err.message.includes('unique_user_category')) {
      message = 'A category with this name already exists.';
    }
    return res.status(400).json({ success: false, message });
  }

  // PostgreSQL Invalid UUID format
  if (err.code === '22P02') {
    return res.status(404).json({ success: false, message: 'Resource not found: invalid ID format' });
  }

  // Supabase single row not found
  if (err.code === 'PGRST116') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced entity not found or constraint violated' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Internal Error'
  });
};

module.exports = errorHandler;
