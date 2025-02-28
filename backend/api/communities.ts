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
    allow_post_videos: boolean;
    allow_polls: boolean;
    require_post_flair: boolean;
    show_in_discovery: boolean;
    join_method: 'auto_approve' | 'requires_approval' | 'invite_only';
    content_filter_level: 'none' | 'low' | 'medium' | 'high';
    updated_at: Date;
}

export interface CommunitySettingsInput {
    allow_post_images?: boolean;
    allow_post_links?: boolean;
    allow_post_videos?: boolean;
    allow_polls?: boolean;
    require_post_flair?: boolean;
    show_in_discovery?: boolean;
    join_method?: 'auto_approve' | 'requires_approval' | 'invite_only';
    content_filter_level?: 'none' | 'low' | 'medium' | 'high';
}

export interface CommunityMember {
    community_id: string;
    user_id: string;
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

// Community CRUD operations
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
                community_id, allow_post_images, allow_post_links, allow_post_videos,
                allow_polls, require_post_flair, show_in_discovery,
                join_method, content_filter_level
            ) VALUES (?, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'auto_approve', 'none')`,
            [id]
        );
        
        // Log activity if creator_id is provided
        if (communityData.creator_id) {
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
                [activityId, communityData.creator_id, id]
            );
        }
        
        // Commit the transaction
        await conn.commit();
        
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
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community', NOW()
            )`,
            [activityId, userId, communityId]
        );
        
        // Commit the transaction
        await conn.commit();
        
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
        
        // Start a transaction to ensure all related data is deleted
        await conn.beginTransaction();
        
        // Delete community settings
        await conn.query("DELETE FROM community_setting WHERE community_id = ?", [communityId]);
        
        // Delete community rules
        await conn.query("DELETE FROM community_rule WHERE community_id = ?", [communityId]);
        
        // Delete community members
        await conn.query("DELETE FROM community_member WHERE community_id = ?", [communityId]);
        
        // Delete join requests
        await conn.query("DELETE FROM community_join_request WHERE community_id = ?", [communityId]);
        
        // Log activity before deleting the community
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
            "SELECT * FROM community_rule WHERE community_id = ? ORDER BY position ASC",
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
        
        // Get the highest position to determine the next position
        const [positionResult] = await conn.query(
            "SELECT MAX(position) as maxPosition FROM community_rule WHERE community_id = ?",
            [communityId]
        );
        const nextPosition = (positionResult.maxPosition || 0) + 1;
        
        await conn.query(
            "INSERT INTO community_rule (id, community_id, title, description, position) VALUES (?, ?, ?, ?, ?)",
            [id, communityId, ruleData.title, ruleData.description, ruleData.position || nextPosition]
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
        
        if (ruleData.position !== undefined) {
            updates.push("position = ?");
            values.push(ruleData.position);
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
        
        // Get settings from the community_setting table
        const [settings] = await conn.query(
            "SELECT * FROM community_setting WHERE community_id = ?",
            [communityId]
        );
        
        // If settings don't exist, create default settings
        if (!settings) {
            await conn.query(
                `INSERT INTO community_setting (
                    community_id, allow_post_images, allow_post_links, allow_post_videos,
                    allow_polls, require_post_flair, show_in_discovery,
                    join_method, content_filter_level
                ) VALUES (?, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, 'auto_approve', 'none')`,
                [communityId]
            );
            
            const [newSettings] = await conn.query(
                "SELECT * FROM community_setting WHERE community_id = ?",
                [communityId]
            );
            return newSettings;
        }
        
        return settings;
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
            // Create settings if they don't exist
            await conn.query(
                `INSERT INTO community_setting (
                    community_id, allow_post_images, allow_post_links, allow_post_videos,
                    allow_polls, require_post_flair, show_in_discovery,
                    join_method, content_filter_level
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    communityId,
                    settingsData.allow_post_images !== undefined ? settingsData.allow_post_images : true,
                    settingsData.allow_post_links !== undefined ? settingsData.allow_post_links : true,
                    settingsData.allow_post_videos !== undefined ? settingsData.allow_post_videos : true,
                    settingsData.allow_polls !== undefined ? settingsData.allow_polls : true,
                    settingsData.require_post_flair !== undefined ? settingsData.require_post_flair : false,
                    settingsData.show_in_discovery !== undefined ? settingsData.show_in_discovery : true,
                    settingsData.join_method !== undefined ? settingsData.join_method : 'auto_approve',
                    settingsData.content_filter_level !== undefined ? settingsData.content_filter_level : 'none'
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
            
            if (settingsData.allow_post_videos !== undefined) {
                updates.push("allow_post_videos = ?");
                values.push(settingsData.allow_post_videos);
            }
            
            if (settingsData.allow_polls !== undefined) {
                updates.push("allow_polls = ?");
                values.push(settingsData.allow_polls);
            }
            
            if (settingsData.require_post_flair !== undefined) {
                updates.push("require_post_flair = ?");
                values.push(settingsData.require_post_flair);
            }
            
            if (settingsData.show_in_discovery !== undefined) {
                updates.push("show_in_discovery = ?");
                values.push(settingsData.show_in_discovery);
            }
            
            if (settingsData.join_method !== undefined) {
                updates.push("join_method = ?");
                values.push(settingsData.join_method);
            }
            
            if (settingsData.content_filter_level !== undefined) {
                updates.push("content_filter_level = ?");
                values.push(settingsData.content_filter_level);
            }
            
            if (updates.length > 0) {
                // Add the community ID to the values array
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
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_SETTING'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community_setting', NOW()
            )`,
            [activityId, userId, communityId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the updated settings
        const [updatedSettings] = await conn.query(
            "SELECT * FROM community_setting WHERE community_id = ?",
            [communityId]
        );
        return updatedSettings;
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
            "SELECT * FROM community_member WHERE community_id = ?",
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
        
        // Check if the member already exists
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingMember) {
            // If the member already exists, update their role if different
            if (existingMember.role !== role) {
                await conn.query(
                    "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
                    [role, communityId, userId]
                );
            }
            
            // Commit the transaction
            await conn.commit();
            
            return existingMember;
        }
        
        // Add the new member
        await conn.query(
            "INSERT INTO community_member (community_id, user_id, role) VALUES (?, ?, ?)",
            [communityId, userId, role]
        );
        
        // Update user statistics
        await conn.query(
            `UPDATE user_statistic 
             SET communities_joined = communities_joined + 1
             WHERE user_id = ?`,
            [userId]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'JOIN'),
                ?, 'community', NOW()
            )`,
            [activityId, userId, communityId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        const [newMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        return newMember;
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
        
        // Update the member's role
        await conn.query(
            "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
            [role, communityId, userId]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_MEMBER'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community_member', ?, NOW()
            )`,
            [
                activityId, 
                updatedBy, 
                userId, 
                JSON.stringify({ 
                    community_id: communityId,
                    user_id: userId,
                    new_role: role
                })
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the updated member
        const [updatedMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        return updatedMember || null;
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
        
        // Log activity before removing the member
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'LEAVE'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify({ community_id: communityId })
            ]
        );
        
        // Remove the member
        const result = await conn.query(
            "DELETE FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        // Update user statistics
        if (result.affectedRows > 0) {
            await conn.query(
                `UPDATE user_statistic 
                 SET communities_joined = GREATEST(communities_joined - 1, 0)
                 WHERE user_id = ?`,
                [userId]
            );
        }
        
        // Commit the transaction
        await conn.commit();
        
        return result.affectedRows > 0;
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

export async function getJoinRequest(requestId: string): Promise<JoinRequest | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        const [request] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [requestId]
        );
        return request || null;
    } catch (error) {
        console.error("Error fetching join request:", error);
        throw new Error('Failed to fetch join request');
    } finally {
        if (conn) conn.end();
    }
}

export async function createJoinRequest(communityId: string, userId: string): Promise<JoinRequest> {
    let conn;
    try {
        const id = uuidv4();
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if a request already exists
        const [existingRequest] = await conn.query(
            "SELECT * FROM community_join_request WHERE community_id = ? AND user_id = ? AND status = 'pending'",
            [communityId, userId]
        );
        
        if (existingRequest) {
            // If a pending request already exists, return it
            await conn.commit();
            return existingRequest;
        }
        
        // Create a new join request
        await conn.query(
            "INSERT INTO community_join_request (id, community_id, user_id, status) VALUES (?, ?, ?, 'pending')",
            [id, communityId, userId]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_JOIN_REQUEST'),
                (SELECT id FROM action WHERE name = 'CREATE'),
                ?, 'community_join_request', NOW()
            )`,
            [activityId, userId, id]
        );
        
        // Commit the transaction
        await conn.commit();
        
        const [newRequest] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [id]
        );
        return newRequest;
    } catch (error) {
        console.error("Error creating join request:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to create join request');
    } finally {
        if (conn) conn.end();
    }
}

export async function updateJoinRequestStatus(
    requestId: string, 
    status: 'approved' | 'rejected', 
    updatedBy: string
): Promise<JoinRequest | null> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Get the current request to check if it's pending
        const [request] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [requestId]
        );
        
        if (!request || request.status !== 'pending') {
            // Only pending requests can be updated
            await conn.rollback();
            return null;
        }
        
        // Update the request status
        await conn.query(
            "UPDATE community_join_request SET status = ?, updated_at = NOW() WHERE id = ?",
            [status, requestId]
        );
        
        // If approved, add the user as a community member
        if (status === 'approved') {
            await conn.query(
                "INSERT INTO community_member (community_id, user_id, role) VALUES (?, ?, 'member') " +
                "ON DUPLICATE KEY UPDATE role = 'member'",
                [request.community_id, request.user_id]
            );
            
            // Update user statistics
            await conn.query(
                `UPDATE user_statistic 
                 SET communities_joined = communities_joined + 1
                 WHERE user_id = ?`,
                [request.user_id]
            );
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_JOIN_REQUEST'),
                (SELECT id FROM action WHERE name = 'UPDATE'),
                ?, 'community_join_request', ?, NOW()
            )`,
            [
                activityId, 
                updatedBy, 
                requestId, 
                JSON.stringify({ 
                    community_id: request.community_id,
                    user_id: request.user_id,
                    status: status
                })
            ]
        );
        
        // Commit the transaction
        await conn.commit();
        
        // Return the updated request
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

export async function deleteJoinRequest(requestId: string, userId: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Get the request to log its details
        const [request] = await conn.query(
            "SELECT * FROM community_join_request WHERE id = ?",
            [requestId]
        );
        
        if (!request) {
            return false;
        }
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY_JOIN_REQUEST'),
                (SELECT id FROM action WHERE name = 'DELETE'),
                ?, 'community_join_request', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                requestId, 
                JSON.stringify({ 
                    community_id: request.community_id,
                    user_id: request.user_id
                })
            ]
        );
        
        // Delete the request
        const result = await conn.query(
            "DELETE FROM community_join_request WHERE id = ?",
            [requestId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error deleting join request:", error);
        if (conn) {
            await conn.rollback();
        }
        throw new Error('Failed to delete join request');
    } finally {
        if (conn) conn.end();
    }
}

export async function getUserJoinRequests(userId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<JoinRequest[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        let query = "SELECT * FROM community_join_request WHERE user_id = ?";
        const params: any[] = [userId];
        
        if (status) {
            query += " AND status = ?";
            params.push(status);
        }
        
        const requests = await conn.query(query, params);
        return requests;
    } catch (error) {
        console.error("Error fetching user join requests:", error);
        throw new Error('Failed to fetch user join requests');
    } finally {
        if (conn) conn.end();
    }
}

// Enhanced community information
export async function getCommunityAbout(communityId: string): Promise<any> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Get the community
        const [community] = await conn.query(
            "SELECT * FROM community WHERE id = ?",
            [communityId]
        );
        
        if (!community) {
            return null;
        }
        
        // Get the member count
        const [memberCountResult] = await conn.query(
            "SELECT COUNT(*) as memberCount FROM community_member WHERE community_id = ?",
            [communityId]
        );
        const memberCount = memberCountResult.memberCount || 0;
        
        // Get the post count
        const [postCountResult] = await conn.query(
            "SELECT COUNT(*) as postCount FROM post WHERE community_id = ?",
            [communityId]
        );
        const postCount = postCountResult.postCount || 0;
        
        // Get the moderators
        const moderators = await conn.query(
            "SELECT user_id FROM community_member WHERE community_id = ? AND role IN ('moderator', 'admin')",
            [communityId]
        );
        const moderatorIds = moderators.map((mod: any) => mod.user_id);
        
        // Return the enhanced community information
        return {
            ...community,
            memberCount,
            postCount,
            moderators: moderatorIds
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
        
        // Get the communities the user is a member of
        const communities = await conn.query(
            `SELECT c.* 
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

export async function searchCommunities(searchTerm: string): Promise<Community[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Search for communities by name or description
        const communities = await conn.query(
            `SELECT * FROM community 
             WHERE name LIKE ? OR description LIKE ?`,
            [`%${searchTerm}%`, `%${searchTerm}%`]
        );
        
        return communities;
    } catch (error) {
        console.error("Error searching communities:", error);
        throw new Error('Failed to search communities');
    } finally {
        if (conn) conn.end();
    }
}
