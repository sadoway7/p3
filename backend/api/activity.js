const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection.js');

/**
 * Get activities for a specific user
 * @param {string} userId - The user ID to get activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return
 * @param {number} options.offset - Number of activities to skip
 * @param {string} options.activityType - Filter by activity type
 * @param {string} options.actionType - Filter by action type
 * @param {string} options.entityType - Filter by entity type
 * @param {string} options.startDate - Filter by start date (ISO format)
 * @param {string} options.endDate - Filter by end date (ISO format)
 * @returns {Promise<Array>} - Array of activities
 */
async function getUserActivities(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    activityType,
    actionType,
    entityType,
    startDate,
    endDate
  } = options;

  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = `
      SELECT a.*, at.name as activity_type_name, act.name as action_name
      FROM activity a
      JOIN activity_type at ON a.activity_type_id = at.id
      JOIN action act ON a.action_id = act.id
      WHERE a.user_id = ?
    `;
    
    const queryParams = [userId];
    
    if (activityType) {
      query += " AND at.name = ?";
      queryParams.push(activityType);
    }
    
    if (actionType) {
      query += " AND act.name = ?";
      queryParams.push(actionType);
    }
    
    if (entityType) {
      query += " AND a.entity_type = ?";
      queryParams.push(entityType);
    }
    
    if (startDate) {
      query += " AND a.created_at >= ?";
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += " AND a.created_at <= ?";
      queryParams.push(endDate);
    }
    
    query += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const activities = await conn.query(query, queryParams);
    
    // Enrich activities with entity details
    if (Array.isArray(activities)) {
      for (let activity of activities) {
        if (activity && activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    } else {
      console.warn("Expected activities array but received:", typeof activities);
    }
    
    return activities;
  } catch (error) {
    console.error("Error fetching user activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get activities for a specific community
 * @param {string} communityId - The community ID to get activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return
 * @param {number} options.offset - Number of activities to skip
 * @param {string} options.activityType - Filter by activity type
 * @param {string} options.actionType - Filter by action type
 * @param {string} options.entityType - Filter by entity type
 * @param {string} options.startDate - Filter by start date (ISO format)
 * @param {string} options.endDate - Filter by end date (ISO format)
 * @returns {Promise<Array>} - Array of activities
 */
async function getCommunityActivities(communityId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    activityType,
    actionType,
    entityType,
    startDate,
    endDate
  } = options;

  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = `
      SELECT a.*, at.name as activity_type_name, act.name as action_name, u.username
      FROM activity a
      JOIN activity_type at ON a.activity_type_id = at.id
      JOIN action act ON a.action_id = act.id
      JOIN user u ON a.user_id = u.id
      WHERE (
        (a.entity_type = 'community' AND a.entity_id = ?) OR
        (a.entity_type = 'post' AND a.entity_id IN (
          SELECT id FROM post WHERE community_id = ?
        )) OR
        (a.entity_type = 'comment' AND a.entity_id IN (
          SELECT c.id FROM comment c
          JOIN post p ON c.post_id = p.id
          WHERE p.community_id = ?
        ))
      )
    `;
    
    const queryParams = [communityId, communityId, communityId];
    
    if (activityType) {
      query += " AND at.name = ?";
      queryParams.push(activityType);
    }
    
    if (actionType) {
      query += " AND act.name = ?";
      queryParams.push(actionType);
    }
    
    if (entityType) {
      query += " AND a.entity_type = ?";
      queryParams.push(entityType);
    }
    
    if (startDate) {
      query += " AND a.created_at >= ?";
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += " AND a.created_at <= ?";
      queryParams.push(endDate);
    }
    
    query += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const activities = await conn.query(query, queryParams);
    
    // Enrich activities with entity details
    if (Array.isArray(activities)) {
      for (let activity of activities) {
        if (activity && activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    } else {
      console.warn("Expected activities array but received:", typeof activities);
    }
    
    return activities;
  } catch (error) {
    console.error("Error fetching community activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get activities for a specific post
 * @param {string} postId - The post ID to get activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return
 * @param {number} options.offset - Number of activities to skip
 * @returns {Promise<Array>} - Array of activities
 */
async function getPostActivities(postId, options = {}) {
  const { limit = 20, offset = 0 } = options;

  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = `
      SELECT a.*, at.name as activity_type_name, act.name as action_name, u.username
      FROM activity a
      JOIN activity_type at ON a.activity_type_id = at.id
      JOIN action act ON a.action_id = act.id
      JOIN user u ON a.user_id = u.id
      WHERE (
        (a.entity_type = 'post' AND a.entity_id = ?) OR
        (a.entity_type = 'comment' AND a.entity_id IN (
          SELECT id FROM comment WHERE post_id = ?
        ))
      )
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const activities = await conn.query(query, [postId, postId, parseInt(limit), parseInt(offset)]);
    
    // Enrich activities with entity details
    if (Array.isArray(activities)) {
      for (let activity of activities) {
        if (activity && activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    } else {
      console.warn("Expected activities array but received:", typeof activities);
    }
    
    return activities;
  } catch (error) {
    console.error("Error fetching post activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get all activity types
 * @returns {Promise<Array>} - Array of activity types
 */
async function getActivityTypes() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const activityTypes = await conn.query(
      "SELECT * FROM activity_type ORDER BY name"
    );
    
    return activityTypes || [];
  } catch (error) {
    console.error("Error fetching activity types:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get all action types
 * @returns {Promise<Array>} - Array of action types
 */
async function getActionTypes() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const actionTypes = await conn.query(
      "SELECT * FROM action ORDER BY name"
    );
    
    return actionTypes || [];
  } catch (error) {
    console.error("Error fetching action types:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Log an activity
 * @param {Object} activityData - Activity data
 * @param {string} activityData.userId - User ID
 * @param {string} activityData.activityType - Activity type name
 * @param {string} activityData.actionType - Action type name
 * @param {string} activityData.entityId - Entity ID
 * @param {string} activityData.entityType - Entity type
 * @param {Object} activityData.metadata - Additional metadata
 * @param {string} activityData.ipAddress - IP address
 * @param {string} activityData.userAgent - User agent
 * @returns {Promise<Object>} - Created activity
 */
async function logActivity(activityData) {
  if (!activityData || !activityData.userId) {
    console.warn("Attempted to log activity without user ID:", activityData);
    return null;
  }
  
  const {
    userId,
    activityType,
    actionType,
    entityId,
    entityType,
    metadata,
    ipAddress,
    userAgent
  } = activityData;

  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get activity type ID
    const [activityTypeRecord] = await conn.query(
      "SELECT id FROM activity_type WHERE name = ?",
      [activityType]
    );
    
    if (!activityTypeRecord) {
      // Create the activity type if it doesn't exist
      console.warn(`Activity type '${activityType}' not found, creating it.`);
      const activityTypeId = uuidv4();
      await conn.query(
        "INSERT INTO activity_type (id, name) VALUES (?, ?)",
        [activityTypeId, activityType]
      );
      activityTypeRecord = { id: activityTypeId };
    }
    
    // Get action type ID
    const [actionTypeRecord] = await conn.query(
      "SELECT id FROM action WHERE name = ?",
      [actionType]
    );
    
    if (!actionTypeRecord) {
      // Create the action type if it doesn't exist
      console.warn(`Action type '${actionType}' not found, creating it.`);
      const actionTypeId = uuidv4();
      await conn.query(
        "INSERT INTO action (id, name) VALUES (?, ?)",
        [actionTypeId, actionType]
      );
      actionTypeRecord = { id: actionTypeId };
    }
    
    // Create activity
    const activityId = uuidv4();
    
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, 
        metadata, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activityId,
        userId,
        activityTypeRecord.id,
        actionTypeRecord.id,
        entityId,
        entityType,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent
      ]
    );
    
    // Get the created activity
    const [activity] = await conn.query(
      `SELECT a.*, at.name as activity_type_name, act.name as action_name
       FROM activity a
       JOIN activity_type at ON a.activity_type_id = at.id
       JOIN action act ON a.action_id = act.id
       WHERE a.id = ?`,
      [activityId]
    );
    
    return activity;
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw - we don't want activity logging to break the application
    return null;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get entity details based on entity ID and type
 * @param {Object} conn - Database connection
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type
 * @returns {Promise<Object>} - Entity details
 */
async function getEntityDetails(conn, entityId, entityType) {
  if (!entityId || !entityType) {
    return null;
  }
  
  try {
    switch (entityType) {
      case 'post': {
        const [post] = await conn.query(
          `SELECT p.id, p.title, p.content, p.community_id, c.name as community_name, u.username
           FROM post p
           LEFT JOIN community c ON p.community_id = c.id
           LEFT JOIN user u ON p.user_id = u.id
           WHERE p.id = ?`,
          [entityId]
        );
        return post;
      }
      case 'comment': {
        const [comment] = await conn.query(
          `SELECT c.id, c.content, c.post_id, p.title as post_title, u.username
           FROM comment c
           LEFT JOIN post p ON c.post_id = p.id
           LEFT JOIN user u ON c.user_id = u.id
           WHERE c.id = ?`,
          [entityId]
        );
        return comment;
      }
      case 'community': {
        const [community] = await conn.query(
          "SELECT id, name, description FROM community WHERE id = ?",
          [entityId]
        );
        return community;
      }
      case 'user': {
        const [user] = await conn.query(
          "SELECT id, username, display_name FROM user WHERE id = ?",
          [entityId]
        );
        return user;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error getting ${entityType} details:`, error);
    return null;
  }
}

module.exports = {
  getUserActivities,
  getCommunityActivities,
  getPostActivities,
  getActivityTypes,
  getActionTypes,
  logActivity
};