// Updated auth.js for the new database schema
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection.js');
const { logActivity } = require('./activity.js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Password validation
const isStrongPassword = (password) => {
  // At least 8 characters
  if (password.length < 8) return false;
  
  // Check for uppercase, lowercase, number, and special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

// Register a new user
const register = async (userData) => {
  const { username, email, password } = userData;
  let conn;
  
  try {
    // Validate password strength
    if (!isStrongPassword(password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
    }
    
    conn = await pool.getConnection();
    
    // Start transaction
    await conn.beginTransaction();
    
    try {
      // Check if username or email already exists
      const [existingUsers] = await conn.query(
        "SELECT username, email FROM user WHERE username = ? OR email = ?",
        [username, email]
      );
      
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        if (existingUsers.some(user => user.username === username)) {
          throw new Error('Username already exists');
        }
        if (existingUsers.some(user => user.email === email)) {
          throw new Error('Email already exists');
        }
        throw new Error('Username or email already exists');
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      
      // Create a new user
      const id = uuidv4();
      const now = new Date();
      
      await conn.query(
        `INSERT INTO user (
          id, username, email, password_hash, role, 
          created_at, updated_at, cake_day, last_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, username, email, password_hash, 'user', now, now, now, now]
      );
      
      // Create user statistics record
      await conn.query(
        `INSERT INTO user_statistic (
          user_id, karma, posts_count, comments_count, 
          upvotes_received, downvotes_received, upvotes_given, 
          downvotes_given, communities_joined, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, 0, 0, 0, 0, 0, 0, 0, 0, now, now]
      );
      
      // Create user settings record
      await conn.query(
        `INSERT INTO user_setting (
          user_id, email_notifications, push_notifications, 
          theme, content_filter, allow_followers, 
          display_online_status, language, timezone, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, true, true, 'light', 'standard', true, true, 'en', 'UTC', now]
      );
      
      // Commit transaction
      await conn.commit();
      
      // Return user without password
      const [results] = await conn.query(
        `SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
          s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
          s.downvotes_received, s.upvotes_given, s.downvotes_given, 
          s.communities_joined
        FROM user u
        LEFT JOIN user_statistic s ON u.id = s.user_id
        WHERE u.id = ?`,
        [id]
      );
      
      const newUser = Array.isArray(results) && results.length > 0 ? results[0] : null;
      
      if (!newUser) {
        throw new Error('Failed to retrieve created user');
      }
      
      // Log activity (don't wait for it to complete)
      logActivity({
        userId: id,
        activityType: 'USER',
        actionType: 'REGISTER',
        entityId: id,
        entityType: 'user',
        metadata: { username, email },
        ipAddress: null,
        userAgent: null
      }).catch(error => {
        console.error("Error logging registration activity:", error);
        // Don't throw, just log the error
      });
      
      return { user: newUser };
    } catch (transactionError) {
      // Rollback transaction on error
      await conn.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Login a user
const login = async (credentials) => {
  const { username, password } = credentials;
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Find user by username
    const [users] = await conn.query(
      `SELECT u.*, s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.username = ?`,
      [username]
    );
    
    const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid username or password');
    }
    
    // Update last_active timestamp
    await conn.query(
      "UPDATE user SET last_active = ? WHERE id = ?",
      [new Date(), user.id]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Log activity (don't wait for it to complete)
    logActivity({
      userId: user.id,
      activityType: 'USER',
      actionType: 'LOGIN',
      entityId: user.id,
      entityType: 'user',
      metadata: null,
      ipAddress: null,
      userAgent: null
    }).catch(error => {
      console.error("Error logging login activity:", error);
      // Don't throw, just log the error
    });
    
    // Return user and token (without password)
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Get current user
const getCurrentUser = async (userId) => {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Find user by ID with statistics
    const [users] = await conn.query(
      `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
        u.display_name, u.bio, u.avatar_url, u.profile_banner_url, u.website,
        u.location, u.is_verified, u.status, u.cake_day, u.created_at, 
        u.updated_at, u.last_active,
        s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.id = ?`,
      [userId]
    );
    
    const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update last_active timestamp
    await conn.query(
      "UPDATE user SET last_active = ? WHERE id = ?",
      [new Date(), userId]
    );
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Logout (just for activity logging)
const logout = async (userId) => {
  try {
    // Log activity
    await logActivity({
      userId,
      activityType: 'USER',
      actionType: 'LOGOUT',
      entityId: userId,
      entityType: 'user',
      metadata: null,
      ipAddress: null,
      userAgent: null
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  verifyToken,
  logout
};