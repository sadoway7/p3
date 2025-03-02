const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Import route modules
const authRoutes = require('./routes/auth');
const communitiesRoutes = require('./routes/communities');
const communitiesFixRoutes = require('./routes/communities-fix'); // Import our fixed routes
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
const port = process.env.PORT || 3001; // Use a different port from the frontend

// Global middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

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

// Mount the routes
// Add activity logging middleware to auth routes
app.use('/api/auth/login', logUserLogin);
app.use('/api/auth/register', logUserRegistration);
app.use('/api/auth/logout', authenticateOptional, logUserLogout);
app.use('/api/auth', authRoutes.router);

// Use our fixed communities routes instead of the original ones
app.use('/api/communities', authenticateOptional, communitiesFixRoutes);

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

// Root route
app.get('/', (req, res) => {
  res.send('Hello from Express backend!');
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

// Start the server
app.listen(port, () => {
  console.log(`Backend server (fixed version) listening at http://localhost:${port}`);
});