const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    // Create the connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    // Test for a specific community ID
    const communityId = '0b95216a-d272-47a4-ab4d-0af7417e868b'; // This is the ID that's failing
    
    // Check community details
    try {
      const [community] = await connection.query('SELECT * FROM community WHERE id = ?', [communityId]);
      console.log('Community found:', community.length > 0);
      if (community.length > 0) {
        console.log('Community details:', community[0]);
      }
    } catch (err) {
      console.error('Error accessing community:', err.message);
    }
    
    // Check community members
    try {
      const [members] = await connection.query('SELECT * FROM community_member WHERE community_id = ?', [communityId]);
      console.log('\nCommunity members found:', members.length);
      if (members.length > 0) {
        console.log('Sample member:', members[0]);
      }
    } catch (err) {
      console.error('Error accessing community members:', err.message);
    }
    
    // Check community rules
    try {
      const [rules] = await connection.query('SELECT * FROM community_rule WHERE community_id = ?', [communityId]);
      console.log('\nCommunity rules found:', rules.length);
      if (rules.length > 0) {
        console.log('Sample rule:', rules[0]);
      }
    } catch (err) {
      console.error('Error accessing community rules:', err.message);
    }
    
    // Check community settings
    try {
      const [settings] = await connection.query('SELECT * FROM community_setting WHERE community_id = ?', [communityId]);
      console.log('\nCommunity settings found:', settings.length);
      if (settings.length > 0) {
        console.log('Settings:', settings[0]);
      }
    } catch (err) {
      console.error('Error accessing community settings:', err.message);
    }
    
    // Check posts in this community
    try {
      const [posts] = await connection.query('SELECT * FROM post WHERE community_id = ? LIMIT 5', [communityId]);
      console.log('\nPosts found:', posts.length);
      if (posts.length > 0) {
        console.log('Sample post:', { 
          id: posts[0].id,
          title: posts[0].title,
          user_id: posts[0].user_id
        });
      }
    } catch (err) {
      console.error('Error accessing posts:', err.message);
    }

    await connection.end();
  } catch (err) {
    console.error('Database error:', err);
  }
}

run();