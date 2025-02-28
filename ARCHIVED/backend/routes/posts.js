const express = require('express');
const router = express.Router();
const mariadb = require('mariadb');
const dotenv = require('dotenv');
const posts = require('../api/posts.js');

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Check if user can post in a community (must be a member)
const canPostInCommunity = async (req, res, next) => {
    const communityId = req.body.communityId;
    const userId = req.user.id;
    
    if (!communityId) {
        return next(); // Profile post, no community check needed
    }
    
    let conn;
    try {
        conn = await pool.getConnection();
        const [membership] = await conn.query(
            "SELECT * FROM community_members WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!membership) {
            return res.status(403).json({ error: 'You must be a member of this community to post' });
        }
        
        next();
    } catch (error) {
        console.error("Error checking community membership:", error);
        return res.status(500).json({ error: 'Failed to check community membership' });
    } finally {
        if (conn) conn.end();
    }
};

// Posts API
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if we need to filter by community or user profile
        const communityId = req.query.communityId;
        const userProfileId = req.query.userProfileId;
        
        let query = "SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id";
        const params = [];
        
        if (communityId) {
            query += " WHERE p.community_id = ?";
            params.push(communityId);
        } else if (userProfileId) {
            query += " WHERE p.user_profile_id = ? OR p.user_id = ?";
            params.push(userProfileId, userProfileId);
        }
        
        query += " ORDER BY p.created_at DESC";
        
        const posts = await conn.query(query, params);
        res.json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    } finally {
        if (conn) conn.end();
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const [post] = await conn.query("SELECT * FROM posts WHERE id = ?", [id]);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ error: 'Failed to fetch post' });
    } finally {
        if (conn) conn.end();
    }
});

router.post('/', canPostInCommunity, async (req, res) => {
    const { title, content, communityId, userProfileId, isProfilePost } = req.body;
    const authorId = req.user.id;
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Determine if this is a profile post
        const profilePost = isProfilePost || !!userProfileId;
        
        // Build the query based on whether this is a community post or profile post
        let query = "INSERT INTO posts (title, content, user_id";
        const params = [title, content, authorId];
        
        if (communityId) {
            query += ", community_id, profile_post) VALUES (?, ?, ?, ?, ?)";
            params.push(communityId, profilePost);
        } else if (userProfileId) {
            query += ", user_profile_id, profile_post) VALUES (?, ?, ?, ?, ?)";
            params.push(userProfileId, profilePost);
        } else {
            query += ", profile_post) VALUES (?, ?, ?, ?)";
            params.push(profilePost);
        }
        
        const result = await conn.query(query, params);
        
        const [newPost] = await conn.query("SELECT * FROM posts WHERE id = ?", [result.insertId]);
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: 'Failed to create post' });
    } finally {
        if (conn) conn.end();
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is the author of the post
        const [post] = await conn.query("SELECT * FROM posts WHERE id = ?", [id]);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        if (post.user_id !== userId) {
            return res.status(403).json({ error: 'You can only edit your own posts' });
        }
        
        await conn.query(
            "UPDATE posts SET title = ?, content = ?, updated_at = NOW() WHERE id = ?",
            [title, content, id]
        );
        
        const [updatedPost] = await conn.query("SELECT * FROM posts WHERE id = ?", [id]);
        res.json(updatedPost);
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: 'Failed to update post' });
    } finally {
        if (conn) conn.end();
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is the author of the post or a community moderator
        const [post] = await conn.query("SELECT * FROM posts WHERE id = ?", [id]);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        if (post.user_id !== userId) {
            // Check if user is a moderator of the community
            const [membership] = await conn.query(
                "SELECT * FROM community_members WHERE community_id = ? AND user_id = ? AND role = 'moderator'",
                [post.community_id, userId]
            );
            
            if (!membership) {
                return res.status(403).json({ error: 'You can only delete your own posts or posts in communities you moderate' });
            }
        }
        
        await conn.query("DELETE FROM posts WHERE id = ?", [id]);
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: 'Failed to delete post' });
    } finally {
        if (conn) conn.end();
    }
});

module.exports = {
    router,
    canPostInCommunity
};
