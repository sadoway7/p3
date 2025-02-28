const mariadb = require('mariadb');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// Community Members operations
const getCommunityMembers = async (communityId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const members = await conn.query(
      "SELECT * FROM community_member WHERE community_id = ?",
      [communityId]
    );
    return members;
  } catch (error) {
    console.error("Error fetching community members:", error);
    throw new Error('Failed to fetch community members');
  } finally {
    if (conn) conn.end();
  }
};

const getCommunityMember = async (communityId, userId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log(`Fetching community member: communityId=${communityId}, userId=${userId}`);
    const [member] = await conn.query(
      "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    console.log("Query result:", member);
    return member || null;
  } catch (error) {
    console.error("Error fetching community member:", error);
    throw new Error('Failed to fetch community member');
  } finally {
    if (conn) conn.end();
  }
};

const addCommunityMember = async (communityId, userId, role = 'member') => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Check if the member already exists
    const [existingMember] = await conn.query(
      "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    
    if (existingMember) {
      // If the member already exists, update their role if different
      if (existingMember.role !== role) {
        await conn.query(
          "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
          [role, communityId, userId]
        );
      }
      
      // Commit the transaction
      await conn.commit();
      
      return existingMember;
    }
    
    // Add the new member
    await conn.query(
      "INSERT INTO community_member (community_id, user_id, role) VALUES (?, ?, ?)",
      [communityId, userId, role]
    );
    
    // Update user statistics
    await conn.query(
      `UPDATE user_statistic 
       SET communities_joined = communities_joined + 1
       WHERE user_id = ?`,
      [userId]
    );
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
        (SELECT id FROM action WHERE name = 'JOIN'),
        ?, 'community', NOW()
      )`,
      [activityId, userId, communityId]
    );
    
    // Commit the transaction
    await conn.commit();
    
    const [newMember] = await conn.query(
      "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    return newMember;
  } catch (error) {
    console.error("Error adding community member:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to add community member');
  } finally {
    if (conn) conn.end();
  }
};

const updateCommunityMemberRole = async (communityId, userId, role, updatedBy) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Update the member's role
    await conn.query(
      "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
      [role, communityId, userId]
    );
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_MEMBER'),
        (SELECT id FROM action WHERE name = 'UPDATE'),
        ?, 'community_member', ?, NOW()
      )`,
      [
        activityId, 
        updatedBy, 
        userId, 
        JSON.stringify({ 
          community_id: communityId,
          user_id: userId,
          new_role: role
        })
      ]
    );
    
    // Commit the transaction
    await conn.commit();
    
    // Return the updated member
    const [updatedMember] = await conn.query(
      "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    return updatedMember || null;
  } catch (error) {
    console.error("Error updating community member role:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to update community member role');
  } finally {
    if (conn) conn.end();
  }
};

const removeCommunityMember = async (communityId, userId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Log activity before removing the member
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
        (SELECT id FROM action WHERE name = 'LEAVE'),
        ?, 'community', ?, NOW()
      )`,
      [
        activityId, 
        userId, 
        communityId, 
        JSON.stringify({ community_id: communityId })
      ]
    );
    
    // Remove the member
    const result = await conn.query(
      "DELETE FROM community_member WHERE community_id = ? AND user_id = ?",
      [communityId, userId]
    );
    
    // Update user statistics
    if (result.affectedRows > 0) {
      await conn.query(
        `UPDATE user_statistic 
         SET communities_joined = GREATEST(communities_joined - 1, 0)
         WHERE user_id = ?`,
        [userId]
      );
    }
    
    // Commit the transaction
    await conn.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error removing community member:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to remove community member');
  } finally {
    if (conn) conn.end();
  }
};

// Export the functions
module.exports = {
  getCommunityMembers,
  getCommunityMember,
  addCommunityMember,
  updateCommunityMemberRole,
  removeCommunityMember
};
