// Simplified fix for the communities router
const express = require('express');
const router = express.Router();
const { createCommunity } = require('../api/community-create-fix-simple');
const communitiesRoutes = require('./communities');

// Use our fixed route handler for POST /api/communities
router.post('/', createCommunity);

// For all other routes, pass through to the original router
router.use('/', (req, res, next) => {
  // Skip the POST route since we have our own implementation
  if (req.method === 'POST' && req.path === '/') {
    return next('route');
  }
  // Forward to the original router
  communitiesRoutes.router(req, res, next);
});

module.exports = router;