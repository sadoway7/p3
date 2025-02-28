// Script to migrate data from the old database to the new one
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Old database connection configuration
const oldDbConfig = {
  host: '192.168.0.139',
  port: 3306,
  user: 'root',
  password: 'Oswald1986!',
  database: 'rumfor1', // Correct old database name
  multipleStatements: true
};

// New database connection configuration
const newDbConfig = {
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

// Migrate users
async function migrateUsers(oldConn, newConn) {
  console.log('Migrating users...');
  
  // Get all users from the old database
  const users = await executeQuery(oldConn, 'SELECT * FROM users');
  console.log(`Found ${users.length} users to migrate`);
  
  // Get user settings if the table exists
  let settingsMap = {};
  try {
    const userSettings = await executeQuery(oldConn, 'SELECT * FROM user_settings');
    userSettings.forEach(setting => {
      settingsMap[setting.user_id] = setting;
    });
    console.log(`Found ${userSettings.length} user settings to migrate`);
  } catch (error) {
    console.log('No user_settings table found, skipping');
  }
  
  // Get user statistics if the table exists
  let statsMap = {};
  try {
    const userStats = await executeQuery(oldConn, 'SELECT * FROM user_statistics');
    userStats.forEach(stat => {
      statsMap[stat.user_id] = stat;
    });
    console.log(`Found ${userStats.length} user statistics to migrate`);
  } catch (error) {
    console.log('No user_statistics table found, skipping');
  }
  
  // Migrate each user
  for (const user of users) {
    // Insert into user table
    await executeQuery(
      newConn,
      `INSERT INTO user (
        id, username, email, password_hash, role, bio, avatar_url,
        profile_banner_url, website, location, is_verified, status,
        cake_day, created_at, updated_at, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.email,
        user.password_hash,
        user.role || 'user',
        user.bio,
        user.avatar_url,
        user.profile_banner_url,
        user.website,
        user.location,
        user.is_verified ? 1 : 0,
        user.status || 'active',
        user.cake_day,
        user.created_at,
        user.updated_at,
        user.last_active
      ]
    );
    
    // Insert user statistics
    const stats = statsMap[user.id] || {};
    await executeQuery(
      newConn,
      `INSERT INTO user_statistic (
        user_id, karma, posts_count, comments_count,
        upvotes_received, downvotes_received, upvotes_given, downvotes_given,
        communities_joined, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        user.id,
        stats.karma || user.karma || 0,
        stats.posts_count || user.post_count || 0,
        stats.comments_count || user.comment_count || 0,
        user.upvotes_received || 0,
        user.downvotes_received || 0,
        user.upvotes_given || 0,
        user.downvotes_given || 0,
        user.communities_joined || 0
      ]
    );
    
    // Insert user settings
    const settings = settingsMap[user.id] || {};
    await executeQuery(
      newConn,
      `INSERT INTO user_setting (
        user_id, email_notifications, push_notifications, theme,
        content_filter, allow_followers, display_online_status,
        language, timezone, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        settings.email_notifications ? 1 : 0,
        settings.push_notifications ? 1 : 0,
        settings.theme || 'light',
        settings.content_filter || 'standard',
        settings.allow_followers ? 1 : 0,
        settings.display_online_status ? 1 : 0,
        settings.language || 'en',
        settings.timezone || 'UTC'
      ]
    );
  }
  
  console.log('Users migration completed');
}

// Migrate communities
async function migrateCommunities(oldConn, newConn) {
  console.log('Migrating communities...');
  
  // Get all communities from the old database
  try {
    const communities = await executeQuery(oldConn, 'SELECT * FROM communities');
    console.log(`Found ${communities.length} communities to migrate`);
    
    // Get community settings if the table exists
    let settingsMap = {};
    try {
      const communitySettings = await executeQuery(oldConn, 'SELECT * FROM community_settings');
      communitySettings.forEach(setting => {
        settingsMap[setting.community_id] = setting;
      });
      console.log(`Found ${communitySettings.length} community settings to migrate`);
    } catch (error) {
      console.log('No community_settings table found, skipping');
    }
    
    // Migrate each community
    for (const community of communities) {
      // Insert into community table
      await executeQuery(
        newConn,
        `INSERT INTO community (
          id, name, description, privacy, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          community.id,
          community.name,
          community.description,
          community.privacy || 'public',
          community.created_at,
          community.updated_at
        ]
      );
      
      // Insert community settings
      const settings = settingsMap[community.id] || {};
      await executeQuery(
        newConn,
        `INSERT INTO community_setting (
          community_id, allow_post_images, allow_post_links, join_method,
          require_post_approval, restricted_words, custom_theme_color,
          custom_banner_url, minimum_account_age_days, minimum_karma_required,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          community.id,
          settings.allow_post_images ? 1 : 0,
          settings.allow_post_links ? 1 : 0,
          settings.join_method || 'auto_approve',
          settings.require_post_approval ? 1 : 0,
          settings.restricted_words,
          settings.custom_theme_color,
          settings.custom_banner_url,
          settings.minimum_account_age_days || 0,
          settings.minimum_karma_required || 0
        ]
      );
    }
    
    console.log('Communities migration completed');
  } catch (error) {
    console.log('No communities table found, skipping');
  }
}

// Migrate community members
async function migrateCommunityMembers(oldConn, newConn) {
  console.log('Migrating community members...');
  
  try {
    // Get all community members from the old database
    const members = await executeQuery(oldConn, 'SELECT * FROM community_members');
    console.log(`Found ${members.length} community members to migrate`);
    
    // Migrate each member
    for (const member of members) {
      await executeQuery(
        newConn,
        `INSERT INTO community_member (
          community_id, user_id, role, joined_at
        ) VALUES (?, ?, ?, ?)`,
        [
          member.community_id,
          member.user_id,
          member.role || 'member',
          member.joined_at
        ]
      );
    }
    
    console.log('Community members migration completed');
  } catch (error) {
    console.log('No community_members table found, skipping');
  }
}

// Migrate community rules
async function migrateCommunityRules(oldConn, newConn) {
  console.log('Migrating community rules...');
  
  try {
    // Get all community rules from the old database
    const rules = await executeQuery(oldConn, 'SELECT * FROM community_rules');
    console.log(`Found ${rules.length} community rules to migrate`);
    
    // Migrate each rule
    for (const rule of rules) {
      await executeQuery(
        newConn,
        `INSERT INTO community_rule (
          id, community_id, title, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          rule.id,
          rule.community_id,
          rule.title,
          rule.description,
          rule.created_at,
          rule.updated_at
        ]
      );
    }
    
    console.log('Community rules migration completed');
  } catch (error) {
    console.log('No community_rules table found, skipping');
  }
}

// Migrate posts
async function migratePosts(oldConn, newConn) {
  console.log('Migrating posts...');
  
  try {
    // Get all posts from the old database
    const posts = await executeQuery(oldConn, 'SELECT * FROM posts');
    console.log(`Found ${posts.length} posts to migrate`);
    
    // Migrate each post
    for (const post of posts) {
      await executeQuery(
        newConn,
        `INSERT INTO post (
          id, title, content, user_id, community_id, profile_post,
          user_profile_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post.id,
          post.title,
          post.content,
          post.user_id,
          post.community_id,
          post.profile_post ? 1 : 0,
          post.user_profile_id,
          post.created_at,
          post.updated_at
        ]
      );
    }
    
    console.log('Posts migration completed');
  } catch (error) {
    console.log('No posts table found, skipping');
  }
}

// Migrate comments
async function migrateComments(oldConn, newConn) {
  console.log('Migrating comments...');
  
  try {
    // Get all comments from the old database
    const comments = await executeQuery(oldConn, 'SELECT * FROM comments');
    console.log(`Found ${comments.length} comments to migrate`);
    
    // Migrate each comment
    for (const comment of comments) {
      await executeQuery(
        newConn,
        `INSERT INTO comment (
          id, content, user_id, post_id, parent_comment_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          comment.id,
          comment.content,
          comment.user_id,
          comment.post_id,
          comment.parent_comment_id,
          comment.created_at,
          comment.updated_at
        ]
      );
    }
    
    console.log('Comments migration completed');
  } catch (error) {
    console.log('No comments table found, skipping');
  }
}

// Migrate votes
async function migrateVotes(oldConn, newConn) {
  console.log('Migrating votes...');
  
  // Get all post votes from the old database
  const postVotes = await executeQuery(oldConn, 'SELECT * FROM votes WHERE post_id IS NOT NULL');
  console.log(`Found ${postVotes.length} post votes to migrate`);
  
  // Migrate each post vote
  for (const vote of postVotes) {
    await executeQuery(
      newConn,
      `INSERT INTO vote (
        user_id, post_id, comment_id, value, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?)`,
      [
        vote.user_id,
        vote.post_id,
        vote.value,
        vote.created_at,
        vote.updated_at || vote.created_at
      ]
    );
  }
  
  // Get all comment votes from the old database
  const commentVotes = await executeQuery(oldConn, 'SELECT * FROM votes WHERE comment_id IS NOT NULL');
  console.log(`Found ${commentVotes.length} comment votes to migrate`);
  
  // Migrate each comment vote
  for (const vote of commentVotes) {
    await executeQuery(
      newConn,
      `INSERT INTO vote (
        user_id, post_id, comment_id, value, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?)`,
      [
        vote.user_id,
        vote.comment_id,
        vote.value,
        vote.created_at,
        vote.updated_at || vote.created_at
      ]
    );
  }
  
  console.log('Votes migration completed');
}

// Migrate moderator permissions
async function migrateModeratorPermissions(oldConn, newConn) {
  console.log('Migrating moderator permissions...');
  
  // Get all moderator permissions from the old database
  const permissions = await executeQuery(oldConn, 'SELECT * FROM moderator_permissions');
  console.log(`Found ${permissions.length} moderator permissions to migrate`);
  
  // Migrate each permission
  for (const permission of permissions) {
    await executeQuery(
      newConn,
      `INSERT INTO moderator_permission (
        community_id, user_id, can_manage_settings, can_manage_members,
        can_manage_posts, can_manage_comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        permission.community_id,
        permission.user_id,
        permission.can_manage_settings ? 1 : 0,
        permission.can_manage_members ? 1 : 0,
        permission.can_manage_posts ? 1 : 0,
        permission.can_manage_comments ? 1 : 0,
        permission.created_at,
        permission.updated_at
      ]
    );
  }
  
  console.log('Moderator permissions migration completed');
}

// Migrate banned users
async function migrateBannedUsers(oldConn, newConn) {
  console.log('Migrating banned users...');
  
  // Get all banned users from the old database
  const bannedUsers = await executeQuery(oldConn, 'SELECT * FROM banned_users');
  console.log(`Found ${bannedUsers.length} banned users to migrate`);
  
  // Migrate each banned user
  for (const banned of bannedUsers) {
    await executeQuery(
      newConn,
      `INSERT INTO banned_user (
        community_id, user_id, reason, banned_by, ban_expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        banned.community_id,
        banned.user_id,
        banned.reason,
        banned.banned_by,
        banned.ban_expires_at,
        banned.created_at
      ]
    );
  }
  
  console.log('Banned users migration completed');
}

// Migrate saved items
async function migrateSavedItems(oldConn, newConn) {
  console.log('Migrating saved items...');
  
  // Get all saved items from the old database
  const savedItems = await executeQuery(oldConn, 'SELECT * FROM saved_items');
  console.log(`Found ${savedItems.length} saved items to migrate`);
  
  // Migrate each saved item
  for (const item of savedItems) {
    await executeQuery(
      newConn,
      `INSERT INTO saved_item (
        id, user_id, item_id, item_type, saved_at, collection_name
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.user_id,
        item.item_id,
        item.item_type,
        item.saved_at,
        item.collection_name
      ]
    );
  }
  
  console.log('Saved items migration completed');
}

// Migrate user relationships (friends, follows, blocks)
async function migrateUserRelationships(oldConn, newConn) {
  console.log('Migrating user relationships...');
  
  // Migrate friends
  const friends = await executeQuery(oldConn, 'SELECT * FROM user_friends');
  console.log(`Found ${friends.length} friendships to migrate`);
  
  for (const friend of friends) {
    await executeQuery(
      newConn,
      `INSERT INTO user_relationship (
        id, user_id, related_user_id, relationship_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'friend', ?, ?, ?)`,
      [
        uuidv4(),
        friend.user_id,
        friend.friend_id,
        friend.status,
        friend.created_at,
        friend.updated_at
      ]
    );
  }
  
  // Migrate followers if they exist
  try {
    const followers = await executeQuery(oldConn, 'SELECT * FROM user_followers');
    console.log(`Found ${followers.length} followers to migrate`);
    
    for (const follower of followers) {
      await executeQuery(
        newConn,
        `INSERT INTO user_relationship (
          id, user_id, related_user_id, relationship_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'follow', 'accepted', ?, ?)`,
        [
          uuidv4(),
          follower.follower_id,
          follower.followed_id,
          follower.created_at,
          follower.created_at
        ]
      );
    }
  } catch (error) {
    console.log('No followers table found, skipping');
  }
  
  // Migrate blocks if they exist
  try {
    const blocks = await executeQuery(oldConn, 'SELECT * FROM user_blocked');
    console.log(`Found ${blocks.length} blocks to migrate`);
    
    for (const block of blocks) {
      await executeQuery(
        newConn,
        `INSERT INTO user_relationship (
          id, user_id, related_user_id, relationship_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'block', 'accepted', ?, ?)`,
        [
          uuidv4(),
          block.blocker_id,
          block.blocked_id,
          block.created_at,
          block.created_at
        ]
      );
    }
  } catch (error) {
    console.log('No blocks table found, skipping');
  }
  
  console.log('User relationships migration completed');
}

// Migrate user achievements
async function migrateUserAchievements(oldConn, newConn) {
  console.log('Migrating user achievements...');
  
  // Get all user achievements from the old database
  const achievements = await executeQuery(oldConn, 'SELECT * FROM user_achievements');
  console.log(`Found ${achievements.length} user achievements to migrate`);
  
  // Migrate each achievement
  for (const achievement of achievements) {
    await executeQuery(
      newConn,
      `INSERT INTO user_achievement (
        id, user_id, achievement_type, achievement_name, description, earned_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        achievement.id,
        achievement.user_id,
        achievement.achievement_type,
        achievement.achievement_name,
        achievement.description,
        achievement.earned_at
      ]
    );
  }
  
  console.log('User achievements migration completed');
}

// Migrate user flairs
async function migrateUserFlairs(oldConn, newConn) {
  console.log('Migrating user flairs...');
  
  // Get all user flairs from the old database
  const flairs = await executeQuery(oldConn, 'SELECT * FROM user_flair');
  console.log(`Found ${flairs.length} user flairs to migrate`);
  
  // Migrate each flair
  for (const flair of flairs) {
    await executeQuery(
      newConn,
      `INSERT INTO user_flair (
        id, user_id, community_id, text, background_color, text_color, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flair.id,
        flair.user_id,
        flair.community_id,
        flair.text,
        flair.background_color,
        flair.text_color,
        flair.created_at,
        flair.updated_at
      ]
    );
  }
  
  console.log('User flairs migration completed');
}

// Main migration function
async function migrateData() {
  let oldConn, newConn;
  
  try {
    // Connect to both databases
    oldConn = await mysql.createConnection(oldDbConfig);
    newConn = await mysql.createConnection(newDbConfig);
    
    console.log('Connected to both databases');
    
    // Disable foreign key checks during migration
    await executeQuery(newConn, 'SET FOREIGN_KEY_CHECKS = 0');
    
    // Perform migrations in the correct order to maintain relationships
    await migrateUsers(oldConn, newConn);
    await migrateCommunities(oldConn, newConn);
    await migrateCommunityMembers(oldConn, newConn);
    await migrateCommunityRules(oldConn, newConn);
    await migratePosts(oldConn, newConn);
    await migrateComments(oldConn, newConn);
    await migrateVotes(oldConn, newConn);
    await migrateModeratorPermissions(oldConn, newConn);
    await migrateBannedUsers(oldConn, newConn);
    await migrateSavedItems(oldConn, newConn);
    await migrateUserRelationships(oldConn, newConn);
    await migrateUserAchievements(oldConn, newConn);
    await migrateUserFlairs(oldConn, newConn);
    
    // Re-enable foreign key checks
    await executeQuery(newConn, 'SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close connections
    if (oldConn) await oldConn.end();
    if (newConn) await newConn.end();
  }
}

// Run the migration
migrateData();
