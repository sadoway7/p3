// Fix for community creation routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createCommunity } = require('../api/community-create-fix');

// Import other community handlers from the original file
const communitiesHandler = require('../api/communities');

// Override the community creation route to use our fixed handler
router.post('/', createCommunity);

// Re-export all the other routes from the original API
router.get('/', async (req, res) => {
  try {
    const communities = await communitiesHandler.getCommunities();
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const community = await communitiesHandler.getCommunity(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(community);
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// Add other community routes as needed
// These are just pass-through to the original handlers

module.exports = router;