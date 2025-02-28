// JavaScript version of posts.ts
const { v4: uuidv4 } = require('uuid');
const mariadb = require('mariadb');
const dotenv = require('dotenv');

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
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
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
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
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
    
    const { title, content, communityId } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!title || !content || !communityId) {
      return res.status(400).json({ message: 'Title, content, and communityId are required' });
    }
    
    // Check if community exists
    const [community] = await conn.query(
      "SELECT * FROM communities WHERE id = ?",
      [communityId]
    );
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Create the post
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await conn.query(
      "INSERT INTO posts (id, title, content, user_id, community_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, title, content, userId, communityId, now, now]
    );
    
    // Get the created post with user information
    const [newPost] = await conn.query(`
      SELECT p.*, u.username
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);
    
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
      "SELECT * FROM posts WHERE id = ?",
      [postId]
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.user_id !== userId) {
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update the post
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await conn.query(
      "UPDATE posts SET title = ?, content = ?, updated_at = ? WHERE id = ?",
      [title, content, now, postId]
    );
    
    // Get the updated post with user information
    const [updatedPost] = await conn.query(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);
    
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
      "SELECT * FROM posts WHERE id = ?",
      [postId]
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    if (post.user_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Delete comments associated with the post
      await conn.query(
        "DELETE FROM comments WHERE post_id = ?",
        [postId]
      );
      
      // Delete votes associated with the post
      await conn.query(
        "DELETE FROM votes WHERE post_id = ?",
        [postId]
      );
      
      // Delete the post
      await conn.query(
        "DELETE FROM posts WHERE id = ?",
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
      "SELECT * FROM communities WHERE id = ?",
      [communityId]
    );
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Get posts for the community
    const posts = await conn.query(`
      SELECT p.*, u.username, 
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comments,
             COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
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

// Check if user can post in a community
const canPostInCommunity = async (req, res, next) => {
  const communityId = req.body.communityId;
  const userId = req.user.id;
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Check if community exists
    const [community] = await conn.query(
      "SELECT * FROM communities WHERE id = ?",
      [communityId]
    );
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // If community is public, anyone can post
    if (community.privacy === 'public') {
      return next();
    }
    
    // If community is private, check if user is a member
    const [membership] = await conn.query(
      "SELECT * FROM community_members WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    
    if (!membership) {
      return res.status(403).json({ message: 'You must be a member to post in this community' });
    }
    
    next();
  } catch (error) {
    console.error("Error checking post permission:", error);
    return res.status(500).json({ message: 'Error checking post permission' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getCommunityPosts,
  canPostInCommunity
};
