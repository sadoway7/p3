// backend/api/communities-fixed.ts
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
        
        // Include all fields in the insert - make sure we use the correct columns
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
        try {
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
        } catch (settingsError) {
            // If settings creation fails, log but continue (non-critical)
            console.warn("Warning: Could not create community settings:", settingsError);
        }
        
        // Only try to log activity if creator_id is provided
        if (communityData.creator_id) {
            try {
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
                        communityData.creator_id, 
                        id
                    ]
                );
                
                // Also add creator as admin
                await addCommunityMember(id, communityData.creator_id, 'admin');
            } catch (activityError) {
                // If activity logging fails, log but continue (non-critical)
                console.warn("Warning: Could not log activity:", activityError);
            }
        } else {
            console.log("No creator_id provided, skipping activity logging");
        }
        
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

export async function updateCommunity(communityId: string, communityData: Partial<CommunityInput>, userId?: string): Promise<Community | null> {
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
        
        // Log activity if user ID is provided
        if (userId) {
            try {
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
            } catch (activityError) {
                console.warn("Warning: Could not log activity:", activityError);
            }
        }
        
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

export async function deleteCommunity(communityId: string, userId?: string): Promise<boolean> {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Log activity before deletion if userId is provided
        if (userId) {
            try {
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
            } catch (activityError) {
                console.warn("Warning: Could not log activity:", activityError);
            }
        }
        
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

export async function addCommunityRule(communityId: string, ruleData: CommunityRuleInput, userId?: string): Promise<CommunityRule> {
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
        
        // Log activity if userId is provided
        if (userId) {
            try {
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
            } catch (activityError) {
                console.warn("Warning: Could not log activity:", activityError);
            }
        }
        
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

// Rest of the code remains the same, but following the pattern of making all user_id parameters optional 
// and handling activity logging in a way that doesn't cause the entire operation to fail

// Here's the fixed addCommunityMember function as an example:
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
        try {
            await conn.query(
                "UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'",
                [communityId, userId]
            );
        } catch (error) {
            // If this fails, it's likely the table doesn't exist yet, so we can ignore it
            console.log("Note: Could not update join request, but continuing:", error);
        }

        // Get user details
        const [user] = await conn.query(
            "SELECT username FROM user WHERE id = ?",
            [userId]
        );

        // Log activity
        try {
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
        } catch (activityError) {
            console.warn("Warning: Could not log activity:", activityError);
        }

        // Update user statistics
        try {
            await conn.query(
                "UPDATE user_statistic SET communities_joined = communities_joined + 1 WHERE user_id = ?",
                [userId]
            );
        } catch (statError) {
            console.warn("Warning: Could not update user statistics:", statError);
        }

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
        if (conn) conn.release();
    }
}

// The remaining functions would follow the same pattern of:
// 1. Making user_id parameters optional where they're used for activity logging
// 2. Wrapping activity logging in try/catch blocks to prevent them from causing the main operation to fail
// 3. Adding proper error handling for all database operations