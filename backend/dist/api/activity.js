"use strict";
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
exports.getUserActivities = getUserActivities;
exports.getCommunityActivities = getCommunityActivities;
exports.getPostActivities = getPostActivities;
exports.getActivityTypes = getActivityTypes;
exports.getActionTypes = getActionTypes;
exports.logActivity = logActivity;
const uuid_1 = require("uuid");
const connection_1 = __importDefault(require("../db/connection"));
/**
 * Get activities for a specific user
 */
function getUserActivities(userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, options = {}) {
        const { limit = 20, offset = 0, activityType, actionType, entityType, startDate, endDate } = options;
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
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
            queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));
            const [rows] = yield conn.query(query, queryParams);
            // Enrich activities with entity details
            if (Array.isArray(rows)) {
                for (let activity of rows) {
                    if (activity && activity.entity_id && activity.entity_type) {
                        try {
                            const entityDetails = yield getEntityDetails(conn, activity.entity_id, activity.entity_type);
                            activity.entity_details = entityDetails;
                        }
                        catch (detailsError) {
                            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
                            activity.entity_details = undefined;
                        }
                    }
                }
            }
            else {
                console.warn("Expected activities array but received:", typeof rows);
            }
            return rows;
        }
        catch (error) {
            console.error("Error fetching user activities:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Get activities for a specific community
 */
function getCommunityActivities(communityId_1) {
    return __awaiter(this, arguments, void 0, function* (communityId, options = {}) {
        const { limit = 20, offset = 0, activityType, actionType, entityType, startDate, endDate } = options;
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
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
            queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));
            const [rows] = yield conn.query(query, queryParams);
            // Enrich activities with entity details
            if (Array.isArray(rows)) {
                for (let activity of rows) {
                    if (activity && activity.entity_id && activity.entity_type) {
                        try {
                            const entityDetails = yield getEntityDetails(conn, activity.entity_id, activity.entity_type);
                            activity.entity_details = entityDetails;
                        }
                        catch (detailsError) {
                            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
                            activity.entity_details = undefined;
                        }
                    }
                }
            }
            else {
                console.warn("Expected activities array but received:", typeof rows);
            }
            return rows;
        }
        catch (error) {
            console.error("Error fetching community activities:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Get activities for a specific post
 */
function getPostActivities(postId_1) {
    return __awaiter(this, arguments, void 0, function* (postId, options = {}) {
        const { limit = 20, offset = 0 } = options;
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
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
            const [rows] = yield conn.query(query, [postId, postId, parseInt(limit.toString()), parseInt(offset.toString())]);
            // Enrich activities with entity details
            if (Array.isArray(rows)) {
                for (let activity of rows) {
                    if (activity && activity.entity_id && activity.entity_type) {
                        try {
                            const entityDetails = yield getEntityDetails(conn, activity.entity_id, activity.entity_type);
                            activity.entity_details = entityDetails;
                        }
                        catch (detailsError) {
                            console.error(`Error fetching details for ${activity.entity_type}:${activity.entity_id}`, detailsError);
                            activity.entity_details = undefined;
                        }
                    }
                }
            }
            else {
                console.warn("Expected activities array but received:", typeof rows);
            }
            return rows;
        }
        catch (error) {
            console.error("Error fetching post activities:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Get all activity types
 */
function getActivityTypes() {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
            const [rows] = yield conn.query("SELECT * FROM activity_type ORDER BY name");
            return rows;
        }
        catch (error) {
            console.error("Error fetching activity types:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Get all action types
 */
function getActionTypes() {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
            const [rows] = yield conn.query("SELECT * FROM action ORDER BY name");
            return rows;
        }
        catch (error) {
            console.error("Error fetching action types:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Log an activity
 */
function logActivity(activityData) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!activityData || !activityData.userId) {
            console.warn("Attempted to log activity without user ID:", activityData);
            return null;
        }
        const { userId, activityType, actionType, entityId, entityType, metadata, ipAddress, userAgent } = activityData;
        let conn;
        try {
            conn = yield connection_1.default.getConnection();
            // Get activity type ID
            const [activityTypeRows] = yield conn.query("SELECT id FROM activity_type WHERE name = ?", [activityType]);
            let activityTypeId;
            if (!activityTypeRows || (Array.isArray(activityTypeRows) && activityTypeRows.length === 0)) {
                // Create the activity type if it doesn't exist
                console.warn(`Activity type '${activityType}' not found, creating it.`);
                activityTypeId = (0, uuid_1.v4)();
                yield conn.query("INSERT INTO activity_type (id, name) VALUES (?, ?)", [activityTypeId, activityType]);
            }
            else {
                // Access as object with indexed property
                const rows = activityTypeRows;
                activityTypeId = rows[0]['id'];
            }
            // Get action type ID
            const [actionTypeRows] = yield conn.query("SELECT id FROM action WHERE name = ?", [actionType]);
            let actionTypeId;
            if (!actionTypeRows || (Array.isArray(actionTypeRows) && actionTypeRows.length === 0)) {
                // Create the action type if it doesn't exist
                console.warn(`Action type '${actionType}' not found, creating it.`);
                actionTypeId = (0, uuid_1.v4)();
                yield conn.query("INSERT INTO action (id, name) VALUES (?, ?)", [actionTypeId, actionType]);
            }
            else {
                // Access as object with indexed property
                const rows = actionTypeRows;
                actionTypeId = rows[0]['id'];
            }
            // Create activity
            const activityId = (0, uuid_1.v4)();
            yield conn.query(`INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, 
        metadata, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                activityId,
                userId,
                activityTypeId,
                actionTypeId,
                entityId,
                entityType,
                metadata ? JSON.stringify(metadata) : null,
                ipAddress,
                userAgent
            ]);
            // Get the created activity
            const [activityRows] = yield conn.query(`SELECT a.*, at.name as activity_type_name, act.name as action_name
       FROM activity a
       JOIN activity_type at ON a.activity_type_id = at.id
       JOIN action act ON a.action_id = act.id
       WHERE a.id = ?`, [activityId]);
            return Array.isArray(activityRows) && activityRows.length > 0 ? activityRows[0] : null;
        }
        catch (error) {
            console.error("Error logging activity:", error);
            // Don't throw - we don't want activity logging to break the application
            return null;
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
/**
 * Get entity details based on entity ID and type
 */
function getEntityDetails(conn, entityId, entityType) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!entityId || !entityType) {
            return null;
        }
        try {
            switch (entityType) {
                case 'post': {
                    const [rows] = yield conn.query(`SELECT p.id, p.title, p.content, p.community_id, c.name as community_name, u.username
           FROM post p
           LEFT JOIN community c ON p.community_id = c.id
           LEFT JOIN user u ON p.user_id = u.id
           WHERE p.id = ?`, [entityId]);
                    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                }
                case 'comment': {
                    const [rows] = yield conn.query(`SELECT c.id, c.content, c.post_id, p.title as post_title, u.username
           FROM comment c
           LEFT JOIN post p ON c.post_id = p.id
           LEFT JOIN user u ON c.user_id = u.id
           WHERE c.id = ?`, [entityId]);
                    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                }
                case 'community': {
                    const [rows] = yield conn.query("SELECT id, name, description FROM community WHERE id = ?", [entityId]);
                    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                }
                case 'user': {
                    const [rows] = yield conn.query("SELECT id, username, display_name FROM user WHERE id = ?", [entityId]);
                    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                }
                default:
                    return null;
            }
        }
        catch (error) {
            console.error(`Error getting ${entityType} details:`, error);
            return null;
        }
    });
}
