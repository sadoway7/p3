const express = require('express');
const router = express.Router();
const { 
  voteOnPost, 
  voteOnComment, 
  getUserPostVote, 
  getUserCommentVote,
  getPostVoteCounts,
  getCommentVoteCounts,
  getUserVotes
} = require('../api/votes.js.new');

// Middleware for authentication and ban checking
const { authenticateToken } = require('../middleware/auth');
const { checkNotBanned } = require('../middleware/moderation');

// Vote on a post
router.post('/posts/:postId', authenticateToken, checkNotBanned, async (req, res) => {
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
router.post('/comments/:commentId', authenticateToken, checkNotBanned, async (req, res) => {
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

// Get user's vote on a post - plural form
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

// Get user's vote on a post - singular form for compatibility
router.get('/post/:postId/user', authenticateToken, async (req, res) => {
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

// Get vote counts for a post
router.get('/posts/:postId/counts', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const counts = await getPostVoteCounts(postId);
    res.json(counts);
  } catch (error) {
    console.error('Error getting post vote counts:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get vote counts for a comment
router.get('/comments/:commentId/counts', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const counts = await getCommentVoteCounts(commentId);
    res.json(counts);
  } catch (error) {
    console.error('Error getting comment vote counts:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all votes for a user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the user is requesting their own votes
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own votes' });
    }
    
    const votes = await getUserVotes(userId);
    res.json(votes);
  } catch (error) {
    console.error('Error getting user votes:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get current user's votes
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const votes = await getUserVotes(userId);
    res.json(votes);
  } catch (error) {
    console.error('Error getting user votes:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;