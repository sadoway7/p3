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

// Export the functions
module.exports = {
  getCommunitySettings,
  updateCommunitySettings
};
