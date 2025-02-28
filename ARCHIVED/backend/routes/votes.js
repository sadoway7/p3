const express = require('express');
const router = express.Router();
const { voteOnPost, voteOnComment, getUserPostVote, getUserCommentVote } = require('../api/votes');

// Middleware for authentication (assuming it's defined elsewhere)
const { authenticateToken } = require('../middleware/auth');

// Vote on a post
router.post('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { value } = req.body;
    const userId = req.user.id;
    
    const result = await voteOnPost(userId, postId, value);
    res.json(result);
  } catch (error) {
    console.error('Error voting on post:', error);
    res.status(400).json({ error: error.message });
  }
});

// Vote on a comment
router.post('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { value } = req.body;
    const userId = req.user.id;
    
    const result = await voteOnComment(userId, commentId, value);
    res.json(result);
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user's vote on a post
router.get('/posts/:postId/user', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    const value = await getUserPostVote(userId, postId);
    res.json({ value });
  } catch (error) {
    console.error('Error getting user post vote:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user's vote on a comment
router.get('/comments/:commentId/user', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    const value = await getUserCommentVote(userId, commentId);
    res.json({ value });
  } catch (error) {
    console.error('Error getting user comment vote:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;