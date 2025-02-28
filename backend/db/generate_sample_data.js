// Script to generate sample data for the new database
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database connection configuration
const dbConfig = {
  host: '192.168.0.139',
  port: 3306,
  user: 'rumfornew2',
  password: 'Oswald1986!',
  database: 'rumfornew2',
  multipleStatements: true
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

// Generate sample users
async function generateUsers(connection, count = 10) {
  console.log(`Generating ${count} sample users...`);
  
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const userId = uuidv4();
    const username = `user${i + 1}`;
    const email = `user${i + 1}@example.com`;
    
    // Insert user
    await executeQuery(
      connection,
      `INSERT INTO user (
        id, username, email, password_hash, role, bio, avatar_url,
        profile_banner_url, website, location, is_verified, status,
        cake_day, created_at, updated_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        userId,
        username,
        email,
        '$2a$10$XQxBtEwPP1SXkQfdXMYgJeP4tELOWJKVJKxXpWlmJBcMjwFrVyeJC', // hashed 'password123'
        i === 0 ? 'admin' : 'user',
        `Bio for ${username}`,
        `https://example.com/avatars/${username}.jpg`,
        `https://example.com/banners/${username}.jpg`,
        `https://example.com/${username}`,
        `City ${i + 1}`,
        i < 3 ? 1 : 0, // First 3 users are verified
        'active',
        new Date(2020, 0, i + 1) // Different cake days
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
        Math.floor(Math.random() * 1000), // Random karma
        Math.floor(Math.random() * 20), // Random posts count
        Math.floor(Math.random() * 50), // Random comments count
        Math.floor(Math.random() * 100), // Random upvotes received
        Math.floor(Math.random() * 20), // Random downvotes received
        Math.floor(Math.random() * 200), // Random upvotes given
        Math.floor(Math.random() * 50), // Random downvotes given
        Math.floor(Math.random() * 5) // Random communities joined
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
        Math.random() > 0.3 ? 1 : 0, // 70% chance of email notifications enabled
        Math.random() > 0.5 ? 1 : 0, // 50% chance of push notifications enabled
        Math.random() > 0.7 ? 'dark' : 'light', // 30% chance of dark theme
        'standard',
        1, // Allow followers
        1, // Display online status
        'en',
        'UTC'
      ]
    );
    
    users.push({
      id: userId,
      username,
      email
    });
  }
  
  console.log(`Generated ${users.length} users`);
  return users;
}

// Generate sample communities
async function generateCommunities(connection, users, count = 5) {
  console.log(`Generating ${count} sample communities...`);
  
  const communities = [];
  
  for (let i = 0; i < count; i++) {
    const communityId = uuidv4();
    const name = `community${i + 1}`;
    
    // Insert community
    await executeQuery(
      connection,
      `INSERT INTO community (
        id, name, description, privacy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        communityId,
        name,
        `Description for ${name}`,
        i === 0 ? 'private' : 'public' // First community is private
      ]
    );
    
    // Insert community settings
    await executeQuery(
      connection,
      `INSERT INTO community_setting (
        community_id, allow_post_images, allow_post_links, join_method,
        require_post_approval, restricted_words, custom_theme_color,
        custom_banner_url, minimum_account_age_days, minimum_karma_required,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        communityId,
        1, // Allow post images
        1, // Allow post links
        i === 0 ? 'requires_approval' : 'auto_approve', // First community requires approval
        i === 0 ? 1 : 0, // First community requires post approval
        null, // No restricted words
        `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
        `https://example.com/community_banners/${name}.jpg`,
        i === 0 ? 30 : 0, // First community requires 30 days account age
        i === 0 ? 100 : 0 // First community requires 100 karma
      ]
    );
    
    // Add users as members
    for (let j = 0; j < users.length; j++) {
      // Skip some users for some communities to make it more realistic
      if (i > 0 && j > 0 && Math.random() < 0.3) continue;
      
      const role = j === 0 ? 'admin' : (j < 3 ? 'moderator' : 'member');
      
      await executeQuery(
        connection,
        `INSERT INTO community_member (
          community_id, user_id, role, joined_at
        ) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [
          communityId,
          users[j].id,
          role,
          Math.floor(Math.random() * 365) // Joined 0-365 days ago
        ]
      );
      
      // Add moderator permissions for admins and moderators
      if (role === 'admin' || role === 'moderator') {
        await executeQuery(
          connection,
          `INSERT INTO moderator_permission (
            community_id, user_id, can_manage_settings, can_manage_members,
            can_manage_posts, can_manage_comments, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            communityId,
            users[j].id,
            role === 'admin' ? 1 : 0, // Only admins can manage settings
            1, // Both can manage members
            1, // Both can manage posts
            1  // Both can manage comments
          ]
        );
      }
    }
    
    // Add some community rules
    const ruleCount = Math.floor(Math.random() * 5) + 1; // 1-5 rules
    for (let j = 0; j < ruleCount; j++) {
      await executeQuery(
        connection,
        `INSERT INTO community_rule (
          id, community_id, title, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [
          uuidv4(),
          communityId,
          `Rule ${j + 1} for ${name}`,
          `Description for rule ${j + 1} in ${name}`
        ]
      );
    }
    
    communities.push({
      id: communityId,
      name
    });
  }
  
  console.log(`Generated ${communities.length} communities`);
  return communities;
}

// Generate sample posts
async function generatePosts(connection, users, communities, count = 20) {
  console.log(`Generating ${count} sample posts...`);
  
  const posts = [];
  
  for (let i = 0; i < count; i++) {
    const postId = uuidv4();
    const userIndex = Math.floor(Math.random() * users.length);
    const communityIndex = Math.floor(Math.random() * communities.length);
    
    // Insert post
    await executeQuery(
      connection,
      `INSERT INTO post (
        id, title, content, user_id, community_id, profile_post,
        user_profile_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [
        postId,
        `Post ${i + 1} Title`,
        `Content for post ${i + 1}. This is a sample post generated for testing purposes.`,
        users[userIndex].id,
        communities[communityIndex].id,
        0, // Not a profile post
        null, // No user profile
        Math.floor(Math.random() * 720), // 0-30 days ago
        Math.floor(Math.random() * 720) // 0-30 days ago
      ]
    );
    
    posts.push({
      id: postId,
      title: `Post ${i + 1} Title`,
      userId: users[userIndex].id,
      communityId: communities[communityIndex].id
    });
  }
  
  console.log(`Generated ${posts.length} posts`);
  return posts;
}

// Generate sample comments
async function generateComments(connection, users, posts, count = 50) {
  console.log(`Generating ${count} sample comments...`);
  
  const comments = [];
  
  for (let i = 0; i < count; i++) {
    const commentId = uuidv4();
    const userIndex = Math.floor(Math.random() * users.length);
    const postIndex = Math.floor(Math.random() * posts.length);
    
    // Determine if this is a reply to another comment
    const isReply = i > 10 && Math.random() < 0.3; // 30% chance of being a reply after the first 10 comments
    const parentCommentId = isReply ? comments[Math.floor(Math.random() * comments.length)].id : null;
    
    // Insert comment
    await executeQuery(
      connection,
      `INSERT INTO comment (
        id, content, user_id, post_id, parent_comment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE), DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [
        commentId,
        `This is comment ${i + 1}. ${isReply ? 'This is a reply to another comment.' : 'This is a top-level comment.'}`,
        users[userIndex].id,
        posts[postIndex].id,
        parentCommentId,
        Math.floor(Math.random() * 43200), // 0-30 days ago
        Math.floor(Math.random() * 43200) // 0-30 days ago
      ]
    );
    
    comments.push({
      id: commentId,
      userId: users[userIndex].id,
      postId: posts[postIndex].id,
      parentCommentId
    });
  }
  
  console.log(`Generated ${comments.length} comments`);
  return comments;
}

// Generate sample activities
async function generateActivities(connection, users, posts, comments) {
  console.log('Generating sample activities...');
  
  // Get activity types and actions
  const activityTypes = await executeQuery(connection, 'SELECT * FROM activity_type');
  const actions = await executeQuery(connection, 'SELECT * FROM action');
  
  // Map for easier lookup
  const activityTypeMap = {};
  activityTypes.forEach(type => {
    activityTypeMap[type.name] = type.id;
  });
  
  const actionMap = {};
  actions.forEach(action => {
    actionMap[action.name] = action.id;
  });
  
  // Generate post creation activities
  for (const post of posts) {
    await executeQuery(
      connection,
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type,
        metadata, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [
        uuidv4(),
        post.userId,
        activityTypeMap['POST'],
        actionMap['CREATE'],
        post.id,
        'post',
        JSON.stringify({ title: post.title, community_id: post.communityId }),
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Math.floor(Math.random() * 720) // 0-30 days ago
      ]
    );
  }
  
  // Generate comment creation activities
  for (const comment of comments) {
    await executeQuery(
      connection,
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type,
        metadata, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [
        uuidv4(),
        comment.userId,
        activityTypeMap['COMMENT'],
        actionMap['CREATE'],
        comment.id,
        'comment',
        JSON.stringify({ post_id: comment.postId, parent_comment_id: comment.parentCommentId }),
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Math.floor(Math.random() * 43200) // 0-30 days ago
      ]
    );
  }
  
  // Generate some vote activities
  const voteCount = 100; // Number of votes to generate
  for (let i = 0; i < voteCount; i++) {
    const userIndex = Math.floor(Math.random() * users.length);
    const isUpvote = Math.random() > 0.3; // 70% chance of upvote
    const isPostVote = Math.random() > 0.4; // 60% chance of post vote
    
    const entityId = isPostVote 
      ? posts[Math.floor(Math.random() * posts.length)].id
      : comments[Math.floor(Math.random() * comments.length)].id;
    
    const entityType = isPostVote ? 'post' : 'comment';
    
    await executeQuery(
      connection,
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type,
        metadata, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
      [
        uuidv4(),
        users[userIndex].id,
        activityTypeMap['VOTE'],
        isUpvote ? actionMap['UPVOTE'] : actionMap['DOWNVOTE'],
        entityId,
        entityType,
        JSON.stringify({ value: isUpvote ? 1 : -1 }),
        '127.0.0.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Math.floor(Math.random() * 43200) // 0-30 days ago
      ]
    );
  }
  
  console.log('Generated activities');
}

// Main function to generate all sample data
async function generateSampleData() {
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Disable foreign key checks during data generation
    await executeQuery(connection, 'SET FOREIGN_KEY_CHECKS = 0');
    
    // Generate data in the correct order to maintain relationships
    const users = await generateUsers(connection);
    const communities = await generateCommunities(connection, users);
    const posts = await generatePosts(connection, users, communities);
    const comments = await generateComments(connection, users, posts);
    await generateActivities(connection, users, posts, comments);
    
    // Re-enable foreign key checks
    await executeQuery(connection, 'SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Sample data generation completed successfully!');
  } catch (error) {
    console.error('Error generating sample data:', error);
  } finally {
    // Close connection
    if (connection) await connection.end();
  }
}

// Run the sample data generation
generateSampleData();
