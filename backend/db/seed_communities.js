// Seed script to create sample communities and related data
const mariadb = require('mariadb');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
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

async function seedCommunities() {
  let conn;

  try {
    conn = await pool.getConnection();
    
    // Sample communities data
    const communities = [
      {
        id: uuidv4(),
        name: 'technology',
        description: 'Discussion about the latest in technology, gadgets, and software.',
        privacy: 'public'
      },
      {
        id: uuidv4(),
        name: 'programming',
        description: 'Share tips, ask questions, and discuss all aspects of programming.',
        privacy: 'public'
      },
      {
        id: uuidv4(),
        name: 'fitness',
        description: 'A community for fitness enthusiasts to share advice and progress.',
        privacy: 'public'
      }
    ];
    
    // Create the communities
    for (const community of communities) {
      try {
        // Check if the community already exists
        const [existingCommunity] = await conn.query('SELECT * FROM communities WHERE name = ?', [community.name]);
        
        if (!existingCommunity) {
          // Insert the community
          await conn.query(
            'INSERT INTO communities (id, name, description, privacy) VALUES (?, ?, ?, ?)',
            [community.id, community.name, community.description, community.privacy]
          );
          
          // Add default settings
          await conn.query(
            'INSERT INTO community_settings (community_id, allow_post_images, allow_post_links) VALUES (?, ?, ?)',
            [community.id, true, true]
          );
          
          console.log(`Created community: ${community.name}`);
          
          // Create sample rules for each community
          const rules = [
            {
              id: uuidv4(),
              title: 'Be respectful',
              description: 'Treat others with respect. No personal attacks or harassment.'
            },
            {
              id: uuidv4(),
              title: 'No spam',
              description: 'Don\'t spam posts or comments.'
            },
            {
              id: uuidv4(),
              title: 'Stay on topic',
              description: 'Posts should be relevant to the community topic.'
            }
          ];
          
          for (const rule of rules) {
            await conn.query(
              'INSERT INTO community_rules (id, community_id, title, description) VALUES (?, ?, ?, ?)',
              [rule.id, community.id, rule.title, rule.description]
            );
          }
          
          console.log(`Added rules for community: ${community.name}`);
          
          // Get a sample user to be moderator (if users table exists and has data)
          try {
            const users = await conn.query('SELECT id FROM users LIMIT 1');
            
            if (users && users.length > 0) {
              const userId = users[0].id;
              
              // Add the user as a moderator
              await conn.query(
                'INSERT INTO community_members (community_id, user_id, role) VALUES (?, ?, ?)',
                [community.id, userId, 'moderator']
              );
              
              console.log(`Added moderator for community: ${community.name}`);
            }
          } catch (error) {
            console.log(`No users available to add as moderators for ${community.name}`);
          }
        } else {
          console.log(`Community ${community.name} already exists`);
        }
      } catch (error) {
        console.error(`Error creating community ${community.name}:`, error);
      }
    }
    
    console.log('Seeding completed');
  } catch (error) {
    console.error('Error seeding communities:', error);
  } finally {
    if (conn) conn.release();
  }
}

seedCommunities()
  .then(() => console.log('Seed script completed'))
  .catch(err => console.error('Seed script failed:', err))
  .finally(() => process.exit());
