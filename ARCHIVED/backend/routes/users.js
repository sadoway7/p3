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
        `SELECT id, username, email, role, bio, avatar_url, post_count, 
         comment_count, upvotes_received, downvotes_received, upvotes_given, 
         downvotes_given, communities_joined, last_active, created_at
         FROM users`
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
        `SELECT id, username, email, role, bio, avatar_url, post_count, 
         comment_count, upvotes_received, downvotes_received, upvotes_given, 
         downvotes_given, communities_joined, last_active, created_at
         FROM users WHERE id = ?`,
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
    const { username, email, bio, avatar } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Check if username is already taken by another user
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      
      // Update user profile
      await connection.execute(
        `UPDATE users SET 
         username = ?, 
         email = ?, 
         bio = ?, 
         avatar_url = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [username, email, bio || null, avatar || null, userId]
      );
      
      // Get updated user data
      const [rows] = await connection.execute(
        `SELECT id, username, email, role, bio, avatar_url, post_count, 
         comment_count, upvotes_received, downvotes_received, upvotes_given, 
         downvotes_given, communities_joined, last_active, created_at
         FROM users WHERE id = ?`,
        [userId]
      );
      
      // Remove sensitive information
      const user = rows[0];
      delete user.password_hash;
      
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
        `SELECT post_count, comment_count, upvotes_received, downvotes_received, 
         upvotes_given, downvotes_given, communities_joined, last_active
         FROM users WHERE id = ?`,
        [req.params.userId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
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

// Get user friends
router.get('/:userId/friends', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get accepted friends
      const [rows] = await connection.execute(
        `SELECT u.id, u.username, u.avatar_url, uf.created_at as friendship_date
         FROM user_friends uf
         JOIN users u ON (uf.friend_id = u.id)
         WHERE uf.user_id = ? AND uf.status = 'accepted'
         UNION
         SELECT u.id, u.username, u.avatar_url, uf.created_at as friendship_date
         FROM user_friends uf
         JOIN users u ON (uf.user_id = u.id)
         WHERE uf.friend_id = ? AND uf.status = 'accepted'
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

// Get user ID by username
router.get('/lookup/:username', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
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
         FROM community_members cm
         JOIN communities c ON cm.community_id = c.id
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

module.exports = router;
