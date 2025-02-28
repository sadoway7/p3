const express = require('express');
const router = express.Router();
const comments = require('../api/comments.js');

// Comments API
router.get('/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    try {
        const threaded = req.query.threaded === 'true';
        
        if (threaded) {
            const threadedComments = await comments.getThreadedComments(postId);
            res.json(threadedComments);
        } else {
            const allComments = await comments.getPostComments(postId);
            res.json(allComments);
        }
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

router.get('/:commentId', async (req, res) => {
    const { commentId } = req.params;
    try {
        const comment = await comments.getComment(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.json(comment);
    } catch (error) {
        console.error("Error fetching comment:", error);
        res.status(500).json({ error: 'Failed to fetch comment' });
    }
});

router.post('/posts/:postId', async (req, res) => {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;
    
    try {
        const commentData = {
            content,
            post_id: postId,
            parent_comment_id: parentCommentId
        };
        
        const newComment = await comments.createComment(userId, commentData);
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

router.put('/:commentId', async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    try {
        const updatedComment = await comments.updateComment(commentId, userId, content);
        if (!updatedComment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.json(updatedComment);
    } catch (error) {
        console.error("Error updating comment:", error);
        if (error.message === 'You can only update your own comments') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

router.delete('/:commentId', async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    try {
        const success = await comments.deleteComment(commentId, userId);
        if (!success) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting comment:", error);
        if (error.message === 'You can only delete your own comments') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

router.get('/:commentId/replies', async (req, res) => {
    const { commentId } = req.params;
    try {
        const replies = await comments.getCommentReplies(commentId);
        res.json(replies);
    } catch (error) {
        console.error("Error fetching comment replies:", error);
        res.status(500).json({ error: 'Failed to fetch comment replies' });
    }
});

module.exports = router;
