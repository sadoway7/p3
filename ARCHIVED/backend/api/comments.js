// JavaScript version of comments.ts
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

// Get all comments for a post
const getPostComments = async (postId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const comments = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);
    
    return comments;
  } catch (error) {
    console.error("Error fetching post comments:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Get a specific comment
const getComment = async (commentId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const [comment] = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);
    
    return comment || null;
  } catch (error) {
    console.error("Error fetching comment:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Create a new comment
const createComment = async (userId, commentData) => {
  const { content, post_id, parent_comment_id } = commentData;
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Check if post exists
    const [post] = await conn.query(
      "SELECT * FROM posts WHERE id = ?",
      [post_id]
    );
    
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Check if parent comment exists if provided
    if (parent_comment_id) {
      const [parentComment] = await conn.query(
        "SELECT * FROM comments WHERE id = ?",
        [parent_comment_id]
      );
      
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
    }
    
    // Create the comment
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    let query = "INSERT INTO comments (id, content, user_id, post_id, created_at, updated_at";
    let values = [id, content, userId, post_id, now, now];
    
    if (parent_comment_id) {
      query += ", parent_comment_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
      values.push(parent_comment_id);
    } else {
      query += ") VALUES (?, ?, ?, ?, ?, ?)";
    }
    
    await conn.query(query, values);
    
    // Get the created comment with username
    const [newComment] = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);
    
    return newComment;
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Update a comment
const updateComment = async (commentId, userId, content) => {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Check if comment exists and belongs to the user
    const [comment] = await conn.query(
      "SELECT * FROM comments WHERE id = ?",
      [commentId]
    );
    
    if (!comment) {
      return null;
    }
    
    if (comment.user_id !== userId) {
      throw new Error('You can only update your own comments');
    }
    
    // Update the comment
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await conn.query(
      "UPDATE comments SET content = ?, updated_at = ? WHERE id = ?",
      [content, now, commentId]
    );
    
    // Get the updated comment with username
    const [updatedComment] = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);
    
    return updatedComment;
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Delete a comment
const deleteComment = async (commentId, userId) => {
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Check if comment exists and belongs to the user
    const [comment] = await conn.query(
      "SELECT * FROM comments WHERE id = ?",
      [commentId]
    );
    
    if (!comment) {
      return false;
    }
    
    if (comment.user_id !== userId) {
      throw new Error('You can only delete your own comments');
    }
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Find all replies to this comment recursively
      const findReplies = async (parentId, replyIds = []) => {
        const replies = await conn.query(
          "SELECT id FROM comments WHERE parent_comment_id = ?",
          [parentId]
        );
        
        for (const reply of replies) {
          replyIds.push(reply.id);
          await findReplies(reply.id, replyIds);
        }
        
        return replyIds;
      };
      
      const replyIds = await findReplies(commentId);
      
      // Delete all replies
      if (replyIds.length > 0) {
        const placeholders = replyIds.map(() => '?').join(',');
        await conn.query(
          `DELETE FROM comments WHERE id IN (${placeholders})`,
          replyIds
        );
      }
      
      // Delete the comment
      await conn.query(
        "DELETE FROM comments WHERE id = ?",
        [commentId]
      );
      
      // Commit the transaction
      await conn.commit();
      
      return true;
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Get replies to a comment
const getCommentReplies = async (commentId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const replies = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.parent_comment_id = ?
      ORDER BY c.created_at ASC
    `, [commentId]);
    
    return replies;
  } catch (error) {
    console.error("Error fetching comment replies:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// Get threaded comments for a post
const getThreadedComments = async (postId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get all comments for the post with usernames
    const comments = await conn.query(`
      SELECT c.*, u.username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);
    
    // Add replies array to each comment
    const commentsWithReplies = comments.map(comment => ({
      ...comment,
      username: comment.username || 'Anonymous',
      replies: []
    }));
    
    // Create a map for quick lookup
    const commentMap = new Map();
    commentsWithReplies.forEach(comment => {
      commentMap.set(comment.id, comment);
    });
    
    // Organize into a tree structure
    const rootComments = [];
    
    commentsWithReplies.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(comment);
        } else {
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
    
    return rootComments;
  } catch (error) {
    console.error("Error fetching threaded comments:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getPostComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  getCommentReplies,
  getThreadedComments
};
