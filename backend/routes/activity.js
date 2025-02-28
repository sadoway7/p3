const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserActivities,
  getCommunityActivities,
  getPostActivities,
  getActivityTypes,
  getActionTypes,
  logActivity
} = require('../api/activity');

// Middleware to ensure routes are protected
router.use(authenticateToken);

/**
 * @route GET /api/activity/types
 * @desc Get all activity types
 * @access Private
 */
router.get('/types', async (req, res) => {
  try {
    const activityTypes = await getActivityTypes();
    res.json(activityTypes);
  } catch (error) {
    console.error('Error fetching activity types:', error);
    res.status(500).json({ error: 'Failed to fetch activity types' });
  }
});

/**
 * @route GET /api/activity/actions
 * @desc Get all action types
 * @access Private
 */
router.get('/actions', async (req, res) => {
  try {
    const actionTypes = await getActionTypes();
    res.json(actionTypes);
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({ error: 'Failed to fetch action types' });
  }
});

/**
 * @route GET /api/activity/user/:userId
 * @desc Get activities for a specific user
 * @access Private (only for the user themselves or admins)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the user is requesting their own activities or is an admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only view your own activities' });
    }
    
    // Extract query parameters
    const {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    } = req.query;
    
    const options = {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    };
    
    const activities = await getUserActivities(userId, options);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

/**
 * @route GET /api/activity/me
 * @desc Get activities for the current user
 * @access Private
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Extract query parameters
    const {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    } = req.query;
    
    const options = {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    };
    
    const activities = await getUserActivities(userId, options);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

/**
 * @route GET /api/activity/community/:communityId
 * @desc Get activities for a specific community
 * @access Private (only for community members)
 */
router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    // Check if the user is a member of the community
    const conn = await pool.getConnection();
    try {
      const [membership] = await conn.query(
        "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
        [communityId, userId]
      );
      
      if (!membership && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You must be a member of this community to view its activities' });
      }
    } finally {
      conn.release();
    }
    
    // Extract query parameters
    const {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    } = req.query;
    
    const options = {
      limit,
      offset,
      activityType,
      actionType,
      entityType,
      startDate,
      endDate
    };
    
    const activities = await getCommunityActivities(communityId, options);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching community activities:', error);
    res.status(500).json({ error: 'Failed to fetch community activities' });
  }
});

/**
 * @route GET /api/activity/post/:postId
 * @desc Get activities for a specific post
 * @access Private
 */
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Extract query parameters
    const { limit, offset } = req.query;
    
    const options = { limit, offset };
    
    const activities = await getPostActivities(postId, options);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching post activities:', error);
    res.status(500).json({ error: 'Failed to fetch post activities' });
  }
});

/**
 * @route POST /api/activity/log
 * @desc Log a new activity (for manual logging, most activities are logged automatically)
 * @access Private (admin only)
 */
router.post('/log', async (req, res) => {
  try {
    // Only admins can manually log activities
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can manually log activities' });
    }
    
    const {
      userId,
      activityType,
      actionType,
      entityId,
      entityType,
      metadata
    } = req.body;
    
    // Validate required fields
    if (!userId || !activityType || !actionType) {
      return res.status(400).json({ error: 'userId, activityType, and actionType are required' });
    }
    
    // Get IP address and user agent from request
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    
    const activityData = {
      userId,
      activityType,
      actionType,
      entityId,
      entityType,
      metadata,
      ipAddress,
      userAgent
    };
    
    const activity = await logActivity(activityData);
    res.status(201).json(activity);
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

module.exports = router;
