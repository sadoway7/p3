// backend/api/posts_enhanced.js
const { v4: uuidv4 } = require('uuid');
const mariadb = require('mariadb');
const dotenv = require('dotenv');

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Function to get community ID from post ID (needed for permission checks)
const getCommunityIdFromPost = async (postId) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const [post] = await conn.query(
            "SELECT community_id FROM posts WHERE id = ?",
            [postId]
        );
        return post ? post.community_id : null;
    } catch (error) {
        console.error("Error fetching community ID from post:", error);
        throw new Error('Failed to fetch community ID from post');
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced post creation with moderation support
const createPostEnhanced = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const { title, content, communityId } = req.body;
        const userId = req.user.id;
        
        // Validate required fields
        if (!title || !content || !communityId) {
            return res.status(400).json({ message: 'Title, content, and communityId are required' });
        }
        
        // Check if community exists
        const [community] = await conn.query(
            "SELECT * FROM communities WHERE id = ?",
            [communityId]
        );
        
        if (!community) {
            return res.status(404).json({ message: 'Community not found' });
        }
        
        // Start a transaction
        await conn.beginTransaction();
        
        try {
            // Check if user is banned from the community
            const { isUserBanned } = require('./moderation');
            const banned = await isUserBanned(communityId, userId);
            
            if (banned) {
                return res.status(403).json({ message: 'You are banned from this community and cannot create posts' });
            }
            
            // Get community settings
            const { getEnhancedCommunitySettings } = require('./moderation');
            const settings = await getEnhancedCommunitySettings(communityId);
            
            // Create the post
            const id = uuidv4();
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await conn.query(
                "INSERT INTO posts (id, title, content, user_id, community_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [id, title, content, userId, communityId, now, now]
            );
            
            // If post approval is required, add to moderation queue
            let requiresApproval = false;
            if (settings && settings.require_post_approval) {
                const { addPostToModQueue } = require('./moderation');
                await addPostToModQueue(id);
                requiresApproval = true;
            }
            
            // Commit the transaction
            await conn.commit();
            
            // Get the created post with user information
            const [newPost] = await conn.query(`
                SELECT p.*, u.username
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `, [id]);
            
            // Format the post for the frontend
            const formattedPost = {
                id: newPost.id,
                title: newPost.title,
                content: newPost.content,
                username: newPost.username || 'Anonymous',
                userId: newPost.user_id,
                communityId: newPost.community_id,
                timestamp: newPost.created_at,
                comments: 0,
                votes: 0,
                pending_approval: requiresApproval
            };
            
            res.status(201).json(formattedPost);
        } catch (error) {
            // Rollback the transaction if anything goes wrong
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ message: 'Error creating post' });
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced get posts with moderation support
const getPostsEnhanced = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get community filter if provided
        const communityId = req.query.communityId;
        const userId = req.user ? req.user.id : null;
        
        // Get community settings if community filter is provided
        let requiresApproval = false;
        let isModerator = false;
        
        if (communityId && userId) {
            const { getEnhancedCommunitySettings, isUserModerator } = require('./moderation');
            const settings = await getEnhancedCommunitySettings(communityId);
            requiresApproval = settings && settings.require_post_approval;
            isModerator = await isUserModerator(communityId, userId);
        }
        
        // Build the query based on whether a community filter is provided
        let query = `
            SELECT p.*, u.username, 
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
                   COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
        `;
        
        if (communityId) {
            query += " WHERE p.community_id = ?";
            
            // If community requires post approval and user is not a moderator, only show approved posts
            if (requiresApproval && !isModerator) {
                query = `
                    SELECT p.*, u.username, 
                           (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
                           COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
                    FROM posts p
                    LEFT JOIN users u ON p.user_id = u.id
                    LEFT JOIN post_moderation pm ON p.id = pm.post_id
                    WHERE p.community_id = ? AND (pm.status = 'approved' OR pm.status IS NULL OR p.user_id = ?)
                `;
            }
        }
        
        query += " ORDER BY p.created_at DESC";
        
        // Execute the query with appropriate parameters
        let posts;
        if (communityId) {
            if (requiresApproval && !isModerator && userId) {
                posts = await conn.query(query, [communityId, userId]);
            } else {
                posts = await conn.query(query, [communityId]);
            }
        } else {
            posts = await conn.query(query);
        }
        
        // Get moderation status for posts if needed
        let formattedPosts = await Promise.all(posts.map(async (post) => {
            let pending_approval = false;
            
            if (requiresApproval) {
                const { getPostModerationStatus } = require('./moderation');
                const modStatus = await getPostModerationStatus(post.id);
                pending_approval = modStatus && modStatus.status === 'pending';
            }
            
            return {
                id: post.id,
                title: post.title,
                content: post.content,
                username: post.username || 'Anonymous',
                userId: post.user_id,
                communityId: post.community_id,
                timestamp: post.created_at,
                comments: post.comments || 0,
                votes: post.votes || 0,
                pending_approval: pending_approval
            };
        }));
        
        res.status(200).json(formattedPosts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: 'Error fetching posts' });
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced get single post with moderation support
const getPostEnhanced = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const postId = req.params.id;
        const userId = req.user ? req.user.id : null;
        
        // Get the post with additional info
        const [post] = await conn.query(`
            SELECT p.*, u.username, 
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
                   COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [postId]);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check moderation status
        let pending_approval = false;
        let rejected = false;
        let rejection_reason = null;
        
        if (userId) {
            const { getEnhancedCommunitySettings, getPostModerationStatus, isUserModerator } = require('./moderation');
            const settings = await getEnhancedCommunitySettings(post.community_id);
            
            if (settings && settings.require_post_approval) {
                const modStatus = await getPostModerationStatus(postId);
                
                // If post is pending approval
                if (modStatus && modStatus.status === 'pending') {
                    const isModerator = await isUserModerator(post.community_id, userId);
                    
                    // If user is not the author or a moderator, hide the post
                    if (post.user_id !== userId && !isModerator) {
                        return res.status(403).json({ message: 'Post is pending moderator approval' });
                    }
                    
                    pending_approval = true;
                }
                
                // If post was rejected
                if (modStatus && modStatus.status === 'rejected') {
                    const isModerator = await isUserModerator(post.community_id, userId);
                    
                    // If user is not the author or a moderator, hide the post
                    if (post.user_id !== userId && !isModerator) {
                        return res.status(403).json({ message: 'Post has been removed by moderators' });
                    }
                    
                    rejected = true;
                    rejection_reason = modStatus.reason;
                }
            }
        }
        
        // Format the post for the frontend
        const formattedPost = {
            id: post.id,
            title: post.title,
            content: post.content,
            username: post.username || 'Anonymous',
            userId: post.user_id,
            communityId: post.community_id,
            timestamp: post.created_at,
            comments: post.comments || 0,
            votes: post.votes || 0,
            pending_approval,
            rejected,
            rejection_reason
        };
        
        res.status(200).json(formattedPost);
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ message: 'Error fetching post' });
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced update post with moderation support
const updatePostEnhanced = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const { title, content } = req.body;
        const postId = req.params.id;
        const userId = req.user.id;
        
        // Check if post exists
        const [post] = await conn.query(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is the author or a moderator
        let isModeratorAction = false;
        
        if (post.user_id !== userId) {
            // Check moderator permissions
            const { isUserModerator, hasModeratorPermission } = require('./moderation');
            const isModerator = await isUserModerator(post.community_id, userId);
            const canManagePosts = await hasModeratorPermission(post.community_id, userId, 'can_manage_posts');
            
            if (!isModerator || !canManagePosts) {
                return res.status(403).json({ message: 'You do not have permission to update this post' });
            }
            
            isModeratorAction = true;
        }
        
        // Update the post
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await conn.query(
            "UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?",
            [title, content, now, postId]
        );
        
        // If it's a moderator action, log it
        if (isModeratorAction) {
            const { createModerationLog } = require('./moderation');
            await createModerationLog(
                post.community_id,
                userId,
                'edit_post',
                postId,
                'post',
                'Post edited by moderator'
            );
        }
        
        // Get the updated post with user information
        const [updatedPost] = await conn.query(`
            SELECT p.*, u.username, 
                   (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
                   COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [postId]);
        
        // Check moderation status
        const { getPostModerationStatus } = require('./moderation');
        const modStatus = await getPostModerationStatus(postId);
        
        // Format the post for the frontend
        const formattedPost = {
            id: updatedPost.id,
            title: updatedPost.title,
            content: updatedPost.content,
            username: updatedPost.username || 'Anonymous',
            userId: updatedPost.user_id,
            communityId: updatedPost.community_id,
            timestamp: updatedPost.created_at,
            comments: updatedPost.comments || 0,
            votes: updatedPost.votes || 0,
            pending_approval: modStatus && modStatus.status === 'pending',
            rejected: modStatus && modStatus.status === 'rejected',
            rejection_reason: modStatus && modStatus.status === 'rejected' ? modStatus.reason : null
        };
        
        res.status(200).json(formattedPost);
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ message: 'Error updating post' });
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced delete post with moderation support
const deletePostEnhanced = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const postId = req.params.id;
        const userId = req.user.id;
        
        // Check if post exists
        const [post] = await conn.query(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is the author or a moderator
        let isModeratorAction = false;
        
        if (post.user_id !== userId) {
            // Check moderator permissions
            const { isUserModerator, hasModeratorPermission } = require('./moderation');
            const isModerator = await isUserModerator(post.community_id, userId);
            const canManagePosts = await hasModeratorPermission(post.community_id, userId, 'can_manage_posts');
            
            if (!isModerator || !canManagePosts) {
                return res.status(403).json({ message: 'You do not have permission to delete this post' });
            }
            
            isModeratorAction = true;
        }
        
        // Start a transaction
        await conn.beginTransaction();
        
        try {
            // Delete comments associated with the post
            await conn.query(
                "DELETE FROM comments WHERE post_id = ?",
                [postId]
            );
            
            // Delete votes associated with the post
            await conn.query(
                "DELETE FROM votes WHERE post_id = ?",
                [postId]
            );
            
            // Delete from moderation queue if present
            await conn.query(
                "DELETE FROM post_moderation WHERE post_id = ?",
                [postId]
            );
            
            // Delete the post
            await conn.query(
                "DELETE FROM posts WHERE id = ?",
                [postId]
            );
            
            // If it's a moderator action, log it
            if (isModeratorAction) {
                const { createModerationLog } = require('./moderation');
                await createModerationLog(
                    post.community_id,
                    userId,
                    'remove_post',
                    postId,
                    'post',
                    'Post removed by moderator'
                );
            }
            
            // Commit the transaction
            await conn.commit();
            
            res.status(204).send();
        } catch (error) {
            // Rollback the transaction if anything goes wrong
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ message: 'Error deleting post' });
    } finally {
        if (conn) conn.release();
    }
};

// Enhanced moderator specific functions
const getPendingPosts = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const communityId = req.params.communityId;
        const userId = req.user.id;
        
        // Check if user is a moderator with post management permissions
        const { isUserModerator, hasModeratorPermission } = require('./moderation');
        const isModerator = await isUserModerator(communityId, userId);
        const canManagePosts = await hasModeratorPermission(communityId, userId, 'can_manage_posts');
        
        if (!isModerator || !canManagePosts) {
            return res.status(403).json({ message: 'You do not have permission to view pending posts' });
        }
        
        // Get pending posts for the community
        const pendingPosts = await conn.query(`
            SELECT p.*, u.username, pm.created_at as queued_at
            FROM posts p
            JOIN post_moderation pm ON p.id = pm.post_id
            JOIN users u ON p.user_id = u.id
            WHERE p.community_id = ? AND pm.status = 'pending'
            ORDER BY pm.created_at ASC
        `, [communityId]);
        
        // Format the posts for the frontend
        const formattedPosts = pendingPosts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            username: post.username || 'Anonymous',
            userId: post.user_id,
            communityId: post.community_id,
            timestamp: post.created_at,
            queuedAt: post.queued_at
        }));
        
        res.status(200).json(formattedPosts);
    } catch (error) {
        console.error("Error fetching pending posts:", error);
        res.status(500).json({ message: 'Error fetching pending posts' });
    } finally {
        if (conn) conn.release();
    }
};

const moderatePostAction = async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const postId = req.params.postId;
        const { action, reason } = req.body;
        const userId = req.user.id;
        
        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
        }
        
        // Get the post to check permissions
        const [post] = await conn.query(
            "SELECT * FROM posts WHERE id = ?",
            [postId]
        );
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is a moderator with post management permissions
        const { isUserModerator, hasModeratorPermission, moderatePost } = require('./moderation');
        const isModerator = await isUserModerator(post.community_id, userId);
        const canManagePosts = await hasModeratorPermission(post.community_id, userId, 'can_manage_posts');
        
        if (!isModerator || !canManagePosts) {
            return res.status(403).json({ message: 'You do not have permission to moderate posts' });
        }
        
        // Perform the moderation action
        await moderatePost(postId, userId, action, reason);
        
        res.status(200).json({ 
            message: `Post ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            postId
        });
    } catch (error) {
        console.error("Error moderating post:", error);
        res.status(500).json({ message: 'Error moderating post' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    getCommunityIdFromPost,
    createPostEnhanced,
    getPostsEnhanced,
    getPostEnhanced,
    updatePostEnhanced,
    deletePostEnhanced,
    getPendingPosts,
    moderatePostAction
};