// backend/middleware/moderation.js
const { isUserModerator, hasModeratorPermission, isUserBanned } = require('../api/moderation');

// Middleware to check if a user is a moderator for a community
const isCommunityModerator = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    if (!communityId) {
      return res.status(400).json({ error: 'Community ID is required' });
    }
    
    const isModerator = await isUserModerator(communityId, userId);
    
    if (!isModerator) {
      return res.status(403).json({ error: 'Only moderators can perform this action' });
    }
    
    next();
  } catch (error) {
    console.error('Error in moderator check middleware:', error);
    return res.status(500).json({ error: 'Server error checking moderator status' });
  }
};

// Middleware to check if a user has a specific moderator permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const { communityId } = req.params;
      const userId = req.user.id;
      
      if (!communityId) {
        return res.status(400).json({ error: 'Community ID is required' });
      }
      
      const hasPermission = await hasModeratorPermission(communityId, userId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'You do not have permission to perform this action' });
      }
      
      next();
    } catch (error) {
      console.error(`Error in permission check middleware (${permission}):`, error);
      return res.status(500).json({ error: 'Server error checking permissions' });
    }
  };
};

// Middleware to check if the user is banned from the community
const checkNotBanned = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    if (!communityId) {
      return res.status(400).json({ error: 'Community ID is required' });
    }
    
    const isBanned = await isUserBanned(communityId, userId);
    
    if (isBanned) {
      return res.status(403).json({ error: 'You are banned from this community' });
    }
    
    next();
  } catch (error) {
    console.error('Error in ban check middleware:', error);
    return res.status(500).json({ error: 'Server error checking ban status' });
  }
};

module.exports = {
  isCommunityModerator,
  hasPermission,
  checkNotBanned
};