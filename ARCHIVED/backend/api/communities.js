const mariadb = require('mariadb');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// Community CRUD operations
const getCommunities = async () => {
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
};

const getCommunity = async (communityId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [community] = await conn.query(
      "SELECT * FROM community WHERE id = ?",
      [communityId]
    );
    return community || null;
  } catch (error) {
    console.error("Error fetching community:", error);
    throw new Error('Failed to fetch community');
  } finally {
    if (conn) conn.end();
  }
};

const createCommunity = async (communityData) => {
  const { name, description, privacy, icon_url, banner_url, theme_color, creator_id } = communityData;
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
        name, 
        description, 
        privacy || 'public',
        icon_url || null,
        banner_url || null,
        theme_color || null
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
    if (creator_id) {
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
        [activityId, creator_id, id]
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
};

const updateCommunity = async (communityId, communityData, userId) => {
  const { name, description, privacy, icon_url, banner_url, theme_color } = communityData;
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    
    if (privacy !== undefined) {
      updates.push("privacy = ?");
      values.push(privacy);
    }
    
    if (icon_url !== undefined) {
      updates.push("icon_url = ?");
      values.push(icon_url);
    }
    
    if (banner_url !== undefined) {
      updates.push("banner_url = ?");
      values.push(banner_url);
    }
    
    if (theme_color !== undefined) {
      updates.push("theme_color = ?");
      values.push(theme_color);
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
};

const deleteCommunity = async (communityId, userId) => {
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
};

// Community Rules operations
const getCommunityRules = async (communityId) => {
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
};

const addCommunityRule = async (communityId, ruleData, userId) => {
  const { title, description, position } = ruleData;
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
      [id, communityId, title, description, position || nextPosition]
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
};

const updateCommunityRule = async (ruleId, ruleData, userId) => {
  const { title, description, position } = ruleData;
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    
    if (position !== undefined) {
      updates.push("position = ?");
      values.push(position);
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
};

const deleteCommunityRule = async (ruleId, userId) => {
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
};

// Community Settings operations
const getCommunitySettings = async (communityId) => {
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
};

const updateCommunitySettings = async (communityId, settingsData, userId) => {
  const { 
    allow_post_images, 
    allow_post_links, 
    allow_post_videos,
    allow_polls,
    require_post_flair,
    show_in_discovery,
    join_method,
    content_filter_level
  } = settingsData;
  
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
          allow_post_images !== undefined ? allow_post_images : true,
          allow_post_links !== undefined ? allow_post_links : true,
          allow_post_videos !== undefined ? allow_post_videos : true,
          allow_polls !== undefined ? allow_polls : true,
          require_post_flair !== undefined ? require_post_flair : false,
          show_in_discovery !== undefined ? show_in_discovery : true,
          join_method !== undefined ? join_method : 'auto_approve',
          content_filter_level !== undefined ? content_filter_level : 'none'
        ]
      );
    } else {
      // Build the update query dynamically based on provided fields
      const updates = [];
      const values = [];
      
      if (allow_post_images !== undefined) {
        updates.push("allow_post_images = ?");
        values.push(allow_post_images);
      }
      
      if (allow_post_links !== undefined) {
        updates.push("allow_post_links = ?");
        values.push(allow_post_links);
      }
      
      if (allow_post_videos !== undefined) {
        updates.push("allow_post_videos = ?");
        values.push(allow_post_videos);
      }
      
      if (allow_polls !== undefined) {
        updates.push("allow_polls = ?");
        values.push(allow_polls);
      }
      
      if (require_post_flair !== undefined) {
        updates.push("require_post_flair = ?");
        values.push(require_post_flair);
      }
      
      if (show_in_discovery !== undefined) {
        updates.push("show_in_discovery = ?");
        values.push(show_in_discovery);
      }
      
      if (join_method !== undefined) {
        updates.push("join_method = ?");
        values.push(join_method);
      }
      
      if (content_filter_level !== undefined) {
        updates.push("content_filter_level = ?");
        values.push(content_filter_level);
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
};

// Community Members operations
const getCommunityMembers = async (communityId) => {
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
};

const getCommunityMember = async (communityId, userId) => {
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
};

const addCommunityMember = async (communityId, userId, role = 'member') => {
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
};

const updateCommunityMemberRole = async (communityId, userId, role, updatedBy) => {
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
};

const removeCommunityMember = async (communityId, userId) => {
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
};

// Community Join Request operations
const getJoinRequests = async (communityId, status) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = "SELECT * FROM community_join_request WHERE community_id = ?";
    const params = [communityId];
    
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
};

const getJoinRequest = async (requestId) => {
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
};

const createJoinRequest = async (communityId, userId) => {
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
};

const updateJoinRequestStatus = async (requestId, status, updatedBy) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Get the current request to check if it's pending
    const [request] = await conn.query(
      "SELECT * FROM community_
