import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import type { ActivityOptions, ActivityData, Activity, ActivityType, ActionType } from '../types/index';
import { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

// Custom type for activity row data
interface ActivityRow extends RowDataPacket, Activity {}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(userId: string, options: ActivityOptions = {}): Promise<Activity[]> {
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
    
    const queryParams: any[] = [userId];
    
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
    queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));
    
    const [rows] = await conn.query<ActivityRow[]>(query, queryParams);
    
    // Enrich activities with entity details
    if (Array.isArray(rows)) {
      for (let activity of rows) {
        if (activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    }
    
    return rows;
  } catch (error) {
    console.error("Error fetching user activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get activities for a specific community
 */
export async function getCommunityActivities(communityId: string, options: ActivityOptions = {}): Promise<Activity[]> {
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
    
    const queryParams: any[] = [communityId, communityId, communityId];
    
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
    queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));
    
    const [rows] = await conn.query<ActivityRow[]>(query, queryParams);
    
    // Enrich activities with entity details
    if (Array.isArray(rows)) {
      for (let activity of rows) {
        if (activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    }
    
    return rows;
  } catch (error) {
    console.error("Error fetching community activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get activities for a specific post
 */
export async function getPostActivities(postId: string, options: ActivityOptions = {}): Promise<Activity[]> {
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
    
    const [rows] = await conn.query<ActivityRow[]>(query, [postId, postId, parseInt(limit.toString()), parseInt(offset.toString())]);
    
    // Enrich activities with entity details
    if (Array.isArray(rows)) {
      for (let activity of rows) {
        if (activity.entity_id && activity.entity_type) {
          try {
            const entityDetails = await getEntityDetails(conn, activity.entity_id, activity.entity_type);
            activity.entity_details = entityDetails;
          } catch (detailsError) {
            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
            activity.entity_details = null;
          }
        }
      }
    }
    
    return rows;
  } catch (error) {
    console.error("Error fetching post activities:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get all activity types
 */
export async function getActivityTypes(): Promise<ActivityType[]> {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const [rows] = await conn.query<(ActivityType & RowDataPacket)[]>("SELECT * FROM activity_type ORDER BY name");
    
    return rows || [];
  } catch (error) {
    console.error("Error fetching activity types:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Get all action types
 */
export async function getActionTypes(): Promise<ActionType[]> {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const [rows] = await conn.query<(ActionType & RowDataPacket)[]>("SELECT * FROM action ORDER BY name");
    
    return rows || [];
  } catch (error) {
    console.error("Error fetching action types:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Log an activity
 */
export async function logActivity(activityData: ActivityData): Promise<Activity | null> {
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
    const [activityTypeRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM activity_type WHERE name = ?",
      [activityType]
    );
    
    let activityTypeId: string;
    if (!activityTypeRows || activityTypeRows.length === 0) {
      // Create the activity type if it doesn't exist
      console.warn(`Activity type '${activityType}' not found, creating it.`);
      activityTypeId = uuidv4();
      await conn.query(
        "INSERT INTO activity_type (id, name) VALUES (?, ?)",
        [activityTypeId, activityType]
      );
    } else {
      activityTypeId = activityTypeRows[0].id;
    }
    
    // Get action type ID
    const [actionTypeRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM action WHERE name = ?",
      [actionType]
    );
    
    let actionTypeId: string;
    if (!actionTypeRows || actionTypeRows.length === 0) {
      // Create the action type if it doesn't exist
      console.warn(`Action type '${actionType}' not found, creating it.`);
      actionTypeId = uuidv4();
      await conn.query(
        "INSERT INTO action (id, name) VALUES (?, ?)",
        [actionTypeId, actionType]
      );
    } else {
      actionTypeId = actionTypeRows[0].id;
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
        activityTypeId,
        actionTypeId,
        entityId,
        entityType,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent
      ]
    );
    
    // Get the created activity
    const [activityRows] = await conn.query<ActivityRow[]>(
      `SELECT a.*, at.name as activity_type_name, act.name as action_name
       FROM activity a
       JOIN activity_type at ON a.activity_type_id = at.id
       JOIN action act ON a.action_id = act.id
       WHERE a.id = ?`,
      [activityId]
    );
    
    return activityRows && activityRows.length > 0 ? activityRows[0] : null;
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
 */
async function getEntityDetails(conn: any, entityId: string, entityType: string): Promise<any | null> {
  if (!entityId || !entityType) {
    return null;
  }
  
  try {
    switch (entityType) {
      case 'post': {
        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT p.id, p.title, p.content, p.community_id, c.name as community_name, u.username
           FROM post p
           LEFT JOIN community c ON p.community_id = c.id
           LEFT JOIN user u ON p.user_id = u.id
           WHERE p.id = ?`,
          [entityId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
      }
      case 'comment': {
        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT c.id, c.content, c.post_id, p.title as post_title, u.username
           FROM comment c
           LEFT JOIN post p ON c.post_id = p.id
           LEFT JOIN user u ON c.user_id = u.id
           WHERE c.id = ?`,
          [entityId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
      }
      case 'community': {
        const [rows] = await conn.query<RowDataPacket[]>(
          "SELECT id, name, description FROM community WHERE id = ?",
          [entityId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
      }
      case 'user': {
        const [rows] = await conn.query<RowDataPacket[]>(
          "SELECT id, username, display_name FROM user WHERE id = ?",
          [entityId]
        );
        return rows && rows.length > 0 ? rows[0] : null;
      }
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error getting ${entityType} details:`, error);
    return null;
  }
}