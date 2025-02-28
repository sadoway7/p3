// Script to apply the auth schema changes
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pool = require('./connection');

async function applyAuthSchema() {
  console.log('Applying auth schema changes...');
  
  try {
    // 1. Create backup of original files
    console.log('Creating backups of original files...');
    
    const filesToBackup = [
      { src: '../api/auth.js', dest: '../api/auth.js.bak' },
      { src: '../api/auth.ts', dest: '../api/auth.ts.bak' },
      { src: '../routes/auth.js', dest: '../routes/auth.js.bak' }
    ];
    
    for (const file of filesToBackup) {
      const srcPath = path.join(__dirname, file.src);
      const destPath = path.join(__dirname, file.dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Backed up ${file.src} to ${file.dest}`);
      } else {
        console.log(`Warning: ${file.src} does not exist, skipping backup`);
      }
    }
    
    // 2. Apply database schema changes
    console.log('Applying database schema changes...');
    
    const conn = await pool.getConnection();
    
    try {
      // Start transaction
      await conn.beginTransaction();
      
      // Check if the user table already exists
      const [userTableExists] = await conn.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user'"
      );
      
      if (userTableExists.count === 0) {
        console.log('Creating user table...');
        
        // Rename users table to user if it exists
        const [usersTableExists] = await conn.query(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
        );
        
        if (usersTableExists.count > 0) {
          await conn.query("RENAME TABLE users TO user");
          console.log('Renamed users table to user');
          
          // Add new columns to user table
          const columnsToAdd = [
            "ADD COLUMN IF NOT EXISTS first_name VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS last_name VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS display_name VARCHAR(50) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS profile_banner_url VARCHAR(255) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS website VARCHAR(255) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT NULL",
            "ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
            "ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
            "ADD COLUMN IF NOT EXISTS cake_day DATETIME DEFAULT CURRENT_TIMESTAMP",
            "ADD COLUMN IF NOT EXISTS last_active DATETIME DEFAULT CURRENT_TIMESTAMP"
          ];
          
          for (const column of columnsToAdd) {
            try {
              await conn.query(`ALTER TABLE user ${column}`);
              console.log(`Added column: ${column}`);
            } catch (error) {
              console.warn(`Warning: Could not add column: ${column}`, error.message);
            }
          }
        } else {
          // Create user table from scratch
          await conn.query(`
            CREATE TABLE user (
              id VARCHAR(36) PRIMARY KEY,
              username VARCHAR(50) NOT NULL UNIQUE,
              email VARCHAR(100) NOT NULL UNIQUE,
              password_hash VARCHAR(255) NOT NULL,
              role VARCHAR(20) NOT NULL DEFAULT 'user',
              first_name VARCHAR(50) DEFAULT NULL,
              last_name VARCHAR(50) DEFAULT NULL,
              display_name VARCHAR(50) DEFAULT NULL,
              date_of_birth DATE DEFAULT NULL,
              bio TEXT DEFAULT NULL,
              avatar_url VARCHAR(255) DEFAULT NULL,
              profile_banner_url VARCHAR(255) DEFAULT NULL,
              website VARCHAR(255) DEFAULT NULL,
              location VARCHAR(100) DEFAULT NULL,
              is_verified BOOLEAN DEFAULT FALSE,
              status VARCHAR(50) DEFAULT 'active',
              cake_day DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_username (username),
              INDEX idx_email (email),
              INDEX idx_role (role)
            )
          `);
          console.log('Created user table');
        }
      } else {
        console.log('User table already exists, skipping creation');
      }
      
      // Create user_statistic table if it doesn't exist
      const [userStatisticTableExists] = await conn.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_statistic'"
      );
      
      if (userStatisticTableExists.count === 0) {
        console.log('Creating user_statistic table...');
        
        await conn.query(`
          CREATE TABLE user_statistic (
            user_id VARCHAR(36) PRIMARY KEY,
            karma INT DEFAULT 0,
            posts_count INT DEFAULT 0,
            comments_count INT DEFAULT 0,
            upvotes_received INT DEFAULT 0,
            downvotes_received INT DEFAULT 0,
            upvotes_given INT DEFAULT 0,
            downvotes_given INT DEFAULT 0,
            communities_joined INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
          )
        `);
        console.log('Created user_statistic table');
        
        // Populate user_statistic table with existing users
        await conn.query(`
          INSERT INTO user_statistic (user_id, created_at, updated_at)
          SELECT id, created_at, updated_at FROM user
          WHERE id NOT IN (SELECT user_id FROM user_statistic)
        `);
        console.log('Populated user_statistic table with existing users');
      } else {
        console.log('User_statistic table already exists, skipping creation');
      }
      
      // Create user_setting table if it doesn't exist
      const [userSettingTableExists] = await conn.query(
        "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_setting'"
      );
      
      if (userSettingTableExists.count === 0) {
        console.log('Creating user_setting table...');
        
        await conn.query(`
          CREATE TABLE user_setting (
            user_id VARCHAR(36) PRIMARY KEY,
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            theme VARCHAR(20) DEFAULT 'light',
            content_filter VARCHAR(20) DEFAULT 'standard',
            allow_followers BOOLEAN DEFAULT TRUE,
            display_online_status BOOLEAN DEFAULT TRUE,
            language VARCHAR(10) DEFAULT 'en',
            timezone VARCHAR(50) DEFAULT 'UTC',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
          )
        `);
        console.log('Created user_setting table');
        
        // Populate user_setting table with existing users
        await conn.query(`
          INSERT INTO user_setting (user_id, updated_at)
          SELECT id, updated_at FROM user
          WHERE id NOT IN (SELECT user_id FROM user_setting)
        `);
        console.log('Populated user_setting table with existing users');
      } else {
        console.log('User_setting table already exists, skipping creation');
      }
      
      // Commit transaction
      await conn.commit();
      console.log('Database schema changes applied successfully');
      
    } catch (error) {
      // Rollback transaction on error
      await conn.rollback();
      console.error('Error applying database schema changes:', error);
      throw error;
    } finally {
      conn.release();
    }
    
    // 3. Replace the auth files with the new versions
    console.log('Replacing auth files with new versions...');
    
    const filesToReplace = [
      { src: '../api/auth.js.new', dest: '../api/auth.js' },
      { src: '../api/auth.ts.new', dest: '../api/auth.ts' },
      { src: '../routes/auth.js.new', dest: '../routes/auth.js' }
    ];
    
    for (const file of filesToReplace) {
      const srcPath = path.join(__dirname, file.src);
      const destPath = path.join(__dirname, file.dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Replaced ${file.dest} with ${file.src}`);
      } else {
        console.log(`Warning: ${file.src} does not exist, skipping replacement`);
      }
    }
    
    console.log('Auth schema changes applied successfully!');
    
  } catch (error) {
    console.error('Error applying auth schema changes:', error);
    process.exit(1);
  }
}

// Run the function
applyAuthSchema().then(() => {
  console.log('Auth schema update completed');
  process.exit(0);
}).catch(error => {
  console.error('Auth schema update failed:', error);
  process.exit(1);
});
