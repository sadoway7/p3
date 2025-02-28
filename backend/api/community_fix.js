// This script temporarily patche the implementation of getCommunityAbout
// to ensure the API returns proper data format.

const fs = require('fs');
const path = require('path');

// File to patch
const filePath = path.join(__dirname, 'communities.js');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading the file: ${err}`);
    return;
  }

  // Define the patch for the getCommunityAbout function
  const patchedFunction = `// Enhanced community information
const getCommunityAbout = async (communityId) => {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Get the community
    const [community] = await conn.query(
      "SELECT * FROM communities WHERE id = ?", 
      [communityId]
    );
    
    if (!community) {
      return null;
    }
    
    // Get member count - fixed to properly extract count from result set
    let memberCount = 0;
    try {
      const memberCountResults = await conn.query(
        "SELECT COUNT(*) as count FROM community_members WHERE community_id = ?",
        [communityId]
      );
      
      // MariaDB returns count in first row, first column named 'count'
      if (memberCountResults && memberCountResults[0] && 
          memberCountResults[0].count !== undefined) {
        memberCount = memberCountResults[0].count;
      }
    } catch (error) {
      console.log("Error getting member count:", error.message);
    }
    
    // Get post count - with proper error handling
    let postCount = 0;
    try {
      const postCountResults = await conn.query(
        "SELECT COUNT(*) as count FROM posts WHERE community_id = ?",
        [communityId]
      );
      
      // MariaDB returns count in first row, first column named 'count'
      if (postCountResults && postCountResults[0] && 
          postCountResults[0].count !== undefined) {
        postCount = postCountResults[0].count;
      }
    } catch (error) {
      console.log("Note: posts table may not exist yet or error occurred:", error.message);
    }
    
    // Get moderators
    let moderatorIds = [];
    try {
      const moderators = await conn.query(
        "SELECT user_id FROM community_members WHERE community_id = ? AND (role = 'moderator' OR role = 'admin')",
        [communityId]
      );
      
      if (moderators && Array.isArray(moderators)) {
        moderatorIds = moderators.map(m => m.user_id);
      }
    } catch (error) {
      console.log("Error getting moderators:", error.message);
    }
    
    // Format the response to match frontend expectations
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      privacy: community.privacy || 'public',
      created_at: community.created_at,
      updated_at: community.updated_at,
      memberCount: memberCount,
      postCount: postCount,
      moderators: moderatorIds
    };
  } catch (error) {
    console.error("Error fetching community about:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};`;

  // Find the getCommunityAbout implementation and replace it
  const regex = /\/\/ Enhanced community information[\s\S]*?const getCommunityAbout[\s\S]*?};/g;
  
  // Check if the function exists in the file
  if (!regex.test(data)) {
    console.error('Could not find getCommunityAbout function in the file');
    return;
  }
  
  // Replace the function with our patched version
  const updatedContent = data.replace(regex, patchedFunction);
  
  // Write the updated content back to the file
  fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing to the file: ${err}`);
      return;
    }
    console.log('Successfully patched communities.js');
  });
});

console.log('Attempting to patch communities.js file...');