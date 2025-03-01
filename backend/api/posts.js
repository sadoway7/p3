// JavaScript version of posts.ts
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection.js');

// Get all posts with user information
const getPosts = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get community filter if provided
    const communityId = req.query.communityId;
    
    // Build the query based on whether a community filter is provided
    let query = `
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes
      FROM post p
      LEFT JOIN user u ON p.user_id = u.id
    `;
    
    const queryParams = [];
    
    if (communityId) {
      query += " WHERE p.community_id = ?";
      queryParams.push(communityId);
    }
    
    query += " ORDER BY p.created_at DESC";
    
    const posts = await conn.query(query, queryParams);
    
    // Format the posts for the frontend
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      username: post.username || 'Anonymous',
      userId: post.user_id,
      communityId: post.community_id,
      timestamp: post.created_at,
      comments: post.comments || 0,
      votes: post.votes || 0
    }));
    
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: 'Error fetching posts' });
  } finally {
    if (conn) conn.release();
  }
};

// Get a single post with user information
const getPost = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const [post] = await conn.query(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes
      FROM post p
      LEFT JOIN user u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Format the post for the frontend
    const formattedPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      username: post.username || 'Anonymous',
      userId: post.user_id,
      communityId: post.community_id,
      timestamp: post.created_at,
      comments: post.comments || 0,
      votes: post.votes || 0
    };
    
    res.status(200).json(formattedPost);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: 'Error fetching post' });
  } finally {
    if (conn) conn.release();
  }
};

// Create a new post
const createPost = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const { title, content, communityId, profile_post } = req.body; // Destructure profile_post
    const userId = req.user.id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // communityId is not required for profile posts
    if (communityId) {
      // Check if community exists
      const [community] = await conn.query(
        "SELECT * FROM community WHERE id = ?",
        [communityId]
      );

      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }
    }


    // Start a transaction
    await conn.beginTransaction();

    try {
      // Create the post, including profile_post
      const id = uuidv4();
      console.log("Inserting post with data:", { id, title, content, userId, communityId, profile_post });

      await conn.query(
        "INSERT INTO post (id, title, content, user_id, community_id, profile_post) VALUES (?, ?, ?, ?, ?, ?)",
        [id, title, content, userId, communityId, profile_post || false] // Use profile_post from request, default to false
      );

      // Get the created post with user information
      const [newPost] = await conn.query(`
        SELECT p.*, u.username
        FROM post p
        LEFT JOIN user u ON p.user_id = u.id
        WHERE p.id = ?
      `, [id]);

      // Commit the transaction
      await conn.commit();

      // Format the post for the frontend
      const formattedPost = {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        username: newPost.username || 'Anonymous',
        userId: newPost.user_id,
        communityId: newPost.community_id,
        timestamp: newPost.created_at,
        comments: 0,
        votes: 0
      };

      res.status(201).json(formattedPost);
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      console.error("SQL Error:", error); // Log the SQL error
      throw error;
    }
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: 'Error creating post' });
  } finally {
    if (conn) conn.release();
  }
};

// Update a post
const updatePost = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const { title, content } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Check if post exists and belongs to the user
    const [post] = await conn.query(
      "SELECT * FROM post WHERE id = ?",
      [postId]
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.user_id !== userId) {
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Update the post
      await conn.query(
        "UPDATE post SET title = ?, content = ? WHERE id = ?",
        [title, content, postId]
      );
      
      // Get the updated post with user information
      const [updatedPost] = await conn.query(`
        SELECT p.*, u.username, 
               (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) as comments,
               COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes
        FROM post p
        LEFT JOIN user u ON p.user_id = u.id
        WHERE p.id = ?
      `, [postId]);
      
      // Log activity
      const activityTypeId = await getActivityTypeId(conn, 'POST');
      const actionId = await getActionId(conn, 'UPDATE');
      
      await conn.query(
        `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          activityTypeId,
          actionId,
          postId,
          'post',
          JSON.stringify({
            title: title,
            community_id: post.community_id
          })
        ]
      );
      
      // Commit the transaction
      await conn.commit();
      
      // Format the post for the frontend
      const formattedPost = {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        username: updatedPost.username || 'Anonymous',
        userId: updatedPost.user_id,
        communityId: updatedPost.community_id,
        timestamp: updatedPost.created_at,
        comments: updatedPost.comments || 0,
        votes: updatedPost.votes || 0
      };
      
      res.status(200).json(formattedPost);
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: 'Error updating post' });
  } finally {
    if (conn) conn.release();
  }
};

// Delete a post
const deletePost = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const postId = req.params.id;
    const userId = req.user.id;
    
    // Check if post exists and belongs to the user
    const [post] = await conn.query(
      "SELECT * FROM post WHERE id = ?",
      [postId]
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.user_id !== userId) {
      // Check if user is a moderator of the community
      const [moderator] = await conn.query(
        "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role IN ('moderator', 'admin')",
        [post.community_id, userId]
      );
      
      if (!moderator) {
        return res.status(403).json({ message: 'You can only delete your own posts or posts in communities you moderate' });
      }
    }
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Log activity before deleting the post
      const activityTypeId = await getActivityTypeId(conn, 'POST');
      const actionId = await getActionId(conn, 'DELETE');
      
      await conn.query(
        `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          activityTypeId,
          actionId,
          postId,
          'post',
          JSON.stringify({
            title: post.title,
            community_id: post.community_id
          })
        ]
      );
      
      // Delete votes associated with the post
      await conn.query(
        "DELETE FROM vote WHERE post_id = ?",
        [postId]
      );
      
      // Delete comments associated with the post
      await conn.query(
        "DELETE FROM comment WHERE post_id = ?",
        [postId]
      );
      
      // Delete the post
      await conn.query(
        "DELETE FROM post WHERE id = ?",
        [postId]
      );
      
      // Commit the transaction
      await conn.commit();
      
      res.status(204).send();
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: 'Error deleting post' });
  } finally {
    if (conn) conn.release();
  }
};

// Get posts for a specific community
const getCommunityPosts = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const communityId = req.params.communityId;
    
    // Check if community exists
    const [community] = await conn.query(
      "SELECT * FROM community WHERE id = ?",
      [communityId]
    );
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Get posts for the community
    const posts = await conn.query(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes
      FROM post p
      LEFT JOIN user u ON p.user_id = u.id
      WHERE p.community_id = ?
      ORDER BY p.created_at DESC
    `, [communityId]);
    
    // Format the posts for the frontend
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      username: post.username || 'Anonymous',
      userId: post.user_id,
      communityId: post.community_id,
      timestamp: post.created_at,
      comments: post.comments || 0,
      votes: post.votes || 0
    }));
    
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error fetching community posts:", error);
    res.status(500).json({ message: 'Error fetching community posts' });
  } finally {
    if (conn) conn.release();
  }
};

// Get posts for a specific user
const getUserPosts = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const userId = req.params.userId;
    
    // Check if user exists
    const [user] = await conn.query(
      "SELECT * FROM user WHERE id = ?",
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get posts for the user
    const posts = await conn.query(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comment c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes
      FROM post p
      LEFT JOIN user u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [userId]);
    
    // Format the posts for the frontend
    const formattedPosts = posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      username: post.username || 'Anonymous',
      userId: post.user_id,
      communityId: post.community_id,
      timestamp: post.created_at,
      comments: post.comments || 0,
      votes: post.votes || 0
    }));
    
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ message: 'Error fetching user posts' });
  } finally {
    if (conn) conn.release();
  }
};

// Check if user can post in a community
const canPostInCommunity = async (req, res, next) => {
  const communityId = req.body.communityId;
  const userId = req.user.id;
  
  if (!communityId) {
    return next(); // No community specified, allow the post
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Check if community exists
    const [community] = await conn.query(
      "SELECT * FROM community WHERE id = ?",
      [communityId]
    );
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // If community is public, check if user is banned
    const [banned] = await conn.query(
      "SELECT * FROM banned_user WHERE community_id = ? AND user_id = ? AND (ban_expires_at IS NULL OR ban_expires_at > NOW())",
      [communityId, userId]
    );
    
    if (banned) {
      return res.status(403).json({ message: 'You are banned from this community' });
    }
    
    // Check community settings for post approval
    const [settings] = await conn.query(
      "SELECT * FROM community_setting WHERE community_id = ?",
      [communityId]
    );
    
    if (settings && settings.require_post_approval) {
      // Set a flag to indicate that this post needs approval
      req.needsApproval = true;
    }
    
    // If community is private, check if user is a member
    if (community.privacy === 'private') {
      const [membership] = await conn.query(
        "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
        [communityId, userId]
      );
      
      if (!membership) {
        return res.status(403).json({ message: 'You must be a member to post in this community' });
      }
    }
    
    next();
  } catch (error) {
    console.error("Error checking post permission:", error);
    return res.status(500).json({ message: 'Error checking post permission' });
  } finally {
    if (conn) conn.release();
  }
};

// Helper function to get activity type ID
async function getActivityTypeId(conn, typeName) {
  const [activityType] = await conn.query(
    "SELECT id FROM activity_type WHERE name = ?",
    [typeName]
  );
  
  return activityType ? activityType.id : null;
}

// Helper function to get action ID
async function getActionId(conn, actionName) {
  const [action] = await conn.query(
    "SELECT id FROM action WHERE name = ?",
    [actionName]
  );
  
  return action ? action.id : null;
}

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getCommunityPosts,
  getUserPosts,
  canPostInCommunity
};

