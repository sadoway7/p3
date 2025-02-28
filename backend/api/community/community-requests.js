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

// Import the addCommunityMember function from community-members.js
const { addCommunityMember } = require('./community-members');

// Community Join Request operations
const getJoinRequests = async (communityId, status) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    let query = "SELECT * FROM community_join_request WHERE community_id = ?";
    const params = [communityId];
    
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    
    const requests = await conn.query(query, params);
    return requests;
  } catch (error) {
    console.error("Error fetching join requests:", error);
    throw new Error('Failed to fetch join requests');
  } finally {
    if (conn) conn.end();
  }
};

const getJoinRequest = async (requestId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [request] = await conn.query(
      "SELECT * FROM community_join_request WHERE id = ?",
      [requestId]
    );
    return request || null;
  } catch (error) {
    console.error("Error fetching join request:", error);
    throw new Error('Failed to fetch join request');
  } finally {
    if (conn) conn.end();
  }
};

const createJoinRequest = async (communityId, userId) => {
  let conn;
  try {
    const id = uuidv4();
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Check if a request already exists
    const [existingRequest] = await conn.query(
      "SELECT * FROM community_join_request WHERE community_id = ? AND user_id = ? AND status = 'pending'",
      [communityId, userId]
    );
    
    if (existingRequest) {
      // If a pending request already exists, return it
      await conn.commit();
      return existingRequest;
    }
    
    // Create a new join request
    await conn.query(
      "INSERT INTO community_join_request (id, community_id, user_id, status) VALUES (?, ?, ?, 'pending')",
      [id, communityId, userId]
    );
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_JOIN_REQUEST'),
        (SELECT id FROM action WHERE name = 'CREATE'),
        ?, 'community_join_request', NOW()
      )`,
      [activityId, userId, id]
    );
    
    // Commit the transaction
    await conn.commit();
    
    const [newRequest] = await conn.query(
      "SELECT * FROM community_join_request WHERE id = ?",
      [id]
    );
    return newRequest;
  } catch (error) {
    console.error("Error creating join request:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to create join request');
  } finally {
    if (conn) conn.end();
  }
};

const updateJoinRequestStatus = async (requestId, status, updatedBy) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Get the current request to check if it's pending
    const [request] = await conn.query(
      "SELECT * FROM community_join_request WHERE id = ?",
      [requestId]
    );
    
    if (!request) {
      throw new Error('Join request not found');
    }
    
    if (request.status !== 'pending') {
      throw new Error('Join request has already been processed');
    }
    
    // Update the request status
    await conn.query(
      "UPDATE community_join_request SET status = ?, updated_at = NOW(), updated_by = ? WHERE id = ?",
      [status, updatedBy, requestId]
    );
    
    // If the request is approved, add the user to the community
    if (status === 'approved') {
      await addCommunityMember(request.community_id, request.user_id, 'member');
    }
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_JOIN_REQUEST'),
        (SELECT id FROM action WHERE name = 'UPDATE'),
        ?, 'community_join_request', ?, NOW()
      )`,
      [
        activityId, 
        updatedBy, 
        requestId, 
        JSON.stringify({ 
          status,
          community_id: request.community_id,
          user_id: request.user_id
        })
      ]
    );
    
    // Commit the transaction
    await conn.commit();
    
    // Return the updated request
    const [updatedRequest] = await conn.query(
      "SELECT * FROM community_join_request WHERE id = ?",
      [requestId]
    );
    return updatedRequest;
  } catch (error) {
    console.error("Error updating join request status:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to update join request status: ' + error.message);
  } finally {
    if (conn) conn.end();
  }
};

// Export the functions
module.exports = {
  getJoinRequests,
  getJoinRequest,
  createJoinRequest,
  updateJoinRequestStatus
};
