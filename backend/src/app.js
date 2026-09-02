const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { db } = require('./config/database');
const apiRoutes = require('./routes');

const app = express();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}

if (process.env.NODE_ENV === 'production' && (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME)) {
  throw new Error('DB_USER, DB_PASSWORD, and DB_NAME must be configured in production.');
}

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';
const rawClientUrl = process.env.CLIENT_URL;

if (isProduction && !rawClientUrl) {
  throw new Error('CLIENT_URL must be configured in production.');
}

const allowedOrigins = rawClientUrl
  ? rawClientUrl.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Local development: allow localhost, 127.0.0.1, ngrok tunnels, or configured CLIENT_URL
      if (!isProduction) {
        if (
          normalizedOrigin.includes('localhost') ||
          normalizedOrigin.includes('127.0.0.1') ||
          normalizedOrigin.includes('ngrok') ||
          allowedOrigins.includes(normalizedOrigin)
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      }

      // Production: strictly enforce CLIENT_URL
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  })
);

const path = require('path');

// Body Parsing Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve Uploaded Files & Static Assets
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

// General Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return res.status(200).json({
      success: true,
      message: 'SocialDesk API is running',
      database: 'connected',
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: 'SocialDesk API is running',
      database: 'disconnected',
    });
  }
});

// Mount API Architecture Routes
app.use('/api', apiRoutes);

// 404 Handler for Unknown API Routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    success: false,
    message:
      isProduction && statusCode === 500
        ? 'Internal server error'
        : err.message || 'Internal server error',
  };

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

module.exports = app;
