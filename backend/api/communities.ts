// backend/api/communities.ts
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

export interface Community {
    id: string;
    name: string;
    description: string;
    privacy?: 'public' | 'private';
    icon_url?: string;
    banner_url?: string;
    theme_color?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CommunityInput {
    name: string;
    description: string;
    privacy?: 'public' | 'private';
    icon_url?: string;
    banner_url?: string;
    theme_color?: string;
    creator_id?: string;
}

export interface CommunityRule {
    id: string;
    community_id: string;
    title: string;
    description: string;
    position: number;
    created_at: Date;
    updated_at: Date;
}

export interface CommunityRuleInput {
    title: string;
    description: string;
    position?: number;
}

export interface CommunitySettings {
    community_id: string;
    allow_post_images: boolean;
    allow_post_links: boolean;
    join_method: 'auto_approve' | 'requires_approval' | 'invite_only';
    require_post_approval: boolean;
    restricted_words: string | null;
    custom_theme_color: string | null;
    custom_banner_url: string | null;
    minimum_account_age_days: number;
    minimum_karma_required: number;
    updated_at: Date;
}

export interface CommunitySettingsInput {
    allow_post_images?: boolean;
    allow_post_links?: boolean;
    join_method?: 'auto_approve' | 'requires_approval' | 'invite_only';
    require_post_approval?: boolean;
    restricted_words?: string;
    custom_theme_color?: string;
    custom_banner_url?: string;
    minimum_account_age_days?: number;
    minimum_karma_required?: number;
}

export interface CommunityMember {
    community_id: string;
    user_id: string;
    username: string;
    role: 'member' | 'moderator' | 'admin';
    joined_at: Date;
}

export interface JoinRequest {
    id: string;
    community_id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_at: Date;
    updated_at: Date;
}

export async function getCommunities(): Promise<Community[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const communities = await conn.query("SELECT * FROM community");
        return communities;
    } catch (error) {
        console.error("Error fetching communities:", error);
        throw new Error('Failed to fetch communities');
    } finally {
        if (conn) conn.end();
    }
}

export async function getCommunity(communityId: string): Promise<Community | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        const [community] = await conn.query("SELECT * FROM community WHERE id = ?", [communityId]);
        return community || null;
    } catch (error) {
        console.error("Error fetching community:", error);
        throw new Error('Failed to fetch community');
    } finally {
        if (conn) conn.end();
    }
}

export async function createCommunity(communityData: CommunityInput): Promise<Community> {
    let conn;
    try {
        const id = uuidv4();
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Include all fields in the insert
        await conn.query(
            `INSERT INTO community (
                id, name, description, privacy, icon_url, banner_url, theme_color
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                communityData.name, 
                communityData.description, 
                communityData.privacy || 'public',
                communityData.icon_url || null,
                communityData.banner_url || null,
                communityData.theme_color || null
            ]
        );
        
        // Create default settings for the community
        await conn.query(
            `INSERT INTO community_setting (
                community_id, allow_post_images, allow_post_links, join_method,
                require_post_approval, restricted_words, custom_theme_color,
                custom_banner_url, minimum_account_age_days, minimum_karma_required,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                id,
                true, // allow_post_images
                true, // allow_post_links
                'auto_approve', // join_method
                false, // require_post_approval
                null, // restricted_words
                null, // custom_theme_color
                null, // custom_banner_url
                0, // minimum_account_age_days
                0, // minimum_karma_required
            ]
        );
        
        // Log the activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'CREATE'),
                ?, 'community', NOW()
            )`,
            [
                activityId, 
                communityData.creator_id || null, 
                id
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the created community
        const [newCommunity] = await conn.query("SELECT * FROM community WHERE id = ?", [id]);
        return newCommunity;
    } catch (error) {
        console.error("Error creating community:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to create community');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateCommunity(communityId: string, communityData: Partial<CommunityInput>, userId: string): Promise<Community | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Build the update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        
        if (communityData.name !== undefined) {
            updates.push("name = ?");
            values.push(communityData.name);
        }
        
        if (communityData.description !== undefined) {
            updates.push("description = ?");
            values.push(communityData.description);
        }
        
        if (communityData.privacy !== undefined) {
            updates.push("privacy = ?");
            values.push(communityData.privacy);
        }
        
        if (communityData.icon_url !== undefined) {
            updates.push("icon_url = ?");
            values.push(communityData.icon_url);
        }
        
        if (communityData.banner_url !== undefined) {
            updates.push("banner_url = ?");
            values.push(communityData.banner_url);
        }
        
        if (communityData.theme_color !== undefined) {
            updates.push("theme_color = ?");
            values.push(communityData.theme_color);
        }
        
        if (updates.length === 0) {
            // No fields to update
            return await getCommunity(communityId);
        }
        
        // Add the ID to the values array
        values.push(communityId);
        
        await conn.query(
            `UPDATE community SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
            values
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify(communityData)
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the updated community
        return await getCommunity(communityId);
    } catch (error) {
        console.error("Error updating community:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to update community');
    } finally {
        if (conn) conn.end();
    }
}

export async function deleteCommunity(communityId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Log activity before deletion
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'DELETE'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify({ community_id: communityId })
            ]
        );
        
        // Delete the community itself
        const result = await conn.query("DELETE FROM community WHERE id = ?", [communityId]);
        
        // Commit the transaction
        await conn.commit();
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error deleting community:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to delete community');
    } finally {
        if (conn) conn.end();
    }
}

// Community Rules operations
export async function getCommunityRules(communityId: string): Promise<CommunityRule[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const rules = await conn.query(
            "SELECT * FROM community_rule WHERE community_id = ?",
            [communityId]
        );
        return rules;
    } catch (error) {
        console.error("Error fetching community rules:", error);
        throw new Error('Failed to fetch community rules');
    } finally {
        if (conn) conn.end();
    }
}

export async function addCommunityRule(communityId: string, ruleData: CommunityRuleInput, userId: string): Promise<CommunityRule> {
    let conn;
    try {
        const id = uuidv4();
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        await conn.query(
            `INSERT INTO community_rule (
                id, community_id, title, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [
                id,
                communityId,
                ruleData.title,
                ruleData.description
            ]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                (SELECT id FROM action WHERE name = 'CREATE'),
                ?, 'community_rule', NOW()
            )`,
            [activityId, userId, id]
        );
        
        // Commit the transaction
        await conn.commit();
        
        const [newRule] = await conn.query(
            "SELECT * FROM community_rule WHERE id = ?",
            [id]
        );
        return newRule;
    } catch (error) {
        console.error("Error adding community rule:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to add community rule');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateCommunityRule(ruleId: string, ruleData: Partial<CommunityRuleInput>, userId: string): Promise<CommunityRule | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Build the update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];
        
        if (ruleData.title !== undefined) {
            updates.push("title = ?");
            values.push(ruleData.title);
        }
        
        if (ruleData.description !== undefined) {
            updates.push("description = ?");
            values.push(ruleData.description);
        }
        
        if (updates.length === 0) {
            // No fields to update
            const [rule] = await conn.query(
                "SELECT * FROM community_rule WHERE id = ?",
                [ruleId]
            );
            return rule || null;
        }
        
        // Add the ID to the values array
        values.push(ruleId);
        
        await conn.query(
            `UPDATE community_rule SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
            values
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community_rule', NOW()
            )`,
            [activityId, userId, ruleId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        const [updatedRule] = await conn.query(
            "SELECT * FROM community_rule WHERE id = ?",
            [ruleId]
        );
        return updatedRule || null;
    } catch (error) {
        console.error("Error updating community rule:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to update community rule');
    } finally {
        if (conn) conn.end();
    }
}

export async function deleteCommunityRule(ruleId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Get the rule to log its community_id
        const [rule] = await conn.query(
            "SELECT community_id FROM community_rule WHERE id = ?",
            [ruleId]
        );
        
        if (!rule) {
            return false;
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                (SELECT id FROM action WHERE name = 'DELETE'),
                ?, 'community_rule', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                ruleId, 
                JSON.stringify({ community_id: rule.community_id })
            ]
        );
        
        // Delete the rule
        const result = await conn.query(
            "DELETE FROM community_rule WHERE id = ?",
            [ruleId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error deleting community rule:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to delete community rule');
    } finally {
        if (conn) conn.end();
    }
}

// Community Settings operations
export async function getCommunitySettings(communityId: string): Promise<CommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        const [settings] = await conn.query(
            "SELECT * FROM community_setting WHERE community_id = ?",
            [communityId]
        );
        return settings || null;
    } catch (error) {
        console.error("Error fetching community settings:", error);
        throw new Error('Failed to fetch community settings');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateCommunitySettings(communityId: string, settingsData: CommunitySettingsInput, userId: string): Promise<CommunitySettings | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if settings exist
        const [existingSettings] = await conn.query(
            "SELECT * FROM community_setting WHERE community_id = ?",
            [communityId]
        );
        
        if (!existingSettings) {
            // Create default settings
            await conn.query(
                `INSERT INTO community_setting (
                    community_id, allow_post_images, allow_post_links, join_method,
                    require_post_approval, restricted_words, custom_theme_color,
                    custom_banner_url, minimum_account_age_days, minimum_karma_required,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    communityId,
                    settingsData.allow_post_images !== undefined ? settingsData.allow_post_images : true,
                    settingsData.allow_post_links !== undefined ? settingsData.allow_post_links : true,
                    settingsData.join_method || 'auto_approve',
                    settingsData.require_post_approval !== undefined ? settingsData.require_post_approval : false,
                    settingsData.restricted_words || null,
                    settingsData.custom_theme_color || null,
                    settingsData.custom_banner_url || null,
                    settingsData.minimum_account_age_days !== undefined ? settingsData.minimum_account_age_days : 0,
                    settingsData.minimum_karma_required !== undefined ? settingsData.minimum_karma_required : 0
                ]
            );
        } else {
            // Build the update query dynamically based on provided fields
            const updates: string[] = [];
            const values: any[] = [];
            
            if (settingsData.allow_post_images !== undefined) {
                updates.push("allow_post_images = ?");
                values.push(settingsData.allow_post_images);
            }
            
            if (settingsData.allow_post_links !== undefined) {
                updates.push("allow_post_links = ?");
                values.push(settingsData.allow_post_links);
            }
            
            if (settingsData.join_method !== undefined) {
                updates.push("join_method = ?");
                values.push(settingsData.join_method);
            }
            
            if (settingsData.require_post_approval !== undefined) {
                updates.push("require_post_approval = ?");
                values.push(settingsData.require_post_approval);
            }
            
            if (settingsData.restricted_words !== undefined) {
                updates.push("restricted_words = ?");
                values.push(settingsData.restricted_words);
            }
            
            if (settingsData.custom_theme_color !== undefined) {
                updates.push("custom_theme_color = ?");
                values.push(settingsData.custom_theme_color);
            }
            
            if (settingsData.custom_banner_url !== undefined) {
                updates.push("custom_banner_url = ?");
                values.push(settingsData.custom_banner_url);
            }
            
            if (settingsData.minimum_account_age_days !== undefined) {
                updates.push("minimum_account_age_days = ?");
                values.push(settingsData.minimum_account_age_days);
            }
            
            if (settingsData.minimum_karma_required !== undefined) {
                updates.push("minimum_karma_required = ?");
                values.push(settingsData.minimum_karma_required);
            }
            
            if (updates.length > 0) {
                // Add the ID to the values array
                values.push(communityId);
                
                await conn.query(
                    `UPDATE community_setting SET ${updates.join(", ")}, updated_at = NOW() WHERE community_id = ?`,
                    values
                );
            }
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'UPDATE_SETTINGS'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify(settingsData)
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the updated settings
        return await getCommunitySettings(communityId);
    } catch (error) {
        console.error("Error updating community settings:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to update community settings');
    } finally {
        if (conn) conn.end();
    }
}

// Community Members operations
export async function getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const members = await conn.query(
            `SELECT cm.*, u.username 
             FROM community_member cm
             JOIN user u ON cm.user_id = u.id
             WHERE cm.community_id = ?`,
            [communityId]
        );
        return members;
    } catch (error) {
        console.error("Error fetching community members:", error);
        throw new Error('Failed to fetch community members');
    } finally {
        if (conn) conn.end();
    }
}

export async function addCommunityMember(communityId: string, userId: string, role: 'member' | 'moderator' | 'admin' = 'member'): Promise<CommunityMember> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if user is already a member
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingMember) {
            // Just update their role if needed
            if (existingMember.role !== role) {
                await conn.query(
                    "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
                    [role, communityId, userId]
                );
            }
            
            // If they had a pending join request, mark it as approved
            await conn.query(
                "UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'",
                [communityId, userId]
            );
            
            // Get user details
            const [user] = await conn.query(
                "SELECT username FROM user WHERE id = ?",
                [userId]
            );
            
            // Commit the transaction
            await conn.commit();
            
            return {
                community_id: communityId,
                user_id: userId,
                username: user.username,
                role: role,
                joined_at: existingMember.joined_at
            };
        }
        
        // Insert new member
        await conn.query(
            "INSERT INTO community_member (community_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())",
            [communityId, userId, role]
        );
        
        // If they had a pending join request, mark it as approved
        await conn.query(
            "UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'",
            [communityId, userId]
        );
        
        // Get user details
        const [user] = await conn.query(
            "SELECT username FROM user WHERE id = ?",
            [userId]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'JOIN'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify({ role })
            ]
        );
        
        // Update user statistics
        await conn.query(
            "UPDATE user_statistic SET communities_joined = communities_joined + 1 WHERE user_id = ?",
            [userId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        return {
            community_id: communityId,
            user_id: userId,
            username: user.username,
            role,
            joined_at: new Date()
        };
    } catch (error) {
        console.error("Error adding community member:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to add community member');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateCommunityMemberRole(communityId: string, userId: string, role: 'member' | 'moderator' | 'admin', updatedBy: string): Promise<CommunityMember | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if member exists
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!existingMember) {
            return null;
        }
        
        // Update role
        await conn.query(
            "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
            [role, communityId, userId]
        );
        
        // If promoting to moderator, add default permissions
        if (role === 'moderator' && existingMember.role !== 'moderator' && existingMember.role !== 'admin') {
            try {
                await conn.query(
                    `INSERT INTO moderator_permission (
                        community_id, user_id, 
                        can_manage_settings, can_manage_members, can_manage_posts, can_manage_comments,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [communityId, userId, true, true, true, true]
                );
            } catch (error) {
                // Ignore duplicate key errors (might already have permissions from before)
                if (error.code !== 'ER_DUP_ENTRY') {
                    throw error;
                }
            }
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'UPDATE_MEMBER_ROLE'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                updatedBy, 
                communityId, 
                JSON.stringify({ user_id: userId, role })
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Get user details
        const [user] = await conn.query(
            "SELECT username FROM user WHERE id = ?",
            [userId]
        );
        
        return {
            community_id: communityId,
            user_id: userId,
            username: user.username,
            role,
            joined_at: existingMember.joined_at
        };
    } catch (error) {
        console.error("Error updating community member role:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to update community member role');
    } finally {
        if (conn) conn.end();
    }
}

export async function removeCommunityMember(communityId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if member exists
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!existingMember) {
            return false;
        }
        
        // Remove member
        await conn.query(
            "DELETE FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        // Also remove any moderator permissions
        if (existingMember.role === 'moderator' || existingMember.role === 'admin') {
            await conn.query(
                "DELETE FROM moderator_permission WHERE community_id = ? AND user_id = ?",
                [communityId, userId]
            );
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'LEAVE'),
                ?, 'community', NOW()
            )`,
            [activityId, userId, communityId]
        );
        
        // Update user statistics
        await conn.query(
            "UPDATE user_statistic SET communities_joined = GREATEST(0, communities_joined - 1) WHERE user_id = ?",
            [userId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        return true;
    } catch (error) {
        console.error("Error removing community member:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to remove community member');
    } finally {
        if (conn) conn.end();
    }
}

export async function getCommunityMember(communityId: string, userId: string): Promise<CommunityMember | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log(`Fetching community member: communityId=${communityId}, userId=${userId}`);
        const [member] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        console.log("Query result:", member);
        return member || null;
    } catch (error) {
        console.error("Error fetching community member:", error);
        throw new Error('Failed to fetch community member');
    } finally {
        if (conn) conn.end();
    }
}

// Community Join Request operations
export async function getJoinRequests(communityId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<JoinRequest[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        let query = "SELECT * FROM community_join_request WHERE community_id = ?";
        const params: any[] = [communityId];
        
        if (status) {
            query += " AND status = ?";
            params.push(status);
        }
        
        const requests = await conn.query(query, params);
        return requests;
    } catch (error) {
        console.error("Error fetching join requests:", error);
        throw new Error('Failed to fetch join requests');
    } finally {
        if (conn) conn.end();
    }
}

export async function createJoinRequest(communityId: string, userId: string): Promise<JoinRequest> {
    let conn;
    try {
        const id = uuidv4();
        conn = await pool.getConnection();
        
        // Check if user is already a member
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingMember) {
            throw new Error('User is already a member of this community');
        }
        
        // Check if request already exists
        const [existingRequest] = await conn.query(
            "SELECT * FROM community_join_request WHERE community_id = ? AND user_id = ? AND status = 'pending'",
            [communityId, userId]
        );
        
        if (existingRequest) {
            throw new Error('Join request already exists');
        }
        
        // Create join request
        await conn.query(
            "INSERT INTO community_join_request (id, community_id, user_id, status, requested_at, updated_at) VALUES (?, ?, ?, 'pending', NOW(), NOW())",
            [id, communityId, userId]
        );
        
        // Get the created request
        const [newRequest] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [id]
        );
        
        return newRequest;
    } catch (error) {
        console.error("Error creating join request:", error);
        throw error;
    } finally {
        if (conn) conn.end();
    }
}

export async function updateJoinRequest(requestId: string, status: 'approved' | 'rejected', moderatorId: string): Promise<JoinRequest | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Get the request
        const [request] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [requestId]
        );
        
        if (!request) {
            return null;
        }
        
        // Update the request status
        await conn.query(
            "UPDATE community_join_request SET status = ?, updated_at = NOW() WHERE id = ?",
            [status, requestId]
        );
        
        // If approved, add the user as a community member
        if (status === 'approved') {
            await addCommunityMember(request.community_id, request.user_id, 'member');
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = ?),
                ?, 'community_join_request', ?, NOW()
            )`,
            [
                activityId, 
                moderatorId, 
                status === 'approved' ? 'APPROVE' : 'REJECT',
                requestId, 
                JSON.stringify({ community_id: request.community_id, user_id: request.user_id })
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Get the updated request
        const [updatedRequest] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [requestId]
        );
        
        return updatedRequest || null;
    } catch (error) {
        console.error("Error updating join request:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to update join request');
    } finally {
        if (conn) conn.end();
    }
}

export async function getCommunityAbout(communityId: string): Promise<any | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get community details
        const [community] = await conn.query(
            "SELECT * FROM community WHERE id = ?",
            [communityId]
        );
        
        if (!community) {
            return null;
        }
        
        // Get moderators
        const moderators = await conn.query(
            `SELECT cm.*, u.username 
             FROM community_member cm
             JOIN user u ON cm.user_id = u.id
             WHERE cm.community_id = ? AND cm.role IN ('moderator', 'admin')`,
            [communityId]
        );
        
        // Get member count
        const [memberCountRow] = await conn.query(
            "SELECT COUNT(*) as count FROM community_member WHERE community_id = ?",
            [communityId]
        );
        
        // Get post count
        const [postCountRow] = await conn.query(
            "SELECT COUNT(*) as count FROM post WHERE community_id = ?",
            [communityId]
        );
        
        // Get creation date and format it
        const creationDate = new Date(community.created_at);
        const creationDateString = creationDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        return {
            ...community,
            moderators,
            memberCount: memberCountRow.count,
            postCount: postCountRow.count,
            creationDateFormatted: creationDateString
        };
    } catch (error) {
        console.error("Error fetching community about:", error);
        throw new Error('Failed to fetch community about');
    } finally {
        if (conn) conn.end();
    }
}

export async function getUserCommunities(userId: string): Promise<Community[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const communities = await conn.query(
            `SELECT c.*, cm.role
             FROM community c
             JOIN community_member cm ON c.id = cm.community_id
             WHERE cm.user_id = ?`,
            [userId]
        );
        return communities;
    } catch (error) {
        console.error("Error fetching user communities:", error);
        throw new Error('Failed to fetch user communities');
    } finally {
        if (conn) conn.end();
    }
}

export async function searchCommunities(query: string): Promise<Community[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Prepare the search query - simple LIKE search for now
        const searchPattern = `%${query}%`;
        
        const communities = await conn.query(
            `SELECT * FROM community 
             WHERE name LIKE ? OR description LIKE ? 
             ORDER BY name`,
            [searchPattern, searchPattern]
        );
        
        return communities;
    } catch (error) {
        console.error("Error searching communities:", error);
        throw new Error('Failed to search communities');
    } finally {
        if (conn) conn.end();
    }
}