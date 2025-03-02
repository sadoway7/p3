// Fix for the community creation issue with null user_id
const mariadb = require('mariadb');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// Function to extract user ID from token
const getUserIdFromToken = (token) => {
  try {
    // Remove Bearer prefix if present
    const tokenStr = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);
    return decoded.userId || null;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

// Middleware to create community with proper user ID handling
exports.createCommunity = async (req, res) => {
  let conn;
  try {
    // Extract auth token
    const token = req.headers.authorization;
    
    // Get user ID from token if not explicitly provided
    const userId = req.body.creator_id || (token ? getUserIdFromToken(token) : null);
    
    if (!userId) {
      console.warn('WARNING: Creating community without user ID. Activity logging will be skipped.');
    }

    // Create community data
    const { name, description, privacy, icon_url, banner_url, theme_color } = req.body;
    const id = uuidv4();
    
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    // Insert community record - using only the columns that actually exist in the database
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
    
    // Only log activity if we have a valid user ID
    if (userId) {
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
          [activityId, userId, id]
        );
        console.log(`Logged activity for community creation by user ${userId}`);
      } catch (activityError) {
        console.error("Failed to log activity, but will continue with community creation:", activityError);
        // Don't fail the whole operation if just the activity logging fails
      }
    }
    
    // Create default settings
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
      console.error("Failed to create default settings:", settingsError);
      // Continue anyway, settings can be created later
    }
    
    // If user ID is available, add them as admin
    if (userId) {
      try {
        await conn.query(
          "INSERT INTO community_member (community_id, user_id, role, joined_at) VALUES (?, ?, 'admin', NOW())",
          [id, userId]
        );
        console.log(`Added user ${userId} as admin of community ${id}`);
      } catch (memberError) {
        console.error("Failed to add creator as admin:", memberError);
        // Continue anyway, they can join later
      }
    }
    
    await conn.commit();
    
    const [newCommunity] = await conn.query("SELECT * FROM community WHERE id = ?", [id]);
    res.status(201).json(newCommunity);
  } catch (error) {
    console.error("Error creating community:", error);
    if (conn) {
      await conn.rollback();
    }
    res.status(500).json({ error: 'Failed to create community' });
  } finally {
    if (conn) conn.end();
  }
};