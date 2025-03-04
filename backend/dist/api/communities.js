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
exports.getCommunities = getCommunities;
exports.getCommunity = getCommunity;
exports.createCommunity = createCommunity;
exports.updateCommunity = updateCommunity;
exports.deleteCommunity = deleteCommunity;
exports.getCommunityRules = getCommunityRules;
exports.addCommunityRule = addCommunityRule;
exports.updateCommunityRule = updateCommunityRule;
exports.deleteCommunityRule = deleteCommunityRule;
exports.getCommunitySettings = getCommunitySettings;
exports.updateCommunitySettings = updateCommunitySettings;
exports.getCommunityMembers = getCommunityMembers;
exports.addCommunityMember = addCommunityMember;
exports.updateCommunityMemberRole = updateCommunityMemberRole;
exports.removeCommunityMember = removeCommunityMember;
exports.getCommunityMember = getCommunityMember;
exports.getJoinRequests = getJoinRequests;
exports.createJoinRequest = createJoinRequest;
exports.updateJoinRequest = updateJoinRequest;
exports.getCommunityAbout = getCommunityAbout;
exports.getUserCommunities = getUserCommunities;
exports.searchCommunities = searchCommunities;
// backend/api/communities.ts
const uuid_1 = require("uuid");
const mariadb_1 = __importDefault(require("mariadb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = mariadb_1.default.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});
function getCommunities() {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const communities = yield conn.query("SELECT * FROM community");
            return communities;
        }
        catch (error) {
            console.error("Error fetching communities:", error);
            throw new Error('Failed to fetch communities');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function getCommunity(communityId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [community] = yield conn.query("SELECT * FROM community WHERE id = ?", [communityId]);
            return community || null;
        }
        catch (error) {
            console.error("Error fetching community:", error);
            throw new Error('Failed to fetch community');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function createCommunity(communityData) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const id = (0, uuid_1.v4)();
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Include all fields in the insert
            yield conn.query(`INSERT INTO community (
                id, name, description, privacy, icon_url, banner_url, theme_color
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                id,
                communityData.name,
                communityData.description,
                communityData.privacy || 'public',
                communityData.icon_url || null,
                communityData.banner_url || null,
                communityData.theme_color || null
            ]);
            // Create default settings for the community
            try {
                yield conn.query(`INSERT INTO community_setting (
                    community_id, allow_post_images, allow_post_links, join_method,
                    require_post_approval, restricted_words, custom_theme_color,
                    custom_banner_url, minimum_account_age_days, minimum_karma_required,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
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
                ]);
            }
            catch (settingsError) {
                // If settings creation fails, log but continue (non-critical)
                console.warn("Warning: Could not create community settings:", settingsError);
            }
            // Only log activity if creator_id is provided to avoid NULL constraint violation
            if (communityData.creator_id) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = 'CREATE'),
                        ?, 'community', NOW()
                    )`, [
                        activityId,
                        communityData.creator_id,
                        id
                    ]);
                    // Add creator as admin if user_id is provided
                    yield addCommunityMember(id, communityData.creator_id, 'admin');
                }
                catch (activityError) {
                    // If activity logging fails, log but continue (non-critical)
                    console.warn("Warning: Could not log activity or add member:", activityError);
                }
            }
            else {
                console.log("No creator_id provided, skipping activity logging");
            }
            // Commit the transaction
            yield conn.commit();
            // Return the created community
            const [newCommunity] = yield conn.query("SELECT * FROM community WHERE id = ?", [id]);
            return newCommunity;
        }
        catch (error) {
            console.error("Error creating community:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to create community');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function updateCommunity(communityId, communityData, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Build the update query dynamically based on provided fields
            const updates = [];
            const values = [];
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
                return yield getCommunity(communityId);
            }
            // Add the ID to the values array
            values.push(communityId);
            yield conn.query(`UPDATE community SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
            // Log activity if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = 'UPDATE'),
                        ?, 'community', ?, NOW()
                    )`, [
                        activityId,
                        userId,
                        communityId,
                        JSON.stringify(communityData)
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log activity for community update:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            // Return the updated community
            return yield getCommunity(communityId);
        }
        catch (error) {
            console.error("Error updating community:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to update community');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function deleteCommunity(communityId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Log activity before deletion if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = 'DELETE'),
                        ?, 'community', ?, NOW()
                    )`, [
                        activityId,
                        userId,
                        communityId,
                        JSON.stringify({ community_id: communityId })
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log community deletion activity:", activityError);
                }
            }
            // Delete the community itself
            const result = yield conn.query("DELETE FROM community WHERE id = ?", [communityId]);
            // Commit the transaction
            yield conn.commit();
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error("Error deleting community:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to delete community');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Community Rules operations
function getCommunityRules(communityId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const rules = yield conn.query("SELECT * FROM community_rule WHERE community_id = ?", [communityId]);
            return rules;
        }
        catch (error) {
            console.error("Error fetching community rules:", error);
            throw new Error('Failed to fetch community rules');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function addCommunityRule(communityId, ruleData, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const id = (0, uuid_1.v4)();
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            yield conn.query(`INSERT INTO community_rule (
                id, community_id, title, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NOW(), NOW())`, [
                id,
                communityId,
                ruleData.title,
                ruleData.description
            ]);
            // Log activity if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                        (SELECT id FROM action WHERE name = 'CREATE'),
                        ?, 'community_rule', NOW()
                    )`, [activityId, userId, id]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log rule creation activity:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            const [newRule] = yield conn.query("SELECT * FROM community_rule WHERE id = ?", [id]);
            return newRule;
        }
        catch (error) {
            console.error("Error adding community rule:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to add community rule');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function updateCommunityRule(ruleId, ruleData, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Build the update query dynamically based on provided fields
            const updates = [];
            const values = [];
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
                const [rule] = yield conn.query("SELECT * FROM community_rule WHERE id = ?", [ruleId]);
                return rule || null;
            }
            // Add the ID to the values array
            values.push(ruleId);
            yield conn.query(`UPDATE community_rule SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
            // Log activity if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                        (SELECT id FROM action WHERE name = 'UPDATE'),
                        ?, 'community_rule', NOW()
                    )`, [activityId, userId, ruleId]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log rule update activity:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            const [updatedRule] = yield conn.query("SELECT * FROM community_rule WHERE id = ?", [ruleId]);
            return updatedRule || null;
        }
        catch (error) {
            console.error("Error updating community rule:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to update community rule');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function deleteCommunityRule(ruleId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Get the rule to log its community_id
            const [rule] = yield conn.query("SELECT community_id FROM community_rule WHERE id = ?", [ruleId]);
            if (!rule) {
                return false;
            }
            // Log activity if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
                        (SELECT id FROM action WHERE name = 'DELETE'),
                        ?, 'community_rule', ?, NOW()
                    )`, [
                        activityId,
                        userId,
                        ruleId,
                        JSON.stringify({ community_id: rule.community_id })
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log rule deletion activity:", activityError);
                }
            }
            // Delete the rule
            const result = yield conn.query("DELETE FROM community_rule WHERE id = ?", [ruleId]);
            // Commit the transaction
            yield conn.commit();
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error("Error deleting community rule:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to delete community rule');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Community Settings operations
function getCommunitySettings(communityId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const [settings] = yield conn.query("SELECT * FROM community_setting WHERE community_id = ?", [communityId]);
            return settings || null;
        }
        catch (error) {
            console.error("Error fetching community settings:", error);
            throw new Error('Failed to fetch community settings');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function updateCommunitySettings(communityId, settingsData, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Check if settings exist
            const [existingSettings] = yield conn.query("SELECT * FROM community_setting WHERE community_id = ?", [communityId]);
            if (!existingSettings) {
                // Create default settings
                yield conn.query(`INSERT INTO community_setting (
                    community_id, allow_post_images, allow_post_links, join_method,
                    require_post_approval, restricted_words, custom_theme_color,
                    custom_banner_url, minimum_account_age_days, minimum_karma_required,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
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
                ]);
            }
            else {
                // Build the update query dynamically based on provided fields
                const updates = [];
                const values = [];
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
                    yield conn.query(`UPDATE community_setting SET ${updates.join(", ")}, updated_at = NOW() WHERE community_id = ?`, values);
                }
            }
            // Log activity if userId is provided
            if (userId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = 'UPDATE_SETTINGS'),
                        ?, 'community', ?, NOW()
                    )`, [
                        activityId,
                        userId,
                        communityId,
                        JSON.stringify(settingsData)
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log settings update activity:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            // Return the updated settings
            return yield getCommunitySettings(communityId);
        }
        catch (error) {
            console.error("Error updating community settings:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to update community settings');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Community Members operations
function getCommunityMembers(communityId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const members = yield conn.query(`SELECT cm.*, u.username
             FROM community_member cm
             JOIN user u ON cm.user_id = u.id
             WHERE cm.community_id = ?`, [communityId]);
            return members;
        }
        catch (error) {
            console.error("Error fetching community members:", error);
            throw new Error('Failed to fetch community members');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function addCommunityMember(communityId_1, userId_1) {
    return __awaiter(this, arguments, void 0, function* (communityId, userId, role = 'member') {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Check if user is already a member
            const [existingMember] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            if (existingMember) {
                // Just update their role if needed
                if (existingMember.role !== role) {
                    yield conn.query("UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?", [role, communityId, userId]);
                }
                // Get user details
                const [user] = yield conn.query("SELECT username FROM user WHERE id = ?", [userId]);
                // Commit the transaction
                yield conn.commit();
                return {
                    community_id: communityId,
                    user_id: userId,
                    username: user.username,
                    role: role,
                    joined_at: existingMember.joined_at
                };
            }
            // Insert new member
            yield conn.query("INSERT INTO community_member (community_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())", [communityId, userId, role]);
            // If they had a pending join request, try to mark it as approved
            try {
                yield conn.query("UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'", [communityId, userId]);
            }
            catch (error) {
                // If this fails, it's likely the table doesn't exist yet, so we can ignore it
                console.log("Note: Could not update join request, but continuing:", error);
            }
            // Get user details
            const [user] = yield conn.query("SELECT username FROM user WHERE id = ?", [userId]);
            // Log activity
            try {
                const activityId = (0, uuid_1.v4)();
                yield conn.query(`INSERT INTO activity (
                    id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                ) VALUES (
                    ?, ?,
                    (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                    (SELECT id FROM action WHERE name = 'JOIN'),
                    ?, 'community', ?, NOW()
                )`, [
                    activityId,
                    userId,
                    communityId,
                    JSON.stringify({ role })
                ]);
            }
            catch (activityError) {
                console.warn("Warning: Could not log activity, but continuing:", activityError);
            }
            // Update user statistics
            try {
                yield conn.query("UPDATE user_statistic SET communities_joined = communities_joined + 1 WHERE user_id = ?", [userId]);
            }
            catch (statError) {
                console.warn("Warning: Could not update user statistics, but continuing:", statError);
            }
            // Commit the transaction
            yield conn.commit();
            return {
                community_id: communityId,
                user_id: userId,
                username: user.username,
                role,
                joined_at: new Date()
            };
        }
        catch (error) {
            console.error("Error adding community member:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to add community member');
        }
        finally {
            if (conn)
                conn.release();
        }
    });
}
function updateCommunityMemberRole(communityId, userId, role, updatedBy) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Check if member exists
            const [existingMember] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            if (!existingMember) {
                return null;
            }
            // Update role
            yield conn.query("UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?", [role, communityId, userId]);
            // If promoting to moderator, add default permissions
            if (role === 'moderator' && existingMember.role !== 'moderator' && existingMember.role !== 'admin') {
                try {
                    yield conn.query(`INSERT INTO moderator_permission (
                        community_id, user_id, 
                        can_manage_settings, can_manage_members, can_manage_posts, can_manage_comments,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, [communityId, userId, true, true, true, true]);
                }
                catch (error) {
                    function isDatabaseError(error) {
                        return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
                    }
                    // Ignore duplicate key errors (might already have permissions from before)
                    if (isDatabaseError(error) && error.code !== 'ER_DUP_ENTRY') {
                        throw error;
                    }
                }
            }
            // Log activity if updatedBy is provided
            if (updatedBy) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = 'UPDATE_MEMBER_ROLE'),
                        ?, 'community', ?, NOW()
                    )`, [
                        activityId,
                        updatedBy,
                        communityId,
                        JSON.stringify({ user_id: userId, role })
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log member role update activity:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            // Get user details
            const [user] = yield conn.query("SELECT username FROM user WHERE id = ?", [userId]);
            return {
                community_id: communityId,
                user_id: userId,
                username: user.username,
                role,
                joined_at: existingMember.joined_at
            };
        }
        catch (error) {
            console.error("Error updating community member role:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to update community member role');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function removeCommunityMember(communityId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Check if member exists
            const [existingMember] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            if (!existingMember) {
                return false;
            }
            // Remove member
            yield conn.query("DELETE FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            // Also remove any moderator permissions
            if (existingMember.role === 'moderator' || existingMember.role === 'admin') {
                yield conn.query("DELETE FROM moderator_permission WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            }
            // Log activity
            try {
                const activityId = (0, uuid_1.v4)();
                yield conn.query(`INSERT INTO activity (
                    id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
                ) VALUES (
                    ?, ?,
                    (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                    (SELECT id FROM action WHERE name = 'LEAVE'),
                    ?, 'community', NOW()
                )`, [activityId, userId, communityId]);
            }
            catch (activityError) {
                console.warn("Warning: Could not log leave community activity:", activityError);
            }
            // Update user statistics
            try {
                yield conn.query("UPDATE user_statistic SET communities_joined = GREATEST(0, communities_joined - 1) WHERE user_id = ?", [userId]);
            }
            catch (statError) {
                console.warn("Warning: Could not update user statistics:", statError);
            }
            // Commit the transaction
            yield conn.commit();
            return true;
        }
        catch (error) {
            console.error("Error removing community member:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to remove community member');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function getCommunityMember(communityId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            console.log(`Fetching community member: communityId=${communityId}, userId=${userId}`);
            const [member] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            console.log("Query result:", member);
            return member || null;
        }
        catch (error) {
            console.error("Error fetching community member:", error);
            throw new Error('Failed to fetch community member');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
// Community Join Request operations
function getJoinRequests(communityId, status) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            let query = "SELECT * FROM community_join_request WHERE community_id = ?";
            const params = [communityId];
            if (status) {
                query += " AND status = ?";
                params.push(status);
            }
            const requests = yield conn.query(query, params);
            return requests;
        }
        catch (error) {
            console.error("Error fetching join requests:", error);
            throw new Error('Failed to fetch join requests');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function createJoinRequest(communityId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            const id = (0, uuid_1.v4)();
            conn = yield pool.getConnection();
            // Check if user is already a member
            const [existingMember] = yield conn.query("SELECT * FROM community_member WHERE community_id = ? AND user_id = ?", [communityId, userId]);
            if (existingMember) {
                throw new Error('User is already a member of this community');
            }
            // Check if request already exists
            const [existingRequest] = yield conn.query("SELECT * FROM community_join_request WHERE community_id = ? AND user_id = ? AND status = 'pending'", [communityId, userId]);
            if (existingRequest) {
                throw new Error('Join request already exists');
            }
            // Create join request
            yield conn.query("INSERT INTO community_join_request (id, community_id, user_id, status, requested_at, updated_at) VALUES (?, ?, ?, 'pending', NOW(), NOW())", [id, communityId, userId]);
            // Get the created request
            const [newRequest] = yield conn.query("SELECT * FROM community_join_request WHERE id = ?", [id]);
            return newRequest;
        }
        catch (error) {
            console.error("Error creating join request:", error);
            throw error;
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function updateJoinRequest(requestId, status, moderatorId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Start a transaction
            yield conn.beginTransaction();
            // Get the request
            const [request] = yield conn.query("SELECT * FROM community_join_request WHERE id = ?", [requestId]);
            if (!request) {
                return null;
            }
            // Update the request status
            yield conn.query("UPDATE community_join_request SET status = ?, updated_at = NOW() WHERE id = ?", [status, requestId]);
            // If approved, add the user as a community member
            if (status === 'approved') {
                yield addCommunityMember(request.community_id, request.user_id, 'member');
            }
            // Log activity if moderatorId is provided
            if (moderatorId) {
                try {
                    const activityId = (0, uuid_1.v4)();
                    yield conn.query(`INSERT INTO activity (
                        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
                    ) VALUES (
                        ?, ?,
                        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                        (SELECT id FROM action WHERE name = ?),
                        ?, 'community_join_request', ?, NOW()
                    )`, [
                        activityId,
                        moderatorId,
                        status === 'approved' ? 'APPROVE' : 'REJECT',
                        requestId,
                        JSON.stringify({ community_id: request.community_id, user_id: request.user_id })
                    ]);
                }
                catch (activityError) {
                    console.warn("Warning: Could not log join request activity:", activityError);
                }
            }
            // Commit the transaction
            yield conn.commit();
            // Get the updated request
            const [updatedRequest] = yield conn.query("SELECT * FROM community_join_request WHERE id = ?", [requestId]);
            return updatedRequest || null;
        }
        catch (error) {
            console.error("Error updating join request:", error);
            if (conn) {
                yield conn.rollback();
            }
            throw new Error('Failed to update join request');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function getCommunityAbout(communityId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Get community details
            const [community] = yield conn.query("SELECT * FROM community WHERE id = ?", [communityId]);
            if (!community) {
                return null;
            }
            // Get moderators
            const moderators = yield conn.query(`SELECT cm.*, u.username 
             FROM community_member cm
             JOIN user u ON cm.user_id = u.id
             WHERE cm.community_id = ? AND cm.role IN ('moderator', 'admin')`, [communityId]);
            // Get member count
            const [memberCountRow] = yield conn.query("SELECT COUNT(*) as count FROM community_member WHERE community_id = ?", [communityId]);
            // Get post count
            const [postCountRow] = yield conn.query("SELECT COUNT(*) as count FROM post WHERE community_id = ?", [communityId]);
            // Get creation date and format it
            const creationDate = new Date(community.created_at);
            const creationDateString = creationDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            return Object.assign(Object.assign({}, community), { moderators, memberCount: memberCountRow.count, postCount: postCountRow.count, creationDateFormatted: creationDateString });
        }
        catch (error) {
            console.error("Error fetching community about:", error);
            throw new Error('Failed to fetch community about');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function getUserCommunities(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            const communities = yield conn.query(`SELECT c.*, cm.role
             FROM community c
             JOIN community_member cm ON c.id = cm.community_id
             WHERE cm.user_id = ?`, [userId]);
            return communities;
        }
        catch (error) {
            console.error("Error fetching user communities:", error);
            throw new Error('Failed to fetch user communities');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
function searchCommunities(query) {
    return __awaiter(this, void 0, void 0, function* () {
        let conn;
        try {
            conn = yield pool.getConnection();
            // Prepare the search query - simple LIKE search for now
            const searchPattern = `%${query}%`;
            const communities = yield conn.query(`SELECT * FROM community 
             WHERE name LIKE ? OR description LIKE ? 
             ORDER BY name`, [searchPattern, searchPattern]);
            return communities;
        }
        catch (error) {
            console.error("Error searching communities:", error);
            throw new Error('Failed to search communities');
        }
        finally {
            if (conn)
                conn.end();
        }
    });
}
