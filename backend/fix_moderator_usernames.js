// Script to ensure moderators have usernames
const mariadb = require('mariadb');

// Create a connection pool with hardcoded values
const pool = mariadb.createPool({
  host: '192.168.0.139',
  port: 3306,
  user: 'root',
  password: 'Oswald1986!',
  database: 'rumfor1',
  connectionLimit: 15
});

async function fixModeratorUsernames() {
  let conn;

  try {
    conn = await pool.getConnection();

    // First check if the users table exists
    try {
      await conn.query('SELECT 1 FROM users LIMIT 1');
      console.log('✅ Users table exists');
    } catch (error) {
      console.error('❌ Users table does not exist or cannot be accessed');
      return;
    }

    // Now check if the community_members table exists
    try {
      await conn.query('SELECT 1 FROM community_members LIMIT 1');
      console.log('✅ Community_members table exists');
    } catch (error) {
      console.error('❌ Community_members table does not exist or cannot be accessed');
      return;
    }

    // Try to get all members with roles
    try {
      const members = await conn.query(`
        SELECT cm.*, u.username 
        FROM community_members cm 
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE cm.role IN ('moderator', 'admin')
        LIMIT 20
      `);

      console.log(`Found ${members.length} moderators/admins`);

      if (members.length > 0) {
        console.log('\nSample moderator data:');
        members.forEach((mod, i) => {
          console.log(`[${i+1}] User ID: ${mod.user_id}, Username: ${mod.username || 'NULL'}, Role: ${mod.role}`);
        });

        // Check if any moderators are missing usernames
        const missingUsernames = members.filter(m => !m.username);
        if (missingUsernames.length > 0) {
          console.log(`\n⚠️ ${missingUsernames.length} moderators are missing usernames`);
        } else {
          console.log('\n✅ All moderators have usernames');
        }
      }
    } catch (error) {
      console.error('❌ Failed to query moderators:', error.message);
    }

    // Check direct join usage to verify it works
    try {
      const testQuery = `
        SELECT cm.community_id, cm.user_id, cm.role, u.username
        FROM community_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.role IN ('moderator', 'admin')
        LIMIT 5
      `;

      const testResult = await conn.query(testQuery);
      console.log('\nTest JOIN query result:');
      console.log(testResult);

      if (testResult.length > 0) {
        console.log('\n✅ JOIN works correctly and returns usernames');
      } else {
        console.log('\n⚠️ JOIN works but found no results');
      }
    } catch (error) {
      console.error('\n❌ JOIN query failed:', error.message);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (conn) conn.release();
  }
}

// Run the script
fixModeratorUsernames()
  .then(() => console.log('\nScript completed'))
  .catch(err => console.error('\nScript failed:', err))
  .finally(() => process.exit());
