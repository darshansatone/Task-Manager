// api/index.js — Vercel Serverless Entry Point
// This wraps the Express app for Vercel's serverless environment.
// All /api/* requests are routed here by vercel.json

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

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

// API Routes — all mounted under /api
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stats', statsRoutes);

// API 404 Handler
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorHandler);

// Export for Vercel (serverless handler)
module.exports = app;
