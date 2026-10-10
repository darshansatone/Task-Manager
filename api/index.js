// api/index.js — Vercel Serverless Entry Point
// Routes ALL requests through Express (API + Static files)
// This is the most reliable approach for Express on Vercel

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables (works locally; Vercel uses dashboard env vars)
dotenv.config({ path: path.join(__dirname, '../.env') });

// Fallback secrets so the app doesn't crash if env vars are missing on Vercel
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'taskmaster_fallback_jwt_secret_please_set_in_vercel';
}

// Route Handlers
const authRoutes = require('../server/routes/authRoutes');
const taskRoutes = require('../server/routes/taskRoutes');
const categoryRoutes = require('../server/routes/categoryRoutes');
const statsRoutes = require('../server/routes/statsRoutes');

// Error Middleware
const errorHandler = require('../server/middleware/errorHandler');

const app = express();

// Core Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes (handled before static files) ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stats', statsRoutes);

// ─── API 404 Handler ─────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// ─── Serve Static Frontend Files ─────────────────────────────────────────────
// Serves everything inside /public at the root URL
app.use(express.static(path.join(__dirname, '../public')));

// ─── Friendly Route Aliases (without .html) ──────────────────────────────────
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/forgot-password.html'));
});

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Fallback — serve index.html for unknown routes ──────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// Export for Vercel (no app.listen needed — Vercel handles it)
module.exports = app;
