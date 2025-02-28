const { v4: uuidv4 } = require('uuid');
const pool = require('../db/connection.js');

// Vote on a post
async function voteOnPost(userId, postId, value) {
  if (value !== 1 && value !== -1 && value !== 0) {
    throw new Error('Vote value must be 1, -1, or 0');
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Check if the post exists
      const [post] = await conn.query('SELECT * FROM post WHERE id = ?', [postId]);
      if (!post) {
        throw new Error('Post not found');
      }
      
      // Check if the user has already voted on this post
      const [existingVote] = await conn.query(
        'SELECT * FROM vote WHERE user_id = ? AND post_id = ?',
        [userId, postId]
      );
      
      // Get activity type and action IDs for logging
      const activityTypeId = await getActivityTypeId(conn, 'VOTE');
      let actionId;
      
      if (value === 0) {
        // If value is 0, remove the vote if it exists
        if (existingVote) {
          await conn.query(
            'DELETE FROM vote WHERE user_id = ? AND post_id = ?',
            [userId, postId]
          );
          
          // Log activity for vote removal
          actionId = await getActionId(conn, 'DELETE');
          await logVoteActivity(conn, userId, activityTypeId, actionId, postId, 'post', existingVote.value);
          
          await conn.commit();
          return { message: 'Vote removed' };
        }
        
        await conn.commit();
        return { message: 'No vote to remove' };
      }
      
      if (existingVote) {
        // Update the existing vote
        await conn.query(
          'UPDATE vote SET value = ? WHERE user_id = ? AND post_id = ?',
          [value, userId, postId]
        );
        
        // Log activity for vote update
        actionId = await getActionId(conn, 'UPDATE');
        await logVoteActivity(conn, userId, activityTypeId, actionId, postId, 'post', value);
        
        await conn.commit();
        return { message: 'Vote updated' };
      } else {
        // Insert a new vote
        await conn.query(
          'INSERT INTO vote (user_id, post_id, value) VALUES (?, ?, ?)',
          [userId, postId, value]
        );
        
        // Log activity for new vote
        actionId = value === 1 ? 
          await getActionId(conn, 'UPVOTE') : 
          await getActionId(conn, 'DOWNVOTE');
        
        await logVoteActivity(conn, userId, activityTypeId, actionId, postId, 'post', value);
        
        await conn.commit();
        return { message: 'Vote added' };
      }
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error voting on post:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Vote on a comment
async function voteOnComment(userId, commentId, value) {
  if (value !== 1 && value !== -1 && value !== 0) {
    throw new Error('Vote value must be 1, -1, or 0');
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    try {
      // Check if the comment exists
      const [comment] = await conn.query('SELECT * FROM comment WHERE id = ?', [commentId]);
      if (!comment) {
        throw new Error('Comment not found');
      }
      
      // Check if the user has already voted on this comment
      const [existingVote] = await conn.query(
        'SELECT * FROM vote WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
      );
      
      // Get activity type and action IDs for logging
      const activityTypeId = await getActivityTypeId(conn, 'VOTE');
      let actionId;
      
      if (value === 0) {
        // If value is 0, remove the vote if it exists
        if (existingVote) {
          await conn.query(
            'DELETE FROM vote WHERE user_id = ? AND comment_id = ?',
            [userId, commentId]
          );
          
          // Log activity for vote removal
          actionId = await getActionId(conn, 'DELETE');
          await logVoteActivity(conn, userId, activityTypeId, actionId, commentId, 'comment', existingVote.value);
          
          await conn.commit();
          return { message: 'Vote removed' };
        }
        
        await conn.commit();
        return { message: 'No vote to remove' };
      }
      
      if (existingVote) {
        // Update the existing vote
        await conn.query(
          'UPDATE vote SET value = ? WHERE user_id = ? AND comment_id = ?',
          [value, userId, commentId]
        );
        
        // Log activity for vote update
        actionId = await getActionId(conn, 'UPDATE');
        await logVoteActivity(conn, userId, activityTypeId, actionId, commentId, 'comment', value);
        
        await conn.commit();
        return { message: 'Vote updated' };
      } else {
        // Insert a new vote
        await conn.query(
          'INSERT INTO vote (user_id, comment_id, value) VALUES (?, ?, ?)',
          [userId, commentId, value]
        );
        
        // Log activity for new vote
        actionId = value === 1 ? 
          await getActionId(conn, 'UPVOTE') : 
          await getActionId(conn, 'DOWNVOTE');
        
        await logVoteActivity(conn, userId, activityTypeId, actionId, commentId, 'comment', value);
        
        await conn.commit();
        return { message: 'Vote added' };
      }
    } catch (error) {
      // Rollback the transaction if anything goes wrong
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error voting on comment:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Get user's vote on a post
async function getUserPostVote(userId, postId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [vote] = await conn.query(
      'SELECT value FROM vote WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    return vote ? vote.value : 0;
  } catch (error) {
    console.error('Error getting user post vote:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Get user's vote on a comment
async function getUserCommentVote(userId, commentId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [vote] = await conn.query(
      'SELECT value FROM vote WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );
    
    return vote ? vote.value : 0;
  } catch (error) {
    console.error('Error getting user comment vote:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Get vote counts for a post
async function getPostVoteCounts(postId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.query(
      `SELECT 
        COUNT(CASE WHEN value = 1 THEN 1 END) as upvotes,
        COUNT(CASE WHEN value = -1 THEN 1 END) as downvotes
      FROM vote 
      WHERE post_id = ?`,
      [postId]
    );
    
    const upvotes = result.upvotes || 0;
    const downvotes = result.downvotes || 0;
    
    return {
      upvotes,
      downvotes,
      total: upvotes - downvotes
    };
  } catch (error) {
    console.error('Error getting post vote counts:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Get vote counts for a comment
async function getCommentVoteCounts(commentId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.query(
      `SELECT 
        COUNT(CASE WHEN value = 1 THEN 1 END) as upvotes,
        COUNT(CASE WHEN value = -1 THEN 1 END) as downvotes
      FROM vote 
      WHERE comment_id = ?`,
      [commentId]
    );
    
    const upvotes = result.upvotes || 0;
    const downvotes = result.downvotes || 0;
    
    return {
      upvotes,
      downvotes,
      total: upvotes - downvotes
    };
  } catch (error) {
    console.error('Error getting comment vote counts:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Get all votes for a user
async function getUserVotes(userId) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get post votes
    const postVotes = await conn.query(
      `SELECT v.*, p.title as post_title, p.community_id
       FROM vote v
       JOIN post p ON v.post_id = p.id
       WHERE v.user_id = ? AND v.post_id IS NOT NULL`,
      [userId]
    );
    
    // Get comment votes
    const commentVotes = await conn.query(
      `SELECT v.*, c.content as comment_content, p.id as post_id, p.title as post_title, p.community_id
       FROM vote v
       JOIN comment c ON v.comment_id = c.id
       JOIN post p ON c.post_id = p.id
       WHERE v.user_id = ? AND v.comment_id IS NOT NULL`,
      [userId]
    );
    
    return {
      postVotes,
      commentVotes
    };
  } catch (error) {
    console.error('Error getting user votes:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

// Helper function to update SQL queries to include votes
function includePostVotesInQuery(baseQuery) {
  return baseQuery + `, COALESCE((SELECT SUM(value) FROM vote v WHERE v.post_id = p.id), 0) as votes`;
}

function includeCommentVotesInQuery(baseQuery) {
  return baseQuery + `, COALESCE((SELECT SUM(value) FROM vote v WHERE v.comment_id = c.id), 0) as votes`;
}

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

// Helper function to log vote activity
async function logVoteActivity(conn, userId, activityTypeId, actionId, entityId, entityType, voteValue) {
  await conn.query(
    `INSERT INTO activity (id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(),
      userId,
      activityTypeId,
      actionId,
      entityId,
      entityType,
      JSON.stringify({ value: voteValue })
    ]
  );
}

module.exports = {
  voteOnPost,
  voteOnComment,
  getUserPostVote,
  getUserCommentVote,
  getPostVoteCounts,
  getCommentVoteCounts,
  getUserVotes,
  includePostVotesInQuery,
  includeCommentVotesInQuery
};
