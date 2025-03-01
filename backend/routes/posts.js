const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkNotBanned } = require('../middleware/moderation');
const posts = require('../api/posts.js');

// Middleware to check if the user is authenticated for protected routes
router.use(authenticateToken);

// Get all posts (with optional filtering)
router.get('/', async (req, res) => {
  await posts.getPosts(req, res);
});

// Get a specific post by ID
router.get('/:id', async (req, res) => {
  await posts.getPost(req, res);
});

// Get posts for a specific community
router.get('/community/:communityId', checkNotBanned, async (req, res) => {
  req.params.communityId = req.params.communityId;
  await posts.getCommunityPosts(req, res);
});

// Get posts for a specific user
router.get('/user/:userId', async (req, res) => {
  await posts.getUserPosts(req, res);
});

// Create a new post
router.post('/', authenticateToken, posts.canPostInCommunity, async (req, res) => {
  await posts.createPost(req, res);
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  await posts.updatePost(req, res);
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  await posts.deletePost(req, res);
});

module.exports = router;
