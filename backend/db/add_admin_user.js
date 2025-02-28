// Script to add an admin user to the rumfornew2 database
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Database connection configuration
const dbConfig = {
  host: '192.168.0.139',
  port: 3306,
  user: 'rumfornew2',
  password: 'Oswald1986!',
  database: 'rumfornew2',
  multipleStatements: true
};

// Admin user details
const adminUser = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'Oswald1986!',
  role: 'admin',
  display_name: 'Administrator'
};

// Helper function to execute a query and log the result
async function executeQuery(connection, query, params = []) {
  try {
    const [result] = await connection.execute(query, params);
    return result;
  } catch (error) {
    console.error(`Error executing query: ${query}`);
    console.error(error);
    throw error;
  }
}

// Main function to add the admin user
async function addAdminUser() {
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Generate a UUID for the admin user
    const userId = uuidv4();
    
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminUser.password, saltRounds);
    
    // Check if admin user already exists
    const existingUsers = await executeQuery(
      connection,
      'SELECT * FROM user WHERE username = ? OR email = ?',
      [adminUser.username, adminUser.email]
    );
    
    if (existingUsers.length > 0) {
      console.log('Admin user already exists. Skipping creation.');
      return;
    }
    
    // Insert the admin user
    await executeQuery(
      connection,
      `INSERT INTO user (
        id, username, email, password_hash, role, display_name,
        is_verified, status, created_at, updated_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        userId,
        adminUser.username,
        adminUser.email,
        passwordHash,
        adminUser.role,
        adminUser.display_name,
        1, // is_verified
        'active', // status
      ]
    );
    
    // Insert user statistics
    await executeQuery(
      connection,
      `INSERT INTO user_statistic (
        user_id, karma, posts_count, comments_count,
        upvotes_received, downvotes_received, upvotes_given, downvotes_given,
        communities_joined, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        userId,
        1000, // karma
        0, // posts_count
        0, // comments_count
        0, // upvotes_received
        0, // downvotes_received
        0, // upvotes_given
        0, // downvotes_given
        0, // communities_joined
      ]
    );
    
    // Insert user settings
    await executeQuery(
      connection,
      `INSERT INTO user_setting (
        user_id, email_notifications, push_notifications, theme,
        content_filter, allow_followers, display_online_status,
        language, timezone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        1, // email_notifications
        1, // push_notifications
        'light', // theme
        'standard', // content_filter
        1, // allow_followers
        1, // display_online_status
        'en', // language
        'UTC', // timezone
      ]
    );
    
    console.log(`Admin user created successfully with ID: ${userId}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${adminUser.password}`);
  } catch (error) {
    console.error('Error adding admin user:', error);
  } finally {
    // Close connection
    if (connection) await connection.end();
  }
}

// Run the function
addAdminUser();
