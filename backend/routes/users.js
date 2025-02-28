const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db/connection');

// Get all users
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.display_name,
         u.role, u.bio, u.avatar_url, u.profile_banner_url, u.website, u.location,
         u.is_verified, u.status, u.cake_day, u.last_active, u.created_at, u.updated_at,
         us.karma, us.posts_count, us.comments_count, us.upvotes_received, 
         us.downvotes_received, us.upvotes_given, us.downvotes_given, us.communities_joined
         FROM user u
         LEFT JOIN user_statistic us ON u.id = us.user_id`
      );
      
      // Remove sensitive information
      const users = rows.map(user => {
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(users);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.display_name,
         u.role, u.bio, u.avatar_url, u.profile_banner_url, u.website, u.location,
         u.is_verified, u.status, u.cake_day, u.last_active, u.created_at, u.updated_at,
         us.karma, us.posts_count, us.comments_count, us.upvotes_received, 
         us.downvotes_received, us.upvotes_given, us.downvotes_given, us.communities_joined
         FROM user u
         LEFT JOIN user_statistic us ON u.id = us.user_id
         WHERE u.id = ?`,
        [req.params.userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove sensitive information
      const user = rows[0];
      delete user.password_hash;
      
      res.json(user);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { 
      username, 
      email, 
      first_name, 
      last_name, 
      display_name, 
      bio, 
      avatar_url, 
      profile_banner_url, 
      website, 
      location 
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if username is already taken by another user
      const [existingUsers] = await connection.execute(
        'SELECT id FROM user WHERE username = ? AND id != ?',
        [username, userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      
      // Update user profile
      await connection.execute(
        `UPDATE user SET 
         username = ?, 
         email = ?, 
         first_name = ?,
         last_name = ?,
         display_name = ?,
         bio = ?, 
         avatar_url = ?,
         profile_banner_url = ?,
         website = ?,
         location = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          username, 
          email, 
          first_name || null, 
          last_name || null, 
          display_name || null, 
          bio || null, 
          avatar_url || null, 
          profile_banner_url || null, 
          website || null, 
          location || null, 
          userId
        ]
      );
      
      // Get updated user data
      const [rows] = await connection.execute(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.display_name,
         u.role, u.bio, u.avatar_url, u.profile_banner_url, u.website, u.location,
         u.is_verified, u.status, u.cake_day, u.last_active, u.created_at, u.updated_at,
         us.karma, us.posts_count, us.comments_count, us.upvotes_received, 
         us.downvotes_received, us.upvotes_given, us.downvotes_given, us.communities_joined
         FROM user u
         LEFT JOIN user_statistic us ON u.id = us.user_id
         WHERE u.id = ?`,
        [userId]
      );
      
      // Remove sensitive information
      const user = rows[0];
      delete user.password_hash;
      
      // Log activity
      await connection.execute(
        `INSERT INTO activity (
          id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
        ) VALUES (
          ?, ?, 
          (SELECT id FROM activity_type WHERE name = 'USER'),
          (SELECT id FROM action WHERE name = 'UPDATE'),
          ?, 'user', NOW()
        )`,
        [uuidv4(), userId, userId]
      );
      
      res.json(user);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/:userId/statistics', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM user_statistic WHERE user_id = ?`,
        [req.params.userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User statistics not found' });
      }
      
      res.json(rows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM user_setting WHERE user_id = ?`,
        [userId]
      );
      
      if (rows.length === 0) {
        // Create default settings if they don't exist
        const defaultSettings = {
          email_notifications: true,
          push_notifications: true,
          theme: 'light',
          content_filter: 'standard',
          allow_followers: true,
          display_online_status: true,
          language: 'en',
          timezone: 'UTC'
        };
        
        await connection.execute(
          `INSERT INTO user_setting (
            user_id, email_notifications, push_notifications, theme,
            content_filter, allow_followers, display_online_status,
            language, timezone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            defaultSettings.email_notifications ? 1 : 0,
            defaultSettings.push_notifications ? 1 : 0,
            defaultSettings.theme,
            defaultSettings.content_filter,
            defaultSettings.allow_followers ? 1 : 0,
            defaultSettings.display_online_status ? 1 : 0,
            defaultSettings.language,
            defaultSettings.timezone
          ]
        );
        
        return res.json(defaultSettings);
      }
      
      // Convert boolean fields from 0/1 to false/true
      const settings = rows[0];
      settings.email_notifications = !!settings.email_notifications;
      settings.push_notifications = !!settings.push_notifications;
      settings.allow_followers = !!settings.allow_followers;
      settings.display_online_status = !!settings.display_online_status;
      
      res.json(settings);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_notifications,
      push_notifications,
      theme,
      content_filter,
      allow_followers,
      display_online_status,
      language,
      timezone
    } = req.body;
    
    const connection = await pool.getConnection();
    
    try {
      // Check if settings exist
      const [existingSettings] = await connection.execute(
        `SELECT * FROM user_setting WHERE user_id = ?`,
        [userId]
      );
      
      if (existingSettings.length === 0) {
        // Create settings if they don't exist
        await connection.execute(
          `INSERT INTO user_setting (
            user_id, email_notifications, push_notifications, theme,
            content_filter, allow_followers, display_online_status,
            language, timezone
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            email_notifications ? 1 : 0,
            push_notifications ? 1 : 0,
            theme || 'light',
            content_filter || 'standard',
            allow_followers ? 1 : 0,
            display_online_status ? 1 : 0,
            language || 'en',
            timezone || 'UTC'
          ]
        );
      } else {
        // Update existing settings
        await connection.execute(
          `UPDATE user_setting SET
            email_notifications = ?,
            push_notifications = ?,
            theme = ?,
            content_filter = ?,
            allow_followers = ?,
            display_online_status = ?,
            language = ?,
            timezone = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?`,
          [
            email_notifications ? 1 : 0,
            push_notifications ? 1 : 0,
            theme || 'light',
            content_filter || 'standard',
            allow_followers ? 1 : 0,
            display_online_status ? 1 : 0,
            language || 'en',
            timezone || 'UTC',
            userId
          ]
        );
      }
      
      // Get updated settings
      const [rows] = await connection.execute(
        `SELECT * FROM user_setting WHERE user_id = ?`,
        [userId]
      );
      
      // Convert boolean fields from 0/1 to false/true
      const settings = rows[0];
      settings.email_notifications = !!settings.email_notifications;
      settings.push_notifications = !!settings.push_notifications;
      settings.allow_followers = !!settings.allow_followers;
      settings.display_online_status = !!settings.display_online_status;
      
      res.json(settings);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user relationships (friends)
router.get('/:userId/friends', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get accepted friends
      const [rows] = await connection.execute(
        `SELECT u.id, u.username, u.display_name, u.avatar_url, ur.created_at as friendship_date
         FROM user_relationship ur
         JOIN user u ON (ur.related_user_id = u.id)
         WHERE ur.user_id = ? AND ur.relationship_type = 'friend' AND ur.status = 'accepted'
         UNION
         SELECT u.id, u.username, u.display_name, u.avatar_url, ur.created_at as friendship_date
         FROM user_relationship ur
         JOIN user u ON (ur.user_id = u.id)
         WHERE ur.related_user_id = ? AND ur.relationship_type = 'friend' AND ur.status = 'accepted'
         ORDER BY friendship_date DESC`,
        [req.params.userId, req.params.userId]
      );
      
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add friend request
router.post('/friends/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.targetUserId;
    
    // Prevent self-friending
    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if relationship already exists
      const [existingRelationship] = await connection.execute(
        `SELECT * FROM user_relationship 
         WHERE (user_id = ? AND related_user_id = ?) 
         OR (user_id = ? AND related_user_id = ?)
         AND relationship_type = 'friend'`,
        [userId, targetUserId, targetUserId, userId]
      );
      
      if (existingRelationship.length > 0) {
        return res.status(400).json({ 
          error: 'Relationship already exists', 
          status: existingRelationship[0].status 
        });
      }
      
      // Create friend request
      const relationshipId = uuidv4();
      await connection.execute(
        `INSERT INTO user_relationship (
          id, user_id, related_user_id, relationship_type, status, created_at
        ) VALUES (?, ?, ?, 'friend', 'pending', NOW())`,
        [relationshipId, userId, targetUserId]
      );
      
      // Log activity
      await connection.execute(
        `INSERT INTO activity (
          id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
        ) VALUES (
          ?, ?, 
          (SELECT id FROM activity_type WHERE name = 'USER'),
          (SELECT id FROM action WHERE name = 'CREATE'),
          ?, 'user_relationship', NOW()
        )`,
        [uuidv4(), userId, relationshipId]
      );
      
      res.status(201).json({ message: 'Friend request sent' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept/reject friend request
router.put('/friends/:relationshipId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const relationshipId = req.params.relationshipId;
    const { status } = req.body; // 'accepted' or 'rejected'
    
    if (status !== 'accepted' && status !== 'rejected') {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if relationship exists and user is the target
      const [relationship] = await connection.execute(
        `SELECT * FROM user_relationship 
         WHERE id = ? AND related_user_id = ? AND relationship_type = 'friend' AND status = 'pending'`,
        [relationshipId, userId]
      );
      
      if (relationship.length === 0) {
        return res.status(404).json({ error: 'Friend request not found' });
      }
      
      // Update relationship status
      await connection.execute(
        `UPDATE user_relationship SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, relationshipId]
      );
      
      // Log activity
      await connection.execute(
        `INSERT INTO activity (
          id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
        ) VALUES (
          ?, ?, 
          (SELECT id FROM activity_type WHERE name = 'USER'),
          (SELECT id FROM action WHERE name = 'UPDATE'),
          ?, 'user_relationship', NOW()
        )`,
        [uuidv4(), userId, relationshipId]
      );
      
      res.json({ message: `Friend request ${status}` });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove friend
router.delete('/friends/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const targetUserId = req.params.targetUserId;
    
    const connection = await pool.getConnection();
    
    try {
      // Delete the relationship in both directions
      await connection.execute(
        `DELETE FROM user_relationship 
         WHERE ((user_id = ? AND related_user_id = ?) 
         OR (user_id = ? AND related_user_id = ?))
         AND relationship_type = 'friend'`,
        [userId, targetUserId, targetUserId, userId]
      );
      
      // Log activity
      await connection.execute(
        `INSERT INTO activity (
          id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
        ) VALUES (
          ?, ?, 
          (SELECT id FROM activity_type WHERE name = 'USER'),
          (SELECT id FROM action WHERE name = 'DELETE'),
          ?, 'user_relationship', NOW()
        )`,
        [uuidv4(), userId, targetUserId]
      );
      
      res.json({ message: 'Friend removed' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user ID by username
router.get('/lookup/:username', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM user WHERE username = ?',
        [req.params.username]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ id: rows[0].id });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error looking up user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user communities
router.get('/:userId/communities', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT c.id, c.name, c.description, cm.role, cm.joined_at
         FROM community_member cm
         JOIN community c ON cm.community_id = c.id
         WHERE cm.user_id = ?
         ORDER BY cm.joined_at DESC`,
        [req.params.userId]
      );
      
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activities
router.get('/:userId/activities', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        `SELECT a.id, a.created_at, at.name as activity_type, ac.name as action,
         a.entity_id, a.entity_type, a.metadata
         FROM activity a
         JOIN activity_type at ON a.activity_type_id = at.id
         JOIN action ac ON a.action_id = ac.id
         WHERE a.user_id = ?
         ORDER BY a.created_at DESC
         LIMIT 50`,
        [req.params.userId]
      );
      
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
