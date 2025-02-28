// backend/api/moderation.ts
import { v4 as uuidv4 } from 'uuid';
import mariadb from 'mariadb';
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
    target_id: string | null;
    target_type: string | null;
    reason: string | null;
    created_at: Date;
}

export interface BannedUser {
    community_id: string;
    user_id: string;
    reason: string | null;
    banned_by: string;
    ban_expires_at: Date | null;
    created_at: Date;
}

// Helper function to check if a user has moderator permissions
export async function isUserModerator(communityId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [member] = await conn.query(
            "SELECT role FROM community_members WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        return member && (member.role === 'moderator' || member.role === 'admin');
    } catch (error) {
        console.error("Error checking moderator status:", error);
        throw new Error('Failed to check moderator status');
    } finally {
        if (conn) conn.end();
    }
}

// Helper function to check specific moderator permissions
export async function hasModeratorPermission(
    communityId: string, 
    userId: string, 
    permission: 'can_manage_settings' | 'can_manage_members' | 'can_manage_posts' | 'can_manage_comments'
): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // First check if user is a moderator or admin
        const isModerator = await isUserModerator(communityId, userId);
        if (!isModerator) {
            return false;
        }
        
        // Check for specific permission
        const [permissions] = await conn.query(
            `SELECT ${permission} FROM moderator_permissions WHERE community_id = ? AND user_id = ?`,
            [communityId, userId]
        );
        
        // If no specific permissions set, check if admin (admins have all permissions)
        if (!permissions) {
            const [member] = await conn.query(
                "SELECT role FROM community_members WHERE community_id = ? AND user_id = ?",
                [communityId, userId]
            );
            
            return member && member.role === 'admin';
        }
        
        return !!permissions[permission];
    } catch (error) {
        console.error(`Error checking moderator permission (${permission}):`, error);
        throw new Error(`Failed to check moderator permission: ${permission}`);
    } finally {
        if (conn) conn.end();
    }
}

// Moderator Permissions CRUD
export async function getModeratorPermissions(communityId: string, userId: string): Promise<ModeratorPermission | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [permissions] = await conn.query(
            "SELECT * FROM moderator_permissions WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        return permissions || null;
    } catch (error) {
        console.error("Error fetching moderator permissions:", error);
        throw new Error('Failed to fetch moderator permissions');
    } finally {
        if (conn) conn.end();
    }
}

export async function setModeratorPermissions(
    communityId: string, 
    userId: string, 
    permissions: ModeratorPermissionInput
): Promise<ModeratorPermission | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is a moderator or admin
        const [member] = await conn.query(
            "SELECT role FROM community_members WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!member || (member.role !== 'moderator' && member.role !== 'admin')) {
            throw new Error('User is not a moderator or admin of this community');
        }
        
        // Check if permissions already exist
        const [existingPermissions] = await conn.query(
            "SELECT * FROM moderator_permissions WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingPermissions) {
            // Update existing permissions
            const updates: string[] = [];
            const values: any[] = [];
            
            if (permissions.can_manage_settings !== undefined) {
                updates.push("can_manage_settings = ?");
                values.push(permissions.can_manage_settings);
            }
            
            if (permissions.can_manage_members !== undefined) {
                updates.push("can_manage_members = ?");
                values.push(permissions.can_manage_members);
            }
            
            if (permissions.can_manage_posts !== undefined) {
                updates.push("can_manage_posts = ?");
                values.push(permissions.can_manage_posts);
            }
            
            if (permissions.can_manage_comments !== undefined) {
                updates.push("can_manage_comments = ?");
                values.push(permissions.can_manage_comments);
            }
            
            if (updates.length > 0) {
                values.push(communityId);
                values.push(userId);
                
                await conn.query(
                    `UPDATE moderator_permissions SET ${updates.join(", ")} WHERE community_id = ? AND user_id = ?`,
                    values
                );
            }
        } else {
            // Create new permissions
            await conn.query(
                `INSERT INTO moderator_permissions (
                    community_id, 
                    user_id, 
                    can_manage_settings, 
                    can_manage_members, 
                    can_manage_posts, 
                    can_manage_comments
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    communityId,
                    userId,
                    permissions.can_manage_settings !== undefined ? permissions.can_manage_settings : false,
                    permissions.can_manage_members !== undefined ? permissions.can_manage_members : false,
                    permissions.can_manage_posts !== undefined ? permissions.can_manage_posts : false,
                    permissions.can_manage_comments !== undefined ? permissions.can_manage_comments : false
                ]
            );
        }
        
        // Return the updated permissions
        return await getModeratorPermissions(communityId, userId);
    } catch (error) {
        console.error("Error setting moderator permissions:", error);
        throw new Error('Failed to set moderator permissions');
    } finally {
        if (conn) conn.end();
    }
}

// Enhanced Community Settings CRUD
export async function getEnhancedCommunitySettings(communityId: string): Promise<ExtendedCommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [settings] = await conn.query(
            "SELECT * FROM community_settings WHERE community_id = ?",
            [communityId]
        );
        
        if (!settings) {
            // Create default settings if they don't exist
            await conn.query(
                `INSERT INTO community_settings (
                    community_id, 
                    allow_post_images, 
                    allow_post_links,
                    require_post_approval,
                    minimum_account_age_days,
                    minimum_karma_required
                ) VALUES (?, TRUE, TRUE, FALSE, 0, 0)`,
                [communityId]
            );
            
            const [newSettings] = await conn.query(
                "SELECT * FROM community_settings WHERE community_id = ?",
                [communityId]
            );
            
            return newSettings;
        }
        
        return settings;
    } catch (error) {
        console.error("Error fetching enhanced community settings:", error);
        throw new Error('Failed to fetch enhanced community settings');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateEnhancedCommunitySettings(
    communityId: string, 
    settings: ExtendedCommunitySettingsInput
): Promise<ExtendedCommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if settings exist
        const [existingSettings] = await conn.query(
            "SELECT * FROM community_settings WHERE community_id = ?",
            [communityId]
        );
        
        if (!existingSettings) {
            // Create settings with provided values if they don't exist
            const insertColumns: string[] = ["community_id"];
            const placeholders: string[] = ["?"];
            const values: any[] = [communityId];
            
            // Build dynamic insert query based on provided settings
            Object.entries(settings).forEach(([key, value]) => {
                if (value !== undefined) {
                    insertColumns.push(key);
                    placeholders.push("?");
                    values.push(value);
                }
            });
            
            await conn.query(
                `INSERT INTO community_settings (${insertColumns.join(", ")}) VALUES (${placeholders.join(", ")})`,
                values
            );
        } else {
            // Update existing settings
            const updates: string[] = [];
            const values: any[] = [];
            
            Object.entries(settings).forEach(([key, value]) => {
                if (value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            });
            
            if (updates.length > 0) {
                values.push(communityId);
                
                await conn.query(
                    `UPDATE community_settings SET ${updates.join(", ")}, updated_at = NOW() WHERE community_id = ?`,
                    values
                );
            }
        }
        
        // Return the updated settings
        return await getEnhancedCommunitySettings(communityId);
    } catch (error) {
        console.error("Error updating enhanced community settings:", error);
        throw new Error('Failed to update enhanced community settings');
    } finally {
        if (conn) conn.end();
    }
}

// Post Moderation functions
export async function getPostModerationStatus(postId: string): Promise<PostModeration | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const [status] = await conn.query(
            "SELECT * FROM post_moderation WHERE post_id = ?",
            [postId]
        );
        
        return status || null;
    } catch (error) {
        console.error("Error fetching post moderation status:", error);
        throw new Error('Failed to fetch post moderation status');
    } finally {
        if (conn) conn.end();
    }
}

export async function addPostToModQueue(postId: string): Promise<PostModeration> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if post already in moderation queue
        const [existingModeration] = await conn.query(
            "SELECT * FROM post_moderation WHERE post_id = ?",
            [postId]
        );
        
        if (existingModeration) {
            return existingModeration;
        }
        
        // Add post to moderation queue
        await conn.query(
            "INSERT INTO post_moderation (post_id, status) VALUES (?, 'pending')",
            [postId]
        );
        
        const [newModeration] = await conn.query(
            "SELECT * FROM post_moderation WHERE post_id = ?",
            [postId]
        );
        
        return newModeration;
    } catch (error) {
        console.error("Error adding post to moderation queue:", error);
        throw new Error('Failed to add post to moderation queue');
    } finally {
        if (conn) conn.end();
    }
}

export async function moderatePost(
    postId: string, 
    moderatorId: string, 
    action: 'approve' | 'reject', 
    reason?: string
): Promise<PostModeration> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get post information to log the action
        const [post] = await conn.query(
            "SELECT community_id FROM posts WHERE id = ?",
            [postId]
        );
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        // Update post moderation status
        await conn.query(
            "UPDATE post_moderation SET status = ?, moderator_id = ?, reason = ?, moderated_at = NOW() WHERE post_id = ?",
            [action === 'approve' ? 'approved' : 'rejected', moderatorId, reason || null, postId]
        );
        
        // Log the moderation action
        await createModerationLog(
            post.community_id,
            moderatorId,
            action === 'approve' ? 'approve_post' : 'reject_post',
            postId,
            'post',
            reason
        );
        
        // Retrieve and return updated moderation status
        const [updatedModeration] = await conn.query(
            "SELECT * FROM post_moderation WHERE post_id = ?",
            [postId]
        );
        
        return updatedModeration;
    } catch (error) {
        console.error("Error moderating post:", error);
        throw new Error('Failed to moderate post');
    } finally {
        if (conn) conn.end();
    }
}

export async function getPendingModQueue(communityId: string): Promise<any[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get all pending posts for the community
        const pendingPosts = await conn.query(
            `SELECT p.*, pm.status, pm.created_at as queued_at, u.username as author_username
             FROM posts p
             JOIN post_moderation pm ON p.id = pm.post_id
             JOIN users u ON p.user_id = u.id
             WHERE p.community_id = ? AND pm.status = 'pending'
             ORDER BY pm.created_at ASC`,
            [communityId]
        );
        
        return pendingPosts;
    } catch (error) {
        console.error("Error fetching pending moderation queue:", error);
        throw new Error('Failed to fetch pending moderation queue');
    } finally {
        if (conn) conn.end();
    }
}

// Moderation Log functions
export async function createModerationLog(
    communityId: string,
    moderatorId: string,
    actionType: string,
    targetId?: string,
    targetType?: string,
    reason?: string
): Promise<ModerationLog> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const id = uuidv4();
        
        await conn.query(
            `INSERT INTO moderation_logs (
                id, 
                community_id, 
                moderator_id, 
                action_type, 
                target_id, 
                target_type, 
                reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, communityId, moderatorId, actionType, targetId || null, targetType || null, reason || null]
        );
        
        const [log] = await conn.query(
            "SELECT * FROM moderation_logs WHERE id = ?",
            [id]
        );
        
        return log;
    } catch (error) {
        console.error("Error creating moderation log:", error);
        throw new Error('Failed to create moderation log');
    } finally {
        if (conn) conn.end();
    }
}

export async function getModerationLogs(communityId: string, limit = 50, offset = 0): Promise<ModerationLog[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const logs = await conn.query(
            `SELECT ml.*, u.username as moderator_username 
             FROM moderation_logs ml
             JOIN users u ON ml.moderator_id = u.id
             WHERE ml.community_id = ?
             ORDER BY ml.created_at DESC
             LIMIT ? OFFSET ?`,
            [communityId, limit, offset]
        );
        
        return logs;
    } catch (error) {
        console.error("Error fetching moderation logs:", error);
        throw new Error('Failed to fetch moderation logs');
    } finally {
        if (conn) conn.end();
    }
}

// User banning functions
export async function banUserFromCommunity(
    communityId: string,
    userId: string,
    bannedBy: string,
    reason?: string,
    banDuration?: number // Duration in days, null for permanent
): Promise<BannedUser> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Calculate expiration date if duration provided
        let banExpiresAt = null;
        if (banDuration) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + banDuration);
            banExpiresAt = expirationDate;
        }
        
        // Check if user is already banned
        const [existingBan] = await conn.query(
            "SELECT * FROM banned_users WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingBan) {
            // Update existing ban
            await conn.query(
                "UPDATE banned_users SET reason = ?, banned_by = ?, ban_expires_at = ? WHERE community_id = ? AND user_id = ?",
                [reason || null, bannedBy, banExpiresAt, communityId, userId]
            );
        } else {
            // Create new ban
            await conn.query(
                "INSERT INTO banned_users (community_id, user_id, reason, banned_by, ban_expires_at) VALUES (?, ?, ?, ?, ?)",
                [communityId, userId, reason || null, bannedBy, banExpiresAt]
            );
            
            // Remove user from community members if they're a member
            await conn.query(
                "DELETE FROM community_members WHERE community_id = ? AND user_id = ?",
                [communityId, userId]
            );
        }
        
        // Log the ban action
        await createModerationLog(
            communityId,
            bannedBy,
            'ban_user',
            userId,
            'user',
            reason
        );
        
        const [ban] = await conn.query(
            "SELECT * FROM banned_users WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        return ban;
    } catch (error) {
        console.error("Error banning user from community:", error);
        throw new Error('Failed to ban user from community');
    } finally {
        if (conn) conn.end();
    }
}

export async function unbanUserFromCommunity(
    communityId: string,
    userId: string,
    unbannedBy: string,
    reason?: string
): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user is banned
        const [existingBan] = await conn.query(
            "SELECT * FROM banned_users WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!existingBan) {
            return false; // User wasn't banned
        }
        
        // Remove ban
        await conn.query(
            "DELETE FROM banned_users WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        // Log the unban action
        await createModerationLog(
            communityId,
            unbannedBy,
            'unban_user',
            userId,
            'user',
            reason
        );
        
        return true;
    } catch (error) {
        console.error("Error unbanning user from community:", error);
        throw new Error('Failed to unban user from community');
    } finally {
        if (conn) conn.end();
    }
}

export async function getBannedUsers(communityId: string): Promise<any[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const bannedUsers = await conn.query(
            `SELECT bu.*, 
                    u.username as banned_username, 
                    m.username as moderator_username
             FROM banned_users bu
             JOIN users u ON bu.user_id = u.id
             JOIN users m ON bu.banned_by = m.id
             WHERE bu.community_id = ?
             ORDER BY bu.created_at DESC`,
            [communityId]
        );
        
        return bannedUsers;
    } catch (error) {
        console.error("Error fetching banned users:", error);
        throw new Error('Failed to fetch banned users');
    } finally {
        if (conn) conn.end();
    }
}

export async function isUserBanned(communityId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check for active bans
        const [ban] = await conn.query(
            "SELECT * FROM banned_users WHERE community_id = ? AND user_id = ? AND (ban_expires_at IS NULL OR ban_expires_at > NOW())",
            [communityId, userId]
        );
        
        return !!ban;
    } catch (error) {
        console.error("Error checking if user is banned:", error);
        throw new Error('Failed to check if user is banned');
    } finally {
        if (conn) conn.end();
    }
}