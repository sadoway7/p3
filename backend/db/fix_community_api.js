// Fix the community API issues by adding proper tables and data
const mariadb = require('mariadb');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function fixCommunityApi() {
  let conn;

  try {
    conn = await pool.getConnection();

    // 1. Add privacy column to communities table if it doesn't exist
    try {
      await conn.query(`
        ALTER TABLE communities 
        ADD COLUMN IF NOT EXISTS privacy ENUM('public', 'private') DEFAULT 'public'
      `);
      console.log('Added privacy column to communities table');
    } catch (error) {
      console.log('Skipping adding privacy column - may already exist or table structure is different');
    }

    // 2. Create community_members table if it doesn't exist
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS community_members (
          community_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          role ENUM('member', 'moderator', 'admin') DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (community_id, user_id),
          FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Created or verified community_members table');
    } catch (error) {
      console.error('Error creating community_members table:', error);
    }

    // 3. Create community_rules table if it doesn't exist
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS community_rules (
          id VARCHAR(36) PRIMARY KEY,
          community_id VARCHAR(36) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
        )
      `);
      console.log('Created or verified community_rules table');
    } catch (error) {
      console.error('Error creating community_rules table:', error);
    }

    // 4. Create community_settings table if it doesn't exist
    try {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS community_settings (
          community_id VARCHAR(36) PRIMARY KEY,
          allow_post_images BOOLEAN DEFAULT TRUE,
          allow_post_links BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
        )
      `);
      console.log('Created or verified community_settings table');
    } catch (error) {
      console.error('Error creating community_settings table:', error);
    }

    // 5. Add default settings for communities that don't have them
    try {
      // Get all communities
      const communities = await conn.query('SELECT id FROM communities');
      
      // For each community, check if it has settings and add if not
      for (const community of communities) {
        const [setting] = await conn.query(
          'SELECT community_id FROM community_settings WHERE community_id = ?',
          [community.id]
        );
        
        if (!setting) {
          await conn.query(
            'INSERT INTO community_settings (community_id, allow_post_images, allow_post_links) VALUES (?, ?, ?)',
            [community.id, true, true]
          );
          console.log(`Added default settings for community ${community.id}`);
        }
      }
    } catch (error) {
      console.error('Error setting up default community settings:', error);
    }

    console.log('Database fixes complete');
  } catch (error) {
    console.error('Error fixing community API:', error);
  } finally {
    if (conn) conn.release();
  }
}

fixCommunityApi()
  .then(() => console.log('Fix script completed'))
  .catch(err => console.error('Fix script failed:', err))
  .finally(() => process.exit());
