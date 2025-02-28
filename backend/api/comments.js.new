// JavaScript version of comments.ts
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection.js');

// Get all comments for a post
const getPostComments = async (postId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const comments = await conn.query(`
      SELECT c.*, u.username
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
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
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
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
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Check if post exists
      const [post] = await conn.query(
        "SELECT * FROM post WHERE id = ?",
        [post_id]
      );
      
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check if parent comment exists if provided
      if (parent_comment_id) {
        const [parentComment] = await conn.query(
          "SELECT * FROM comment WHERE id = ?",
          [parent_comment_id]
        );
        
        if (!parentComment) {
          throw new Error('Parent comment not found');
        }
      }
      
      // Create the comment
      const id = uuidv4();
      
      let query = "INSERT INTO comment (id, content, user_id, post_id";
      let values = [id, content, userId, post_id];
      
      if (parent_comment_id) {
        query += ", parent_comment_id) VALUES (?, ?, ?, ?, ?)";
        values.push(parent_comment_id);
      } else {
        query += ") VALUES (?, ?, ?, ?)";
      }
      
      await conn.query(query, values);
      
      // Log activity
      const activityTypeId = await getActivityTypeId(conn, 'COMMENT');
      const actionId = await getActionId(conn, 'CREATE');
      
      await conn.query(
        `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          activityTypeId,
          actionId,
          id,
          'comment',
          JSON.stringify({
            post_id: post_id,
            parent_comment_id: parent_comment_id || null
          })
        ]
      );
      
      // Get the created comment with username
      const [newComment] = await conn.query(`
        SELECT c.*, u.username
        FROM comment c
        LEFT JOIN user u ON c.user_id = u.id
        WHERE c.id = ?
      `, [id]);
      
      // Commit the transaction
      await conn.commit();
      
      return newComment;
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
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
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Check if comment exists and belongs to the user
      const [comment] = await conn.query(
        "SELECT * FROM comment WHERE id = ?",
        [commentId]
      );
      
      if (!comment) {
        return null;
      }
      
      if (comment.user_id !== userId) {
        throw new Error('You can only update your own comments');
      }
      
      // Update the comment
      await conn.query(
        "UPDATE comment SET content = ? WHERE id = ?",
        [content, commentId]
      );
      
      // Log activity
      const activityTypeId = await getActivityTypeId(conn, 'COMMENT');
      const actionId = await getActionId(conn, 'UPDATE');
      
      await conn.query(
        `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          activityTypeId,
          actionId,
          commentId,
          'comment',
          JSON.stringify({
            post_id: comment.post_id,
            parent_comment_id: comment.parent_comment_id || null
          })
        ]
      );
      
      // Get the updated comment with username
      const [updatedComment] = await conn.query(`
        SELECT c.*, u.username
        FROM comment c
        LEFT JOIN user u ON c.user_id = u.id
        WHERE c.id = ?
      `, [commentId]);
      
      // Commit the transaction
      await conn.commit();
      
      return updatedComment;
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
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
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Check if comment exists and belongs to the user
      const [comment] = await conn.query(
        "SELECT * FROM comment WHERE id = ?",
        [commentId]
      );
      
      if (!comment) {
        return false;
      }
      
      // Check if user is the comment author or a moderator of the community
      if (comment.user_id !== userId) {
        // Get the post to find the community
        const [post] = await conn.query(
          "SELECT community_id FROM post WHERE id = ?",
          [comment.post_id]
        );
        
        if (!post) {
          throw new Error('Post not found');
        }
        
        // Check if user is a moderator
        const [moderator] = await conn.query(
          "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role IN ('moderator', 'admin')",
          [post.community_id, userId]
        );
        
        if (!moderator) {
          throw new Error('You can only delete your own comments or comments in communities you moderate');
        }
      }
      
      // Find all replies to this comment recursively
      const findReplies = async (parentId, replyIds = []) => {
        const replies = await conn.query(
          "SELECT id FROM comment WHERE parent_comment_id = ?",
          [parentId]
        );
        
        for (const reply of replies) {
          replyIds.push(reply.id);
          await findReplies(reply.id, replyIds);
        }
        
        return replyIds;
      };
      
      const replyIds = await findReplies(commentId);
      
      // Log activity for the main comment
      const activityTypeId = await getActivityTypeId(conn, 'COMMENT');
      const actionId = await getActionId(conn, 'DELETE');
      
      await conn.query(
        `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          activityTypeId,
          actionId,
          commentId,
          'comment',
          JSON.stringify({
            post_id: comment.post_id,
            parent_comment_id: comment.parent_comment_id || null
          })
        ]
      );
      
      // Delete all replies
      if (replyIds.length > 0) {
        // Log activity for each reply
        for (const replyId of replyIds) {
          const [reply] = await conn.query(
            "SELECT * FROM comment WHERE id = ?",
            [replyId]
          );
          
          if (reply) {
            await conn.query(
              `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                uuidv4(),
                userId,
                activityTypeId,
                actionId,
                replyId,
                'comment',
                JSON.stringify({
                  post_id: reply.post_id,
                  parent_comment_id: reply.parent_comment_id || null
                })
              ]
            );
          }
        }
        
        const placeholders = replyIds.map(() => '?').join(',');
        await conn.query(
          `DELETE FROM comment WHERE id IN (${placeholders})`,
          replyIds
        );
      }
      
      // Delete the comment
      await conn.query(
        "DELETE FROM comment WHERE id = ?",
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
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
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
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
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

// Get user comments
const getUserComments = async (userId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const comments = await conn.query(`
      SELECT c.*, u.username, p.title as post_title, p.community_id
      FROM comment c
      LEFT JOIN user u ON c.user_id = u.id
      LEFT JOIN post p ON c.post_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);
    
    return comments;
  } catch (error) {
    console.error("Error fetching user comments:", error);
    throw error;
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
  getPostComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  getCommentReplies,
  getThreadedComments,
  getUserComments
};
