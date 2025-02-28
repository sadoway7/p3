// backend/api/moderation.ts
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// Types
export interface ModeratorPermission {
    community_id: string;
    user_id: string;
    can_manage_settings: boolean;
    can_manage_members: boolean;
    can_manage_posts: boolean;
    can_manage_comments: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface ModeratorPermissionInput {
    can_manage_settings?: boolean;
    can_manage_members?: boolean;
    can_manage_posts?: boolean;
    can_manage_comments?: boolean;
}

export interface ExtendedCommunitySettings {
    community_id: string;
    allow_post_images: boolean;
    allow_post_links: boolean;
    require_post_approval: boolean;
    restricted_words: string | null;
    custom_theme_color: string | null;
    custom_banner_url: string | null;
    minimum_account_age_days: number;
    minimum_karma_required: number;
    updated_at: Date;
}

export interface ExtendedCommunitySettingsInput {
    allow_post_images?: boolean;
    allow_post_links?: boolean;
    require_post_approval?: boolean;
    restricted_words?: string;
    custom_theme_color?: string;
    custom_banner_url?: string;
    minimum_account_age_days?: number;
    minimum_karma_required?: number;
}

export interface PostModeration {
    post_id: string;
    status: 'pending' | 'approved' | 'rejected';
    moderator_id: string | null;
    reason: string | null;
    moderated_at: Date | null;
    created_at: Date;
}

export interface ModerationLog {
    id: string;
    community_id: string;
    moderator_id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    reason: string | null;
    metadata: any | null;
    created_at: Date;
}

export interface BannedUser {
    community_id: string;
    user_id: string;
    reason: string | null;
    banned_by: string;
    expires_at: Date | null;
    created_at: Date;
}

// Define interfaces for query results
interface ModeratorPermissionRow extends RowDataPacket, ModeratorPermission {}
interface CommunitySettingsRow extends RowDataPacket, ExtendedCommunitySettings {}
interface PostModerationRow extends RowDataPacket, PostModeration {}
interface ModerationLogRow extends RowDataPacket, ModerationLog {}
interface BannedUserRow extends RowDataPacket, BannedUser {}
interface UserRow extends RowDataPacket {
    id: string;
    username: string;
    role: string;
}

/**
 * Check if a user is a moderator for a community
 */
export async function isModerator(userId: string, communityId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is a community moderator or admin
        const [rows] = await conn.query<UserRow[]>(
            `SELECT role FROM community_member 
             WHERE community_id = ? AND user_id = ? 
             AND (role = 'moderator' OR role = 'admin')`,
            [communityId, userId]
        );
        
        if (!rows || rows.length === 0) {
            return false;
        }
        
        const member = rows[0];
        return Boolean(member && (member.role === 'moderator' || member.role === 'admin'));
    } catch (error) {
        console.error('Error checking if user is moderator:', error);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Check if a moderator has a specific permission
 */
export async function hasModeratorPermission(
    userId: string, 
    communityId: string, 
    permission: 'can_manage_settings' | 'can_manage_members' | 'can_manage_posts' | 'can_manage_comments'
): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // First, check if user is community admin (can do everything)
        const [memberRows] = await conn.query<UserRow[]>(
            `SELECT role FROM community_member 
             WHERE community_id = ? AND user_id = ? AND role = 'admin'`,
            [communityId, userId]
        );
        
        const member = memberRows && memberRows.length > 0 ? memberRows[0] : null;
        if (member && member.role === 'admin') {
            return true;
        }
        
        // Check specific permission
        const [permissionRows] = await conn.query<ModeratorPermissionRow[]>(
            `SELECT * FROM moderator_permission 
             WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        const permissions = permissionRows && permissionRows.length > 0 ? permissionRows[0] : null;
        return permissions ? Boolean(permissions[permission]) : false;
    } catch (error) {
        console.error('Error checking moderator permission:', error);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Get moderator permissions for a user in a community
 */
export async function getModeratorPermissions(
    userId: string, 
    communityId: string
): Promise<ModeratorPermission | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [rows] = await conn.query<ModeratorPermissionRow[]>(
            `SELECT * FROM moderator_permission 
             WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error getting moderator permissions:', error);
        return null;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Update moderator permissions
 */
export async function updateModeratorPermissions(
    userId: string, 
    communityId: string, 
    permissions: ModeratorPermissionInput
): Promise<ModeratorPermission | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is a moderator
        const [memberRows] = await conn.query<UserRow[]>(
            `SELECT role FROM community_member 
             WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        const member = memberRows && memberRows.length > 0 ? memberRows[0] : null;
        if (!member || (member.role !== 'moderator' && member.role !== 'admin')) {
            throw new Error('User is not a moderator of this community');
        }
        
        // Get existing permissions
        const [existingRows] = await conn.query<ModeratorPermissionRow[]>(
            `SELECT * FROM moderator_permission 
             WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        const now = new Date();
        
        if (existingRows && existingRows.length > 0) {
            // Update existing permissions
            await conn.query(
                `UPDATE moderator_permission SET
                 can_manage_settings = ?,
                 can_manage_members = ?,
                 can_manage_posts = ?,
                 can_manage_comments = ?,
                 updated_at = ?
                 WHERE community_id = ? AND user_id = ?`,
                [
                    permissions.can_manage_settings !== undefined ? permissions.can_manage_settings : existingRows[0].can_manage_settings,
                    permissions.can_manage_members !== undefined ? permissions.can_manage_members : existingRows[0].can_manage_members,
                    permissions.can_manage_posts !== undefined ? permissions.can_manage_posts : existingRows[0].can_manage_posts,
                    permissions.can_manage_comments !== undefined ? permissions.can_manage_comments : existingRows[0].can_manage_comments,
                    now,
                    communityId,
                    userId
                ]
            );
        } else {
            // Create new permissions
            await conn.query(
                `INSERT INTO moderator_permission (
                 community_id, user_id, can_manage_settings, can_manage_members,
                 can_manage_posts, can_manage_comments, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    communityId,
                    userId,
                    permissions.can_manage_settings !== undefined ? permissions.can_manage_settings : true,
                    permissions.can_manage_members !== undefined ? permissions.can_manage_members : true,
                    permissions.can_manage_posts !== undefined ? permissions.can_manage_posts : true,
                    permissions.can_manage_comments !== undefined ? permissions.can_manage_comments : true,
                    now,
                    now
                ]
            );
        }
        
        // Get updated permissions
        const [updatedRows] = await conn.query<ModeratorPermissionRow[]>(
            `SELECT * FROM moderator_permission 
             WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        return updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;
    } catch (error) {
        console.error('Error updating moderator permissions:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Get community settings
 */
export async function getCommunitySettings(communityId: string): Promise<ExtendedCommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [rows] = await conn.query<CommunitySettingsRow[]>(
            `SELECT * FROM community_setting 
             WHERE community_id = ?`,
            [communityId]
        );
        
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error getting community settings:', error);
        return null;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Update community settings
 */
export async function updateCommunitySettings(
    communityId: string, 
    settings: ExtendedCommunitySettingsInput,
    moderatorId: string
): Promise<ExtendedCommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if settings already exist
        const [existingRows] = await conn.query<CommunitySettingsRow[]>(
            `SELECT * FROM community_setting 
             WHERE community_id = ?`,
            [communityId]
        );
        
        const now = new Date();
        
        await conn.beginTransaction();
        
        try {
            if (existingRows && existingRows.length > 0) {
                // Update existing settings
                await conn.query(
                    `UPDATE community_setting SET
                     allow_post_images = ?,
                     allow_post_links = ?,
                     require_post_approval = ?,
                     restricted_words = ?,
                     custom_theme_color = ?,
                     custom_banner_url = ?,
                     minimum_account_age_days = ?,
                     minimum_karma_required = ?,
                     updated_at = ?
                     WHERE community_id = ?`,
                    [
                        settings.allow_post_images !== undefined ? settings.allow_post_images : existingRows[0].allow_post_images,
                        settings.allow_post_links !== undefined ? settings.allow_post_links : existingRows[0].allow_post_links,
                        settings.require_post_approval !== undefined ? settings.require_post_approval : existingRows[0].require_post_approval,
                        settings.restricted_words !== undefined ? settings.restricted_words : existingRows[0].restricted_words,
                        settings.custom_theme_color !== undefined ? settings.custom_theme_color : existingRows[0].custom_theme_color,
                        settings.custom_banner_url !== undefined ? settings.custom_banner_url : existingRows[0].custom_banner_url,
                        settings.minimum_account_age_days !== undefined ? settings.minimum_account_age_days : existingRows[0].minimum_account_age_days,
                        settings.minimum_karma_required !== undefined ? settings.minimum_karma_required : existingRows[0].minimum_karma_required,
                        now,
                        communityId
                    ]
                );
            } else {
                // Create new settings
                await conn.query(
                    `INSERT INTO community_setting (
                     community_id, allow_post_images, allow_post_links, require_post_approval,
                     restricted_words, custom_theme_color, custom_banner_url,
                     minimum_account_age_days, minimum_karma_required, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        communityId,
                        settings.allow_post_images !== undefined ? settings.allow_post_images : true,
                        settings.allow_post_links !== undefined ? settings.allow_post_links : true,
                        settings.require_post_approval !== undefined ? settings.require_post_approval : false,
                        settings.restricted_words || null,
                        settings.custom_theme_color || null,
                        settings.custom_banner_url || null,
                        settings.minimum_account_age_days !== undefined ? settings.minimum_account_age_days : 0,
                        settings.minimum_karma_required !== undefined ? settings.minimum_karma_required : 0,
                        now
                    ]
                );
            }
            
            // Log the settings update
            await logModerationAction(
                communityId,
                moderatorId,
                'UPDATE',
                'SETTINGS',
                communityId,
                null,
                { settings }
            );
            
            await conn.commit();
            
            // Get updated settings
            const [newSettingsRows] = await conn.query<CommunitySettingsRow[]>(
                `SELECT * FROM community_setting 
                 WHERE community_id = ?`,
                [communityId]
            );
            
            return newSettingsRows && newSettingsRows.length > 0 ? newSettingsRows[0] : null;
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error updating community settings:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Get post moderation status
 */
export async function getPostModerationStatus(postId: string): Promise<PostModeration | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [rows] = await conn.query<PostModerationRow[]>(
            `SELECT * FROM post_moderation 
             WHERE post_id = ?`,
            [postId]
        );
        
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error('Error getting post moderation status:', error);
        return null;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Update post moderation status
 */
export async function updatePostModerationStatus(
    postId: string,
    status: 'pending' | 'approved' | 'rejected',
    moderatorId: string,
    reason?: string
): Promise<PostModeration> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        await conn.beginTransaction();
        
        try {
            // Check if post moderation entry exists
            const [existingRows] = await conn.query<PostModerationRow[]>(
                `SELECT * FROM post_moderation 
                 WHERE post_id = ?`,
                [postId]
            );
            
            const now = new Date();
            
            if (existingRows && existingRows.length > 0) {
                // Update existing moderation status
                await conn.query(
                    `UPDATE post_moderation SET
                     status = ?,
                     moderator_id = ?,
                     reason = ?,
                     moderated_at = ?
                     WHERE post_id = ?`,
                    [
                        status,
                        moderatorId,
                        reason || null,
                        now,
                        postId
                    ]
                );
                
                // Get the post's community ID for logging
                const [postRows] = await conn.query<RowDataPacket[]>(
                    `SELECT community_id FROM post 
                     WHERE id = ?`,
                    [postId]
                );
                
                // Log the moderation action
                if (postRows && postRows.length > 0) {
                    await logModerationAction(
                        postRows[0].community_id,
                        moderatorId,
                        status === 'approved' ? 'APPROVE' : 'REJECT',
                        'POST',
                        postId,
                        reason || null,
                        { previousStatus: existingRows[0].status }
                    );
                }
                
                await conn.commit();
                
                // Get updated moderation status
                const [updatedRows] = await conn.query<PostModerationRow[]>(
                    `SELECT * FROM post_moderation 
                     WHERE post_id = ?`,
                    [postId]
                );
                
                if (!updatedRows || updatedRows.length === 0) {
                    throw new Error("Failed to retrieve updated post moderation status");
                }
                
                return updatedRows[0];
            } else {
                // Create new moderation status
                await conn.query(
                    `INSERT INTO post_moderation (
                     post_id, status, moderator_id, reason, moderated_at, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        postId,
                        status,
                        moderatorId,
                        reason || null,
                        status === 'pending' ? null : now,
                        now
                    ]
                );
                
                // Get the post's community ID for logging
                const [postRows] = await conn.query<RowDataPacket[]>(
                    `SELECT community_id FROM post 
                     WHERE id = ?`,
                    [postId]
                );
                
                // Log the moderation action (only for approvals/rejections)
                if (status !== 'pending' && postRows && postRows.length > 0) {
                    await logModerationAction(
                        postRows[0].community_id,
                        moderatorId,
                        status === 'approved' ? 'APPROVE' : 'REJECT',
                        'POST',
                        postId,
                        reason || null,
                        null
                    );
                }
                
                await conn.commit();
                
                // Get new moderation status
                const [newRows] = await conn.query<PostModerationRow[]>(
                    `SELECT * FROM post_moderation 
                     WHERE post_id = ?`,
                    [postId]
                );
                
                if (!newRows || newRows.length === 0) {
                    throw new Error("Failed to retrieve created post moderation status");
                }
                
                return newRows[0];
            }
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error updating post moderation status:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Log a moderation action
 */
export async function logModerationAction(
    communityId: string,
    moderatorId: string,
    actionType: string,
    entityType: string,
    entityId: string,
    reason: string | null,
    metadata: any | null
): Promise<ModerationLog> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const id = uuidv4();
        const now = new Date();
        
        await conn.query(
            `INSERT INTO moderation_log (
             id, community_id, moderator_id, action_type, entity_type,
             entity_id, reason, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                communityId,
                moderatorId,
                actionType,
                entityType,
                entityId,
                reason,
                metadata ? JSON.stringify(metadata) : null,
                now
            ]
        );
        
        // Get the created log entry
        const [rows] = await conn.query<ModerationLogRow[]>(
            `SELECT * FROM moderation_log 
             WHERE id = ?`,
            [id]
        );
        
        if (!rows || rows.length === 0) {
            throw new Error("Failed to retrieve created moderation log");
        }
        
        return rows[0];
    } catch (error) {
        console.error('Error logging moderation action:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Get moderation logs for a community
 */
export async function getModerationLogs(
    communityId: string,
    limit: number = 20,
    offset: number = 0
): Promise<ModerationLog[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [rows] = await conn.query<ModerationLogRow[]>(
            `SELECT ml.*, u.username as moderator_username
             FROM moderation_log ml
             JOIN user u ON ml.moderator_id = u.id
             WHERE ml.community_id = ?
             ORDER BY ml.created_at DESC
             LIMIT ? OFFSET ?`,
            [communityId, limit, offset]
        );
        
        return rows || [];
    } catch (error) {
        console.error('Error getting moderation logs:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Ban a user from a community
 */
export async function banUserFromCommunity(
    communityId: string,
    userId: string,
    moderatorId: string,
    reason: string | null,
    expiresAt: Date | null
): Promise<BannedUser> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        await conn.beginTransaction();
        
        try {
            // Delete existing community membership
            await conn.query(
                `DELETE FROM community_member 
                 WHERE community_id = ? AND user_id = ?`,
                [communityId, userId]
            );
            
            // Create ban record
            const now = new Date();
            
            await conn.query(
                `INSERT INTO banned_user (
                 community_id, user_id, reason, banned_by, expires_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    communityId,
                    userId,
                    reason,
                    moderatorId,
                    expiresAt,
                    now
                ]
            );
            
            // Log the moderation action
            await logModerationAction(
                communityId,
                moderatorId,
                'BAN',
                'USER',
                userId,
                reason,
                { expiresAt }
            );
            
            await conn.commit();
            
            // Get the ban record
            const [rows] = await conn.query<BannedUserRow[]>(
                `SELECT * FROM banned_user 
                 WHERE community_id = ? AND user_id = ?`,
                [communityId, userId]
            );
            
            if (!rows || rows.length === 0) {
                throw new Error("Failed to retrieve ban record");
            }
            
            return rows[0];
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error banning user from community:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Check if a user is banned from a community
 */
export async function isUserBanned(userId: string, communityId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check for an active ban
        const [rows] = await conn.query<BannedUserRow[]>(
            `SELECT * FROM banned_user 
             WHERE community_id = ? AND user_id = ? 
             AND (expires_at IS NULL OR expires_at > NOW())`,
            [communityId, userId]
        );
        
        return Boolean(rows && rows.length > 0);
    } catch (error) {
        console.error('Error checking if user is banned:', error);
        return false;
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Unban a user from a community
 */
export async function unbanUserFromCommunity(
    communityId: string,
    userId: string,
    moderatorId: string
): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        await conn.beginTransaction();
        
        try {
            // First, check if the user is banned
            const [banRows] = await conn.query<BannedUserRow[]>(
                `SELECT * FROM banned_user 
                 WHERE community_id = ? AND user_id = ?`,
                [communityId, userId]
            );
            
            if (!banRows || banRows.length === 0) {
                throw new Error('User is not banned from this community');
            }
            
            // Remove the ban
            await conn.query(
                `DELETE FROM banned_user 
                 WHERE community_id = ? AND user_id = ?`,
                [communityId, userId]
            );
            
            // Log the moderation action
            await logModerationAction(
                communityId,
                moderatorId,
                'UNBAN',
                'USER',
                userId,
                null,
                { previousBan: banRows[0] }
            );
            
            await conn.commit();
            
            return true;
        } catch (error) {
            await conn.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Error unbanning user from community:', error);
        throw error;
    } finally {
        if (conn) conn.release();
    }
}