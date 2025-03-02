import { v4 as uuidv4 } from 'uuid';
import express, { Request, Response, NextFunction } from 'express';
import mariadb from 'mariadb';
import cors from 'cors';
// Temporary imports to force tsc to compile api files
import * as posts from './api/posts';
// Removed conflicting import
import * as users from './api/users';
import * as auth from './api/auth';
import * as commentsApi from './api/comments';


const app = express();

const port = 3001; // Use a different port from the frontend



import dotenv from 'dotenv';

dotenv.config();



const pool = mariadb.createPool({

     host: process.env.DB_HOST,

     port: Number(process.env.DB_PORT),

     user: process.env.DB_USER,

     password: process.env.DB_PASSWORD,

     database: process.env.DB_NAME,

     connectionLimit: 5

});



// Import API functions

import {

    getCommunities,

    getCommunity,

    createCommunity,

    updateCommunity,

    deleteCommunity,

    getCommunityRules,

    addCommunityRule,

    updateCommunityRule,

    deleteCommunityRule,

    getCommunitySettings,

    updateCommunitySettings,

    getCommunityMembers,

    addCommunityMember,

    updateCommunityMemberRole,

    removeCommunityMember,

    getCommunityAbout,

    getUserCommunities,

    searchCommunities

} from './api/communities';



import {

    register,

    login,

    getCurrentUser,

    verifyToken

} from './api/auth';



// Route Handlers

app.use(express.json());

app.use(cors()); // Enable CORS for all routes



// Authentication middleware

interface AuthRequest extends Request {

    user?: any;

}



const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {

    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    

    if (!token) {

        res.status(401).json({ error: 'Authentication required' });

        return;

    }

    

    try {

        const user = verifyToken(token);

        req.user = user;

        next();

    } catch (error) {

        res.status(403).json({ error: 'Invalid or expired token' });

        return;

    }

};



// Check if user is a community moderator

const isCommunityModerator = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

    const communityId = req.params.id;

    const userId = req.user.id;

    

    let conn;

    try {

        conn = await pool.getConnection();

        const [membership] = await conn.query(

            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'",

            [communityId, userId]

        );

        

        if (!membership) {

            res.status(403).json({ error: 'Moderator access required' });

            return;

        }

        

        next();

    } catch (error) {

        console.error("Error checking moderator status:", error);

        res.status(500).json({ error: 'Failed to check moderator status' });

        return;

    } finally {

        if (conn) conn.end();

    }

};



// Check if user can view a community (public or member of private)

const canViewCommunity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

    const communityId = req.params.id;

    const userId = req.user?.id; // Optional, might be unauthenticated

    

    let conn;

    try {

        conn = await pool.getConnection();

        const [community] = await conn.query(

            "SELECT * FROM community WHERE id = ?",

            [communityId]

        );

        

        if (!community) {

            res.status(404).json({ error: 'Community not found' });

            return;

        }

        

        // Public communities are visible to everyone

        if (community.privacy === 'public') {

            next();

            return;

        }

        

        // Private communities require membership

        if (!userId) {

            res.status(401).json({ error: 'Authentication required' });

            return;

        }

        

        const [membership] = await conn.query(

            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",

            [communityId, userId]

        );

        

        if (!membership) {

            res.status(403).json({ error: 'Membership required' });

            return;

        }

        

        next();

    } catch (error) {

        console.error("Error checking community access:", error);

        res.status(500).json({ error: 'Failed to check community access' });

        return;

    } finally {

        if (conn) conn.end();

    }

};



// Check if user can post in a community (must be a member)

const canPostInCommunity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

    const communityId = req.body.communityId;

    const userId = req.user.id;

    

    if (!communityId) {

        next(); // Profile post, no community check needed

        return;

    }

    

    let conn;

    try {

        conn = await pool.getConnection();

        const [membership] = await conn.query(

            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",

            [communityId, userId]

        );

        

        if (!membership) {

            res.status(403).json({ error: 'You must be a member of this community to post' });

            return;

        }

        

        next();

    } catch (error) {

        console.error("Error checking community membership:", error);

        res.status(500).json({ error: 'Failed to check community membership' });

        return;

    } finally {

        if (conn) conn.end();

    }

};



// Authentication routes

app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {

    const { username, email, password } = req.body;

    

    if (!username || !email || !password) {

        res.status(400).json({ error: 'Username, email, and password are required' });

        return;

    }

    

    try {

        const user = await register({ username, email, password });

        res.status(201).json(user);

    } catch (error: any) {

        console.error("Error registering user:", error);

        res.status(400).json({ error: error.message });

    }

});



app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {

    const { username, password } = req.body;

    

    if (!username || !password) {

        res.status(400).json({ error: 'Username and password are required' });

        return;

    }

    

    try {

        const result = await login({ username, password });

        res.json(result);

    } catch (error: any) {

        console.error("Error logging in:", error);

        res.status(401).json({ error: error.message });

    }

});



app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    try {

        const user = await getCurrentUser(req.user.id);

        res.json(user);

    } catch (error: any) {

        console.error("Error getting current user:", error);

        res.status(404).json({ error: error.message });

    }

});



// Communities API

app.get('/api/communities', async (req: Request, res: Response): Promise<void> => {

    try {

        const searchTerm = req.query.search as string;

        

        if (searchTerm) {

            const communities = await searchCommunities(searchTerm);

            res.json(communities);

        } else {

            const communities = await getCommunities();

            res.json(communities);

        }

    } catch (error) {

        console.error("Error fetching communities:", error);

        res.status(500).json({ error: 'Failed to fetch communities' });

    }

});



app.get('/api/communities/:id', canViewCommunity, async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const community = await getCommunity(id);

        if (!community) {

            res.status(404).json({ error: 'Community not found' });

            return;

        }

        res.json(community);

    } catch (error) {

        console.error("Error fetching community:", error);

        res.status(500).json({ error: 'Failed to fetch community' });

    }

});



app.post('/api/communities', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { name, description, privacy } = req.body;

    const userId = req.user.id;

    

    try {

        // Create the community

        const newCommunity = await createCommunity({ name, description, privacy });

        

        // Add the creator as a moderator

        await addCommunityMember(newCommunity.id, userId, 'moderator');

        

        res.status(201).json(newCommunity);

    } catch (error) {

        console.error("Error creating community:", error);

        res.status(500).json({ error: 'Failed to create community' });

    }

});



app.put('/api/communities/:id', authenticateToken, isCommunityModerator, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const { name, description, privacy } = req.body;

    const userId = req.user.id;

    try {

        const updatedCommunity = await updateCommunity(id, { name, description, privacy }, userId);

        if (!updatedCommunity) {

            res.status(404).json({ error: 'Community not found' });

            return;

        }

        res.json(updatedCommunity);

    } catch (error) {

        console.error("Error updating community:", error);

        res.status(500).json({ error: 'Failed to update community' });

    }

});



app.delete('/api/communities/:id', authenticateToken, isCommunityModerator, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const userId = req.user.id;

    try {

        const success = await deleteCommunity(id, userId);

        if (!success) {

            res.status(404).json({ error: 'Community not found' });

            return;

        }

        res.status(204).end();

    } catch (error) {

        console.error("Error deleting community:", error);

        res.status(500).json({ error: 'Failed to delete community' });

    }

});



// Community Rules API

app.get('/api/communities/:id/rules', canViewCommunity, async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const rules = await getCommunityRules(id);

        res.json(rules);

    } catch (error) {

        console.error("Error fetching community rules:", error);

        res.status(500).json({ error: 'Failed to fetch community rules' });

    }

});



app.post('/api/communities/:id/rules', authenticateToken, isCommunityModerator, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const { title, description } = req.body;

    const userId = req.user.id;

    try {

        const newRule = await addCommunityRule(id, { title, description }, userId);

        res.status(201).json(newRule);

    } catch (error) {

        console.error("Error adding community rule:", error);

        res.status(500).json({ error: 'Failed to add community rule' });

    }

});



app.put('/api/communities/:id/rules/:ruleId', authenticateToken, isCommunityModerator, async (req: AuthRequest, res: Response): Promise<void> => {

    const { ruleId } = req.params;

    const { title, description } = req.body;

    const userId = req.user.id;

    try {

        const updatedRule = await updateCommunityRule(ruleId, { title, description }, userId);

        if (!updatedRule) {

            res.status(404).json({ error: 'Rule not found' });

            return;

        }

        res.json(updatedRule);

    } catch (error) {

        console.error("Error updating community rule:", error);

        res.status(500).json({ error: 'Failed to update community rule' });

    }

});



app.delete('/api/communities/:id/rules/:ruleId', authenticateToken, isCommunityModerator, async (req: AuthRequest, res: Response): Promise<void> => {

    const { ruleId } = req.params;

    const userId = req.user.id;

    try {

        const success = await deleteCommunityRule(ruleId, userId);

        if (!success) {

            res.status(404).json({ error: 'Rule not found' });

            return;

        }

        res.status(204).end();

    } catch (error) {

        console.error("Error deleting community rule:", error);

        res.status(500).json({ error: 'Failed to delete community rule' });

    }

});



// Community Settings API

app.get('/api/communities/:id/settings', canViewCommunity, async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const settings = await getCommunitySettings(id);

        if (!settings) {

            res.status(404).json({ error: 'Settings not found' });

            return;

        }

        res.json(settings);

    } catch (error) {

        console.error("Error fetching community settings:", error);

        res.status(500).json({ error: 'Failed to fetch community settings' });

    }

});



app.put('/api/communities/:id/settings', authenticateToken, isCommunityModerator, async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    const { id } = req.params;

    const { allow_post_images, allow_post_links } = req.body;

    try {

        const userId = (req as any).user.id;

        const updatedSettings = await updateCommunitySettings(id, { allow_post_images, allow_post_links }, userId);

        if (!updatedSettings) {

            res.status(404).json({ error: 'Settings not found' });

            return;

        }

        res.json(updatedSettings);

    } catch (error) {

        console.error("Error updating community settings:", error);

        res.status(500).json({ error: 'Failed to update community settings' });

    }

});



// Community Members API

app.get('/api/communities/:id/members', canViewCommunity, async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const members = await getCommunityMembers(id);

        res.json(members);

    } catch (error) {

        console.error("Error fetching community members:", error);

        res.status(500).json({ error: 'Failed to fetch community members' });

    }

});



app.post('/api/communities/:id/members', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const userId = req.user.id; // User joins themselves

    try {

        const newMember = await addCommunityMember(id, userId, 'member');

        res.status(201).json(newMember);

    } catch (error) {

        console.error("Error adding community member:", error);

        res.status(500).json({ error: 'Failed to add community member' });

    }

});



app.put('/api/communities/:id/members/:userId', authenticateToken, isCommunityModerator, async (req: Request, res: Response): Promise<void> => {

    const { id, userId } = req.params;

    const { role } = req.body;

    try {

        const updatedBy = (req as any).user.id;

        const updatedMember = await updateCommunityMemberRole(id, userId, role, updatedBy);

        if (!updatedMember) {

            res.status(404).json({ error: 'Member not found' });

            return;

        }

        res.json(updatedMember);

    } catch (error) {

        console.error("Error updating community member role:", error);

        res.status(500).json({ error: 'Failed to update community member role' });

    }

});



app.delete('/api/communities/:id/members/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id, userId } = req.params;

    const currentUserId = req.user.id;

    

    // Check if user is removing themselves or is a moderator

    if (userId !== currentUserId) {

        let conn;

        try {

            conn = await pool.getConnection();

            const [membership] = await conn.query(

                "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'",

                [id, currentUserId]

            );

            

            if (!membership) {

                res.status(403).json({ error: 'You can only remove yourself unless you are a moderator' });

                return;

            }

        } catch (error) {

            console.error("Error checking moderator status:", error);

            res.status(500).json({ error: 'Failed to check moderator status' });

            return;

        } finally {

            if (conn) conn.end();

        }

    }

    

    try {

        const success = await removeCommunityMember(id, userId);

        if (!success) {

            res.status(404).json({ error: 'Member not found' });

            return;

        }

        res.status(204).end();

    } catch (error) {

        console.error("Error removing community member:", error);

        res.status(500).json({ error: 'Failed to remove community member' });

    }

});



// Community About API

app.get('/api/communities/:id/about', canViewCommunity, async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const about = await getCommunityAbout(id);

        if (!about) {

            res.status(404).json({ error: 'Community not found' });

            return;

        }

        res.json(about);

    } catch (error) {

        console.error("Error fetching community about:", error);

        res.status(500).json({ error: 'Failed to fetch community about' });

    }

});



// User Communities API

app.get('/api/users/:id/communities', async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    try {

        const communities = await getUserCommunities(id);

        res.json(communities);

    } catch (error) {

        console.error("Error fetching user communities:", error);

        res.status(500).json({ error: 'Failed to fetch user communities' });

    }

});



// Posts API

app.get('/api/posts', async (req: Request, res: Response): Promise<void> => {

    let conn;

    try {

        conn = await pool.getConnection();

        

        // Check if we need to filter by community or user profile

        const communityId = req.query.communityId as string;

        const userProfileId = req.query.userProfileId as string;

        

        let query = "SELECT p.*, u.username FROM post p JOIN user u ON p.user_id = u.id";

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



app.get('/api/posts/:id', async (req: Request, res: Response): Promise<void> => {

    const { id } = req.params;

    let conn;

    try {

        conn = await pool.getConnection();

        const [post] = await conn.query("SELECT * FROM post WHERE id = ?", [id]);

        if (!post) {

            res.status(404).json({ error: 'Post not found' });

            return;

        }

        res.json(post);

    } catch (error) {

        console.error("Error fetching post:", error);

        res.status(500).json({ error: 'Failed to fetch post' });

    } finally {

        if (conn) conn.end();

    }

});



app.post('/api/posts', authenticateToken, canPostInCommunity, async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, content, communityId, userProfileId, isProfilePost, id } = req.body;
    const authorId = req.user.id;
    
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Determine if this is a profile post
        const profilePost = isProfilePost || !!userProfileId;
        
        // Use provided ID from client or generate a new one
        const postId = id || uuidv4();
        console.log('Using post ID:', postId);

        // Build the query based on the available data
        let query;
        let params;
        
        if (communityId) {
            query = "INSERT INTO post (id, title, content, user_id, community_id, profile_post) VALUES (?, ?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, communityId, profilePost];
        } else if (userProfileId) {
            query = "INSERT INTO post (id, title, content, user_id, user_profile_id, profile_post) VALUES (?, ?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, userProfileId, profilePost];
        } else {
            query = "INSERT INTO post (id, title, content, user_id, profile_post) VALUES (?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, profilePost];
        }
        
        const result = await conn.query(query, params);
        
        const [newPost] = await conn.query("SELECT * FROM post WHERE id = ?", [postId]);
        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: 'Failed to create post' });
    } finally {
        if (conn) conn.end();
    }
});



app.put('/api/posts/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const { title, content } = req.body;

    const userId = req.user.id;

    

    let conn;

    try {

        conn = await pool.getConnection();

        

        // Check if user is the author of the post

        const [post] = await conn.query("SELECT * FROM post WHERE id = ?", [id]);

        

        if (!post) {

            res.status(404).json({ error: 'Post not found' });

            return;

        }

        

        if (post.user_id !== userId) {

            res.status(403).json({ error: 'You can only edit your own posts' });

            return;

        }

        

        await conn.query(

            "UPDATE post SET title = ?, content = ?, updated_at = NOW() WHERE id = ?",

            [title, content, id]

        );

        

        const [updatedPost] = await conn.query("SELECT * FROM post WHERE id = ?", [id]);

        res.json(updatedPost);

    } catch (error) {

        console.error("Error updating post:", error);

        res.status(500).json({ error: 'Failed to update post' });

    } finally {

        if (conn) conn.end();

    }

});



app.delete('/api/posts/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { id } = req.params;

    const userId = req.user.id;

    

    let conn;

    try {

        conn = await pool.getConnection();

        

        // Check if user is the author of the post or a community moderator

        const [post] = await conn.query("SELECT * FROM post WHERE id = ?", [id]);

        

        if (!post) {

            res.status(404).json({ error: 'Post not found' });

            return;

        }

        

        if (post.user_id !== userId) {

            // Check if user is a moderator of the community

            const [membership] = await conn.query(

                "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'",

                [post.community_id, userId]

            );

            

            if (!membership) {

                res.status(403).json({ error: 'You can only delete your own posts or posts in communities you moderate' });

                return;

            }

        }

        

        await conn.query("DELETE FROM post WHERE id = ?", [id]);

        res.status(204).end();

    } catch (error) {

        console.error("Error deleting post:", error);

        res.status(500).json({ error: 'Failed to delete post' });

    } finally {

        if (conn) conn.end();

    }

});



app.get('/', (req: Request, res: Response): void => {

  res.send('Hello from Express backend!');

});



// Comments API

app.get('/api/posts/:postId/comments', async (req: Request, res: Response): Promise<void> => {

    const { postId } = req.params;

    try {

        const threaded = req.query.threaded === 'true';

        

        if (threaded) {

            const commentsList = await commentsApi.getThreadedComments(postId);

            res.json(commentsList);

        } else {

            const allComments = await commentsApi.getPostComments(postId);

            res.json(allComments);

        }

    } catch (error) {

        console.error("Error fetching comments:", error);

        res.status(500).json({ error: 'Failed to fetch comments' });

    }

});



app.get('/api/comments/:commentId', async (req: Request, res: Response): Promise<void> => {

    const { commentId } = req.params;

    try {

        const comment = await commentsApi.getComment(commentId);

        if (!comment) {

            res.status(404).json({ error: 'Comment not found' });

            return;

        }

        res.json(comment);

    } catch (error) {

        console.error("Error fetching comment:", error);

        res.status(500).json({ error: 'Failed to fetch comment' });

    }

});



app.post('/api/posts/:postId/comments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { postId } = req.params;

    const { content, parentCommentId } = req.body;

    const userId = req.user.id;

    

    try {

        const commentData = {

            content,

            post_id: postId,

            parent_comment_id: parentCommentId

        };

        

        const newComment = await commentsApi.createComment(userId, commentData);

        res.status(201).json(newComment);

    } catch (error) {

        console.error("Error creating comment:", error);

        res.status(500).json({ error: 'Failed to create comment' });

    }

});



app.put('/api/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { commentId } = req.params;

    const { content } = req.body;

    const userId = req.user.id;

    

    try {

        const updatedComment = await commentsApi.updateComment(commentId, userId, content);

        if (!updatedComment) {

            res.status(404).json({ error: 'Comment not found' });

            return;

        }

        res.json(updatedComment);

    } catch (error: any) {

        console.error("Error updating comment:", error);

        if (error.message === 'You can only update your own comments') {

            res.status(403).json({ error: error.message });

            return;

        }

        res.status(500).json({ error: 'Failed to update comment' });

    }

});



app.delete('/api/comments/:commentId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {

    const { commentId } = req.params;

    const userId = req.user.id;

    

    try {

        const success = await commentsApi.deleteComment(commentId, userId);

        if (!success) {

            res.status(404).json({ error: 'Comment not found' });

            return;

        }

        res.status(204).end();

    } catch (error: any) {

        console.error("Error deleting comment:", error);

        if (error.message === 'You can only delete your own comments') {

            res.status(403).json({ error: error.message });

            return;

        }

        res.status(500).json({ error: 'Failed to delete comment' });

    }

});



app.get('/api/comments/:commentId/replies', async (req: Request, res: Response): Promise<void> => {

    const { commentId } = req.params;

    try {

        const replies = await commentsApi.getCommentReplies(commentId);

        res.json(replies);

    } catch (error) {

        console.error("Error fetching comment replies:", error);

        res.status(500).json({ error: 'Failed to fetch comment replies' });

    }

});



app.listen(port, '0.0.0.0', () => {

  console.log(`Backend server listening at http://0.0.0.0:${port}`);

});