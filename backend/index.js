const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Import route modules
const authRoutes = require('./routes/auth');
const communitiesRoutes = require('./routes/communities');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const votesRoutes = require('./routes/votes');
const activityRoutes = require('./routes/activity');
const communityMembersRoutes = require('./routes/community-members');

// Import activity logging middleware
const {
  logUserLogin,
  logUserRegistration,
  logUserLogout
} = require('./middleware/activity');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS Configuration - More specific for production
const corsOptions = {
  origin: function(origin, callback) {
    // Log the request origin for debugging
    console.log('Request origin:', origin);

    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // For production, check against allowed domains
    const allowedOrigins = [
      'http://localhost:3000',
      'https://rumfor.com',
      'https://l2.sadoway.ca',
      // Add the actual Docker service hostname (container name by default)
      'http://rumfor-app:3000',
      // Allow same-origin requests (null origin)
      null
    ];

    // Use the FRONTEND_URL from environment if set
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Check if the request origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS with our custom configuration
app.use(cors(corsOptions));
app.use(express.json());

// Fix for BigInt serialization
BigInt.prototype.toJSON = function() {
    return this.toString();
};

// Get the authenticateToken middleware from auth routes
const { authenticateToken } = authRoutes;
const { canViewCommunity, isCommunityModerator } = communitiesRoutes;
const { canPostInCommunity } = postsRoutes;

// Authentication middleware for protected routes that allows anonymous access
const authenticateOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Continue without authentication
    req.user = null;
    next();
    return;
  }

  try {
    const user = require('./api/auth').verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    // Log token error for debugging (but don't expose details to client)
    console.error('Token validation error:', error.message);

    // Clear any partial authentication data
    req.user = null;

    // Continue without authentication
    next();
  }
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't expose internal server error details in production
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode
    }
  });
};

// Add simple request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount the routes
// Add activity logging middleware to auth routes
app.use('/api/auth/login', logUserLogin);
app.use('/api/auth/register', logUserRegistration);
app.use('/api/auth/logout', authenticateOptional, logUserLogout);
app.use('/api/auth', authRoutes.router);

// For communities routes, use optional authentication
app.use('/api/communities', authenticateOptional, communitiesRoutes.router);

// Register community members routes
app.use('/api', authenticateToken, communityMembersRoutes);

// For posts routes, use optional authentication
app.use('/api/posts', authenticateOptional, postsRoutes.router);

// For comments routes, use optional authentication
app.use('/api/comments', authenticateOptional, commentsRoutes);

// For users routes, use optional authentication
app.use('/api/users', authenticateOptional, usersRoutes);

// For votes routes, use optional authentication
app.use('/api/votes', authenticateOptional, votesRoutes);

// For activity routes, use authenticated routes only
app.use('/api/activity', authenticateToken, activityRoutes);

// Root route with some useful info
app.get('/', (req, res) => {
  res.json({
    message: 'Rumfor API Server',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Add error handling middleware
app.use(errorHandler);

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      status: 404
    }
  });
});

// Start the server - BINDING TO ALL INTERFACES (0.0.0.0) INSTEAD OF JUST LOCALHOST
const host = process.env.HOST || '0.0.0.0'; // Use HOST env var if set, otherwise bind to all interfaces
app.listen(port, host, () => {
  console.log(`Backend server listening at http://${host}:${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  if (process.env.FRONTEND_URL) {
    console.log('Frontend URL:', process.env.FRONTEND_URL);
  }
});