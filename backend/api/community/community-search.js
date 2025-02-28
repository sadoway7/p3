const mariadb = require('mariadb');
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

// Community Search operations
const searchCommunities = async (searchTerm, limit = 20, offset = 0) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Search for communities by name or description
    const communities = await conn.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM community_member WHERE community_id = c.id) as member_count
       FROM community c
       WHERE c.name LIKE ? OR c.description LIKE ?
       ORDER BY member_count DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, limit, offset]
    );
    
    return communities;
  } catch (error) {
    console.error("Error searching communities:", error);
    throw new Error('Failed to search communities');
  } finally {
    if (conn) conn.end();
  }
};

const getDiscoverableCommunities = async (limit = 20, offset = 0) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get communities that are set to be discoverable
    const communities = await conn.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM community_member WHERE community_id = c.id) as member_count
       FROM community c
       JOIN community_setting cs ON c.id = cs.community_id
       WHERE cs.show_in_discovery = TRUE
       ORDER BY member_count DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    return communities;
  } catch (error) {
    console.error("Error fetching discoverable communities:", error);
    throw new Error('Failed to fetch discoverable communities');
  } finally {
    if (conn) conn.end();
  }
};

const getTrendingCommunities = async (limit = 10) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get trending communities based on recent activity
    const communities = await conn.query(
      `SELECT c.*, 
        COUNT(DISTINCT cm.user_id) as member_count,
        COUNT(DISTINCT a.id) as recent_activity_count
       FROM community c
       LEFT JOIN community_member cm ON c.id = cm.community_id
       LEFT JOIN activity a ON a.entity_id = c.id 
         AND a.entity_type = 'community'
         AND a.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
       JOIN community_setting cs ON c.id = cs.community_id
       WHERE cs.show_in_discovery = TRUE
       GROUP BY c.id
       ORDER BY recent_activity_count DESC, member_count DESC
       LIMIT ?`,
      [limit]
    );
    
    return communities;
  } catch (error) {
    console.error("Error fetching trending communities:", error);
    throw new Error('Failed to fetch trending communities');
  } finally {
    if (conn) conn.end();
  }
};

const getRecommendedCommunities = async (userId, limit = 10) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get recommended communities based on user's interests and activity
    // This is a simplified recommendation algorithm
    const communities = await conn.query(
      `SELECT c.*, 
        COUNT(DISTINCT cm.user_id) as member_count
       FROM community c
       JOIN community_member cm ON c.id = cm.community_id
       JOIN community_setting cs ON c.id = cs.community_id
       WHERE cs.show_in_discovery = TRUE
       AND c.id NOT IN (
         SELECT community_id FROM community_member WHERE user_id = ?
       )
       AND cm.user_id IN (
         -- Users who are in the same communities as this user
         SELECT DISTINCT cm2.user_id 
         FROM community_member cm1
         JOIN community_member cm2 ON cm1.community_id = cm2.community_id
         WHERE cm1.user_id = ? AND cm2.user_id != ?
       )
       GROUP BY c.id
       ORDER BY member_count DESC
       LIMIT ?`,
      [userId, userId, userId, limit]
    );
    
    return communities;
  } catch (error) {
    console.error("Error fetching recommended communities:", error);
    throw new Error('Failed to fetch recommended communities');
  } finally {
    if (conn) conn.end();
  }
};

// Export the functions
module.exports = {
  searchCommunities,
  getDiscoverableCommunities,
  getTrendingCommunities,
  getRecommendedCommunities
};
