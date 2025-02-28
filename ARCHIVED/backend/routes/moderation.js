// backend/routes/moderation.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { isCommunityModerator, hasPermission } = require('../middleware/moderation');
const {
  // Moderator permissions
  getModeratorPermissions,
  setModeratorPermissions,
  
  // Community settings
  getEnhancedCommunitySettings,
  updateEnhancedCommunitySettings,
  
  // Post moderation
  getPostModerationStatus,
  addPostToModQueue,
  moderatePost,
  getPendingModQueue,
  
  // Moderation logs
  getModerationLogs,
  
  // Banning
  banUserFromCommunity,
  unbanUserFromCommunity,
  getBannedUsers
} = require('../api/moderation');

// Middleware to ensure routes are protected
router.use(authenticateToken);

// Moderator permissions routes
router.get('/communities/:communityId/moderator-permissions/:userId', 
  authenticateToken,
  isCommunityModerator,
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const permissions = await getModeratorPermissions(communityId, userId);
      res.json(permissions || { message: 'No specific permissions found' });
    } catch (error) {
      console.error('Error fetching moderator permissions:', error);
      res.status(500).json({ error: 'Failed to fetch moderator permissions' });
    }
  }
);

router.post('/communities/:communityId/moderator-permissions/:userId', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_members'),
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const permissions = req.body;
      
      const updatedPermissions = await setModeratorPermissions(communityId, userId, permissions);
      res.json(updatedPermissions);
    } catch (error) {
      console.error('Error setting moderator permissions:', error);
      res.status(500).json({ error: 'Failed to set moderator permissions' });
    }
  }
);

// Community settings routes
router.get('/communities/:communityId/settings', 
  authenticateToken,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const settings = await getEnhancedCommunitySettings(communityId);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching community settings:', error);
      res.status(500).json({ error: 'Failed to fetch community settings' });
    }
  }
);

router.put('/communities/:communityId/settings', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_settings'),
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const settings = req.body;
      
      const updatedSettings = await updateEnhancedCommunitySettings(communityId, settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating community settings:', error);
      res.status(500).json({ error: 'Failed to update community settings' });
    }
  }
);

// Post moderation routes
router.get('/communities/:communityId/mod-queue', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_posts'),
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const pendingPosts = await getPendingModQueue(communityId);
      res.json(pendingPosts);
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      res.status(500).json({ error: 'Failed to fetch moderation queue' });
    }
  }
);

router.post('/posts/:postId/moderate', 
  authenticateToken,
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { action, reason } = req.body;
      const userId = req.user.id;
      
      // Get community ID from the post to check permissions
      const { getCommunityIdFromPost } = require('../api/posts');
      const communityId = await getCommunityIdFromPost(postId);
      
      if (!communityId) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      // Check if user is a moderator with post management permissions
      const { hasModeratorPermission } = require('../api/moderation');
      const canManagePosts = await hasModeratorPermission(communityId, userId, 'can_manage_posts');
      
      if (!canManagePosts) {
        return res.status(403).json({ error: 'You do not have permission to moderate posts' });
      }
      
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
      }
      
      const result = await moderatePost(postId, userId, action, reason);
      res.json(result);
    } catch (error) {
      console.error('Error moderating post:', error);
      res.status(500).json({ error: 'Failed to moderate post' });
    }
  }
);

// Moderation logs routes
router.get('/communities/:communityId/logs', 
  authenticateToken,
  isCommunityModerator,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const logs = await getModerationLogs(communityId, parseInt(limit), parseInt(offset));
      res.json(logs);
    } catch (error) {
      console.error('Error fetching moderation logs:', error);
      res.status(500).json({ error: 'Failed to fetch moderation logs' });
    }
  }
);

// User ban routes
router.get('/communities/:communityId/banned-users', 
  authenticateToken,
  isCommunityModerator,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const bannedUsers = await getBannedUsers(communityId);
      res.json(bannedUsers);
    } catch (error) {
      console.error('Error fetching banned users:', error);
      res.status(500).json({ error: 'Failed to fetch banned users' });
    }
  }
);

router.post('/communities/:communityId/ban/:userId', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_members'),
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const { reason, duration } = req.body; // duration in days
      const bannedBy = req.user.id;
      
      const ban = await banUserFromCommunity(communityId, userId, bannedBy, reason, duration);
      res.json(ban);
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  }
);

router.post('/communities/:communityId/unban/:userId', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_members'),
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const { reason } = req.body;
      const unbannedBy = req.user.id;
      
      const result = await unbanUserFromCommunity(communityId, userId, unbannedBy, reason);
      
      if (result) {
        res.json({ message: 'User has been unbanned' });
      } else {
        res.status(404).json({ message: 'User was not banned' });
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Failed to unban user' });
    }
  }
);

// Add community member route with role assignment
router.post('/communities/:communityId/members/:userId', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_members'),
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const { role } = req.body;
      
      if (!['member', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "member", "moderator", or "admin"' });
      }
      
      const { addCommunityMember } = require('../api/communities');
      const member = await addCommunityMember(communityId, userId, role);
      
      // If setting as moderator, set default permissions
      if (role === 'moderator') {
        await setModeratorPermissions(communityId, userId, {
          can_manage_posts: true,
          can_manage_comments: true
        });
      }
      
      res.json(member);
    } catch (error) {
      console.error('Error adding community member:', error);
      res.status(500).json({ error: 'Failed to add community member' });
    }
  }
);

// Update community member role
router.put('/communities/:communityId/members/:userId', 
  authenticateToken,
  isCommunityModerator,
  hasPermission('can_manage_members'),
  async (req, res) => {
    try {
      const { communityId, userId } = req.params;
      const { role } = req.body;
      
      if (!['member', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "member", "moderator", or "admin"' });
      }
      
      const { updateCommunityMemberRole } = require('../api/communities');
      const member = await updateCommunityMemberRole(communityId, userId, role);
      
      // If promoting to moderator, set default permissions
      if (role === 'moderator') {
        await setModeratorPermissions(communityId, userId, {
          can_manage_posts: true,
          can_manage_comments: true
        });
      }
      
      res.json(member);
    } catch (error) {
      console.error('Error updating community member role:', error);
      res.status(500).json({ error: 'Failed to update community member role' });
    }
  }
);

module.exports = router;