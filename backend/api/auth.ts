// Updated auth.ts for the new database schema
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logActivity } from './activity';
import pool from '../db/connection';
import { QueryResult } from 'mysql2';

dotenv.config();

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Token expiration (1 day)
const TOKEN_EXPIRATION = '1d';

// User interface
interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  role: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  date_of_birth?: Date;
  bio?: string;
  avatar_url?: string;
  profile_banner_url?: string;
  website?: string;
  location?: string;
  is_verified?: boolean;
  status?: string;
  cake_day?: Date;
  created_at: Date;
  updated_at: Date;
  last_active?: Date;
  karma?: number;
  posts_count?: number;
  comments_count?: number;
  upvotes_received?: number;
  downvotes_received?: number;
  upvotes_given?: number;
  downvotes_given?: number;
  communities_joined?: number;
}

// Password validation
const isStrongPassword = (password: string): boolean => {
  // At least 8 characters
  if (password.length < 8) return false;
  
  // Check for uppercase, lowercase, number, and special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

// User registration
export async function register(userData: { username: string; email: string; password: string }) {
  let conn;
  try {
    // Validate password strength
    if (!isStrongPassword(userData.password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
    }
    
    conn = await pool.getConnection();
    
    // Start transaction
    await conn.beginTransaction();
    
    // Check if username or email already exists
    const [existingUser] = await conn.query(
      "SELECT * FROM user WHERE username = ? OR email = ?",
      [userData.username, userData.email]
    );
    if (Array.isArray(existingUser) && existingUser.length > 0) {
      throw new Error('Username or email already exists');
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Create new user
    const id = uuidv4();
    const now = new Date();
    
    await conn.query(
      `INSERT INTO user (
        id, username, email, password_hash, role, 
        created_at, updated_at, cake_day, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userData.username, userData.email, hashedPassword, 'user', now, now, now, now]
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
    
    // Get the created user (without password)
    const [newUser] = await conn.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
        s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.id = ?`,
      [id]
    );
    
    // Log activity
    try {
      await logActivity({
        userId: id,
        activityType: 'USER',
        actionType: 'REGISTER',
        entityId: id,
        entityType: 'user',
        metadata: { username: userData.username, email: userData.email },
        ipAddress: undefined,
        userAgent: undefined
      });
    } catch (error) {
      console.error("Error logging registration activity:", error);
      // Don't throw, just log the error
    }
    
    return { user: newUser };
  } catch (error) {
    // Rollback transaction on error
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }
    
    console.error("Error registering user:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// User login
export async function login(credentials: { username: string; password: string }) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Find user by username
    const userResult = await conn.query(
      `SELECT u.*, s.karma, s.posts_count, s.comments_count, s.upvotes_received, 
        s.downvotes_received, s.upvotes_given, s.downvotes_given, 
        s.communities_joined
      FROM user u
      LEFT JOIN user_statistic s ON u.id = s.user_id
      WHERE u.username = ?`,
      [credentials.username]
    );
    
    const [rows] = userResult as [any[], any];
    const user = rows[0] as User;
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash || '');
    
    if (!passwordMatch) {
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
      { expiresIn: TOKEN_EXPIRATION }
    );
    
    // Log activity
    try {
      await logActivity({
        userId: user.id,
        activityType: 'USER',
        actionType: 'LOGIN',
        entityId: user.id,
        entityType: 'user',
        metadata: null,
        ipAddress: undefined,
        userAgent: undefined
      });
    } catch (error) {
      console.error("Error logging login activity:", error);
      // Don't throw, just log the error
    }
    
    // Return user info and token (without password)
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
}

// Get current user from token
export async function getCurrentUser(userId: string) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Find user by ID with statistics
    const userResult = await conn.query(
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
    
    const [rows] = userResult as [any[], any];
    const user = rows[0] as User;
    
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
}

// Middleware to verify JWT token
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// User logout
export async function logout(userId: string) {
  try {
    // Log activity
    await logActivity({
      userId,
      activityType: 'USER',
      actionType: 'LOGOUT',
      entityId: userId,
      entityType: 'user',
      metadata: null,
      ipAddress: undefined,
      userAgent: undefined
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
}