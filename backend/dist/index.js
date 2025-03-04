"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const express_1 = __importDefault(require("express"));
const mariadb_1 = __importDefault(require("mariadb"));
const cors_1 = __importDefault(require("cors"));
const commentsApi = __importStar(require("./api/comments"));
const app = (0, express_1.default)();
const port = 3001; // Use a different port from the frontend
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = mariadb_1.default.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});
// Import API functions
const communities_1 = require("./api/communities");
const auth_1 = require("./api/auth");
// Route Handlers
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: 'https://rumfor.com',
    credentials: true
}));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const user = (0, auth_1.verifyToken)(token);
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
// Check if user is a community moderator
const isCommunityModerator = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const communityId = req.params.id;
    const userId = req.user.id;
    let conn;
    try {
        conn = yield pool.getConnection();
        const [membership] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'", [communityId, userId]);
        if (!membership) {
            res.status(403).json({ error: 'Moderator access required' });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Error checking moderator status:", error);
        res.status(500).json({ error: 'Failed to check moderator status' });
        return;
    }
    finally {
        if (conn)
            conn.end();
    }
});
// Check if user can view a community (public or member of private)
const canViewCommunity = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const communityId = req.params.id;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Optional, might be unauthenticated
    let conn;
    try {
        conn = yield pool.getConnection();
        const [community] = yield conn.query("SELECT * FROM community WHERE id = ?", [communityId]);
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
        const [membership] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
        if (!membership) {
            res.status(403).json({ error: 'Membership required' });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Error checking community access:", error);
        res.status(500).json({ error: 'Failed to check community access' });
        return;
    }
    finally {
        if (conn)
            conn.end();
    }
});
// Check if user can post in a community (must be a member)
const canPostInCommunity = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const communityId = req.body.communityId;
    const userId = req.user.id;
    if (!communityId) {
        next(); // Profile post, no community check needed
        return;
    }
    let conn;
    try {
        conn = yield pool.getConnection();
        const [membership] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
        if (!membership) {
            res.status(403).json({ error: 'You must be a member of this community to post' });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Error checking community membership:", error);
        res.status(500).json({ error: 'Failed to check community membership' });
        return;
    }
    finally {
        if (conn)
            conn.end();
    }
});
// Authentication routes
app.post('/api/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required' });
        return;
    }
    try {
        const user = yield (0, auth_1.register)({ username, email, password });
        res.status(201).json(user);
    }
    catch (error) {
        console.error("Error registering user:", error);
        res.status(400).json({ error: error.message });
    }
}));
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }
    try {
        const result = yield (0, auth_1.login)({ username, password });
        res.json(result);
    }
    catch (error) {
        console.error("Error logging in:", error);
        res.status(401).json({ error: error.message });
    }
}));
app.get('/api/auth/me', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield (0, auth_1.getCurrentUser)(req.user.id);
        res.json(user);
    }
    catch (error) {
        console.error("Error getting current user:", error);
        res.status(404).json({ error: error.message });
    }
}));
// Communities API
app.get('/api/communities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const searchTerm = req.query.search;
        if (searchTerm) {
            const communities = yield (0, communities_1.searchCommunities)(searchTerm);
            res.json(communities);
        }
        else {
            const communities = yield (0, communities_1.getCommunities)();
            res.json(communities);
        }
    }
    catch (error) {
        console.error("Error fetching communities:", error);
        res.status(500).json({ error: 'Failed to fetch communities' });
    }
}));
app.get('/api/communities/:id', canViewCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const community = yield (0, communities_1.getCommunity)(id);
        if (!community) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }
        res.json(community);
    }
    catch (error) {
        console.error("Error fetching community:", error);
        res.status(500).json({ error: 'Failed to fetch community' });
    }
}));
app.post('/api/communities', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, privacy } = req.body;
    const userId = req.user.id;
    try {
        // Create the community
        const newCommunity = yield (0, communities_1.createCommunity)({ name, description, privacy });
        // Add the creator as a moderator
        yield (0, communities_1.addCommunityMember)(newCommunity.id, userId, 'moderator');
        res.status(201).json(newCommunity);
    }
    catch (error) {
        console.error("Error creating community:", error);
        res.status(500).json({ error: 'Failed to create community' });
    }
}));
app.put('/api/communities/:id', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, description, privacy } = req.body;
    const userId = req.user.id;
    try {
        const updatedCommunity = yield (0, communities_1.updateCommunity)(id, { name, description, privacy }, userId);
        if (!updatedCommunity) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }
        res.json(updatedCommunity);
    }
    catch (error) {
        console.error("Error updating community:", error);
        res.status(500).json({ error: 'Failed to update community' });
    }
}));
app.delete('/api/communities/:id', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const success = yield (0, communities_1.deleteCommunity)(id, userId);
        if (!success) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }
        res.status(204).end();
    }
    catch (error) {
        console.error("Error deleting community:", error);
        res.status(500).json({ error: 'Failed to delete community' });
    }
}));
// Community Rules API
app.get('/api/communities/:id/rules', canViewCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const rules = yield (0, communities_1.getCommunityRules)(id);
        res.json(rules);
    }
    catch (error) {
        console.error("Error fetching community rules:", error);
        res.status(500).json({ error: 'Failed to fetch community rules' });
    }
}));
app.post('/api/communities/:id/rules', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    try {
        const newRule = yield (0, communities_1.addCommunityRule)(id, { title, description }, userId);
        res.status(201).json(newRule);
    }
    catch (error) {
        console.error("Error adding community rule:", error);
        res.status(500).json({ error: 'Failed to add community rule' });
    }
}));
app.put('/api/communities/:id/rules/:ruleId', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ruleId } = req.params;
    const { title, description } = req.body;
    const userId = req.user.id;
    try {
        const updatedRule = yield (0, communities_1.updateCommunityRule)(ruleId, { title, description }, userId);
        if (!updatedRule) {
            res.status(404).json({ error: 'Rule not found' });
            return;
        }
        res.json(updatedRule);
    }
    catch (error) {
        console.error("Error updating community rule:", error);
        res.status(500).json({ error: 'Failed to update community rule' });
    }
}));
app.delete('/api/communities/:id/rules/:ruleId', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ruleId } = req.params;
    const userId = req.user.id;
    try {
        const success = yield (0, communities_1.deleteCommunityRule)(ruleId, userId);
        if (!success) {
            res.status(404).json({ error: 'Rule not found' });
            return;
        }
        res.status(204).end();
    }
    catch (error) {
        console.error("Error deleting community rule:", error);
        res.status(500).json({ error: 'Failed to delete community rule' });
    }
}));
// Community Settings API
app.get('/api/communities/:id/settings', canViewCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const settings = yield (0, communities_1.getCommunitySettings)(id);
        if (!settings) {
            res.status(404).json({ error: 'Settings not found' });
            return;
        }
        res.json(settings);
    }
    catch (error) {
        console.error("Error fetching community settings:", error);
        res.status(500).json({ error: 'Failed to fetch community settings' });
    }
}));
app.put('/api/communities/:id/settings', authenticateToken, isCommunityModerator, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { allow_post_images, allow_post_links } = req.body;
    try {
        const userId = req.user.id;
        const updatedSettings = yield (0, communities_1.updateCommunitySettings)(id, { allow_post_images, allow_post_links }, userId);
        if (!updatedSettings) {
            res.status(404).json({ error: 'Settings not found' });
            return;
        }
        res.json(updatedSettings);
    }
    catch (error) {
        console.error("Error updating community settings:", error);
        res.status(500).json({ error: 'Failed to update community settings' });
    }
}));
// Community Members API
app.get('/api/communities/:id/members', canViewCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const members = yield (0, communities_1.getCommunityMembers)(id);
        res.json(members);
    }
    catch (error) {
        console.error("Error fetching community members:", error);
        res.status(500).json({ error: 'Failed to fetch community members' });
    }
}));
app.post('/api/communities/:id/members', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id; // User joins themselves
    try {
        const newMember = yield (0, communities_1.addCommunityMember)(id, userId, 'member');
        res.status(201).json(newMember);
    }
    catch (error) {
        console.error("Error adding community member:", error);
        res.status(500).json({ error: 'Failed to add community member' });
    }
}));
app.put('/api/communities/:id/members/:userId', authenticateToken, isCommunityModerator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, userId } = req.params;
    const { role } = req.body;
    try {
        const updatedBy = req.user.id;
        const updatedMember = yield (0, communities_1.updateCommunityMemberRole)(id, userId, role, updatedBy);
        if (!updatedMember) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }
        res.json(updatedMember);
    }
    catch (error) {
        console.error("Error updating community member role:", error);
        res.status(500).json({ error: 'Failed to update community member role' });
    }
}));
app.delete('/api/communities/:id/members/:userId', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id, userId } = req.params;
    const currentUserId = req.user.id;
    // Check if user is removing themselves or is a moderator
    if (userId !== currentUserId) {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [membership] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'", [id, currentUserId]);
            if (!membership) {
                res.status(403).json({ error: 'You can only remove yourself unless you are a moderator' });
                return;
            }
        }
        catch (error) {
            console.error("Error checking moderator status:", error);
            res.status(500).json({ error: 'Failed to check moderator status' });
            return;
        }
        finally {
            if (conn)
                conn.end();
        }
    }
    try {
        const success = yield (0, communities_1.removeCommunityMember)(id, userId);
        if (!success) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }
        res.status(204).end();
    }
    catch (error) {
        console.error("Error removing community member:", error);
        res.status(500).json({ error: 'Failed to remove community member' });
    }
}));
// Community About API
app.get('/api/communities/:id/about', canViewCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const about = yield (0, communities_1.getCommunityAbout)(id);
        if (!about) {
            res.status(404).json({ error: 'Community not found' });
            return;
        }
        res.json(about);
    }
    catch (error) {
        console.error("Error fetching community about:", error);
        res.status(500).json({ error: 'Failed to fetch community about' });
    }
}));
// User Communities API
app.get('/api/users/:id/communities', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const communities = yield (0, communities_1.getUserCommunities)(id);
        res.json(communities);
    }
    catch (error) {
        console.error("Error fetching user communities:", error);
        res.status(500).json({ error: 'Failed to fetch user communities' });
    }
}));
// Posts API
app.get('/api/posts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let conn;
    try {
        conn = yield pool.getConnection();
        // Check if we need to filter by community or user profile
        const communityId = req.query.communityId;
        const userProfileId = req.query.userProfileId;
        let query = "SELECT p.*, u.username FROM post p JOIN user u ON p.user_id = u.id";
        const params = [];
        if (communityId) {
            query += " WHERE p.community_id = ?";
            params.push(communityId);
        }
        else if (userProfileId) {
            query += " WHERE p.user_profile_id = ? OR p.user_id = ?";
            params.push(userProfileId, userProfileId);
        }
        query += " ORDER BY p.created_at DESC";
        const posts = yield conn.query(query, params);
        res.json(posts);
    }
    catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
    finally {
        if (conn)
            conn.end();
    }
}));
app.get('/api/posts/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    let conn;
    try {
        conn = yield pool.getConnection();
        const [post] = yield conn.query("SELECT * FROM post WHERE id = ?", [id]);
        if (!post) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        res.json(post);
    }
    catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
    finally {
        if (conn)
            conn.end();
    }
}));
app.post('/api/posts', authenticateToken, canPostInCommunity, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, content, communityId, userProfileId, isProfilePost, id } = req.body;
    const authorId = req.user.id;
    let conn;
    try {
        conn = yield pool.getConnection();
        // Determine if this is a profile post
        const profilePost = isProfilePost || !!userProfileId;
        // Use provided ID from client or generate a new one
        const postId = id || (0, uuid_1.v4)();
        console.log('Using post ID:', postId);
        // Build the query based on the available data
        let query;
        let params;
        if (communityId) {
            query = "INSERT INTO post (id, title, content, user_id, community_id, profile_post) VALUES (?, ?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, communityId, profilePost];
        }
        else if (userProfileId) {
            query = "INSERT INTO post (id, title, content, user_id, user_profile_id, profile_post) VALUES (?, ?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, userProfileId, profilePost];
        }
        else {
            query = "INSERT INTO post (id, title, content, user_id, profile_post) VALUES (?, ?, ?, ?, ?)";
            params = [postId, title, content, authorId, profilePost];
        }
        const result = yield conn.query(query, params);
        const [newPost] = yield conn.query("SELECT * FROM post WHERE id = ?", [postId]);
        res.status(201).json(newPost);
    }
    catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ error: 'Failed to create post' });
    }
    finally {
        if (conn)
            conn.end();
    }
}));
app.put('/api/posts/:id', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    let conn;
    try {
        conn = yield pool.getConnection();
        // Check if user is the author of the post
        const [post] = yield conn.query("SELECT * FROM post WHERE id = ?", [id]);
        if (!post) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        if (post.user_id !== userId) {
            res.status(403).json({ error: 'You can only edit your own posts' });
            return;
        }
        yield conn.query("UPDATE post SET title = ?, content = ?, updated_at = NOW() WHERE id = ?", [title, content, id]);
        const [updatedPost] = yield conn.query("SELECT * FROM post WHERE id = ?", [id]);
        res.json(updatedPost);
    }
    catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: 'Failed to update post' });
    }
    finally {
        if (conn)
            conn.end();
    }
}));
app.delete('/api/posts/:id', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.id;
    let conn;
    try {
        conn = yield pool.getConnection();
        // Check if user is the author of the post or a community moderator
        const [post] = yield conn.query("SELECT * FROM post WHERE id = ?", [id]);
        if (!post) {
            res.status(404).json({ error: 'Post not found' });
            return;
        }
        if (post.user_id !== userId) {
            // Check if user is a moderator of the community
            const [membership] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role = 'moderator'", [post.community_id, userId]);
            if (!membership) {
                res.status(403).json({ error: 'You can only delete your own posts or posts in communities you moderate' });
                return;
            }
        }
        yield conn.query("DELETE FROM post WHERE id = ?", [id]);
        res.status(204).end();
    }
    catch (error) {
        console.error("Error deleting post:", error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
    finally {
        if (conn)
            conn.end();
    }
}));
app.get('/', (req, res) => {
    res.send('Hello from Express backend!');
});
// Comments API
app.get('/api/posts/:postId/comments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    try {
        const threaded = req.query.threaded === 'true';
        if (threaded) {
            const commentsList = yield commentsApi.getThreadedComments(postId);
            res.json(commentsList);
        }
        else {
            const allComments = yield commentsApi.getPostComments(postId);
            res.json(allComments);
        }
    }
    catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
}));
app.get('/api/comments/:commentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    try {
        const comment = yield commentsApi.getComment(commentId);
        if (!comment) {
            res.status(404).json({ error: 'Comment not found' });
            return;
        }
        res.json(comment);
    }
    catch (error) {
        console.error("Error fetching comment:", error);
        res.status(500).json({ error: 'Failed to fetch comment' });
    }
}));
app.post('/api/posts/:postId/comments', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.id;
    try {
        const commentData = {
            content,
            post_id: postId,
            parent_comment_id: parentCommentId
        };
        const newComment = yield commentsApi.createComment(userId, commentData);
        res.status(201).json(newComment);
    }
    catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
}));
app.put('/api/comments/:commentId', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
        const updatedComment = yield commentsApi.updateComment(commentId, userId, content);
        if (!updatedComment) {
            res.status(404).json({ error: 'Comment not found' });
            return;
        }
        res.json(updatedComment);
    }
    catch (error) {
        console.error("Error updating comment:", error);
        if (error.message === 'You can only update your own comments') {
            res.status(403).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to update comment' });
    }
}));
app.delete('/api/comments/:commentId', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    const userId = req.user.id;
    try {
        const success = yield commentsApi.deleteComment(commentId, userId);
        if (!success) {
            res.status(404).json({ error: 'Comment not found' });
            return;
        }
        res.status(204).end();
    }
    catch (error) {
        console.error("Error deleting comment:", error);
        if (error.message === 'You can only delete your own comments') {
            res.status(403).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to delete comment' });
    }
}));
app.get('/api/comments/:commentId/replies', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { commentId } = req.params;
    try {
        const replies = yield commentsApi.getCommentReplies(commentId);
        res.json(replies);
    }
    catch (error) {
        console.error("Error fetching comment replies:", error);
        res.status(500).json({ error: 'Failed to fetch comment replies' });
    }
}));
app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server listening at http://0.0.0.0:${port}`);
});
