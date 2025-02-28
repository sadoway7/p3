// Helper script to update community_members with usernames
const mariadb = require('mariadb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function updateMembersWithUsernames() {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Get all users
    const users = await conn.query("SELECT id, username FROM users");
    
    if (users.length === 0) {
      console.log("No users found in the database");
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // Create a map of user IDs to usernames
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, user.username);
    });
    
    // Get all community members
    const members = await conn.query("SELECT * FROM community_members");
    
    if (members.length === 0) {
      console.log("No community members found in the database");
      return;
    }
    
    console.log(`Found ${members.length} community members`);
    
    // Create a test query that retrieves members with usernames
    try {
      const testQuery = `
        SELECT cm.*, u.username 
        FROM community_members cm 
        LEFT JOIN users u ON cm.user_id = u.id 
        LIMIT 10
      `;
      
      const testResult = await conn.query(testQuery);
      console.log("Test query result:", testResult);
      
      // If we got here, the query worked!
      console.log("LEFT JOIN to users table works correctly");
    } catch (error) {
      console.error("LEFT JOIN test failed:", error.message);
      console.log("User IDs in community_members might not match users table IDs");
    }
    
    // Report on moderation status
    const moderators = members.filter(m => m.role === 'moderator' || m.role === 'admin');
    console.log(`Found ${moderators.length} moderators/admins`);
    
    for (const mod of moderators) {
      const username = userMap.get(mod.user_id) || 'Unknown User';
      console.log(`Community ${mod.community_id}: Moderator ${username} (${mod.user_id}), role: ${mod.role}`);
    }
    
    console.log("Database check complete");
  } catch (error) {
    console.error("Error updating members with usernames:", error);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

updateMembersWithUsernames();