const mariadb = require('mariadb');
const dotenv = require('dotenv');

dotenv.config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// Vote on a post
async function voteOnPost(userId, postId, value) {
  if (value !== 1 && value !== -1 && value !== 0) {
    throw new Error('Vote value must be 1, -1, or 0');
  }
  
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Check if the post exists
    const [post] = await conn.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      throw new Error('Post not found');
    }
    
    // Check if the user has already voted on this post
    const [existingVote] = await conn.query(
      'SELECT * FROM votes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    if (value === 0) {
      // If value is 0, remove the vote if it exists
      if (existingVote) {
        await conn.query(
          'DELETE FROM votes WHERE user_id = ? AND post_id = ?',
          [userId, postId]
        );
        return { message: 'Vote removed' };
      }
      return { message: 'No vote to remove' };
    }
    
    if (existingVote) {
      // Update the existing vote
      await conn.query(
        'UPDATE votes SET value = ? WHERE user_id = ? AND post_id = ?',
        [value, userId, postId]
      );
      return { message: 'Vote updated' };
    } else {
      // Insert a new vote
      await conn.query(
        'INSERT INTO votes (user_id, post_id, value) VALUES (?, ?, ?)',
        [userId, postId, value]
      );
      return { message: 'Vote added' };
    }
  } catch (error) {
    console.error('Error voting on post:', error);
    throw error;
  } finally {
    if (conn) conn.end();
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
    
    // Check if the comment exists
    const [comment] = await conn.query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Check if the user has already voted on this comment
    const [existingVote] = await conn.query(
      'SELECT * FROM votes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );
    
    if (value === 0) {
      // If value is 0, remove the vote if it exists
      if (existingVote) {
        await conn.query(
          'DELETE FROM votes WHERE user_id = ? AND comment_id = ?',
          [userId, commentId]
        );
        return { message: 'Vote removed' };
      }
      return { message: 'No vote to remove' };
    }
    
    if (existingVote) {
      // Update the existing vote
      await conn.query(
        'UPDATE votes SET value = ? WHERE user_id = ? AND comment_id = ?',
        [value, userId, commentId]
      );
      return { message: 'Vote updated' };
    } else {
      // Insert a new vote
      await conn.query(
        'INSERT INTO votes (user_id, comment_id, value) VALUES (?, ?, ?)',
        [userId, commentId, value]
      );
      return { message: 'Vote added' };
    }
  } catch (error) {
    console.error('Error voting on comment:', error);
    throw error;
  } finally {
    if (conn) conn.end();
  }
}

// Get user's vote on a post
async function getUserPostVote(userId, postId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [vote] = await conn.query(
      'SELECT value FROM votes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );
    
    return vote ? vote.value : 0;
  } catch (error) {
    console.error('Error getting user post vote:', error);
    throw error;
  } finally {
    if (conn) conn.end();
  }
}

// Get user's vote on a comment
async function getUserCommentVote(userId, commentId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const [vote] = await conn.query(
      'SELECT value FROM votes WHERE user_id = ? AND comment_id = ?',
      [userId, commentId]
    );
    
    return vote ? vote.value : 0;
  } catch (error) {
    console.error('Error getting user comment vote:', error);
    throw error;
  } finally {
    if (conn) conn.end();
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
      FROM votes 
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
    if (conn) conn.end();
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
      FROM votes 
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
    if (conn) conn.end();
  }
}

// Helper function to update SQL queries to include votes
function includePostVotesInQuery(baseQuery) {
  return baseQuery + `, COALESCE((SELECT SUM(value) FROM votes v WHERE v.post_id = p.id), 0) as votes`;
}

function includeCommentVotesInQuery(baseQuery) {
  return baseQuery + `, COALESCE((SELECT SUM(value) FROM votes v WHERE v.comment_id = c.id), 0) as votes`;
}

module.exports = {
  voteOnPost,
  voteOnComment,
  getUserPostVote,
  getUserCommentVote,
  getPostVoteCounts,
  getCommentVoteCounts,
  includePostVotesInQuery,
  includeCommentVotesInQuery
};