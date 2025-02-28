const mariadb = require('mariadb');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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

// Export the functions
module.exports = {
  getCommunities,
  getCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity
};
