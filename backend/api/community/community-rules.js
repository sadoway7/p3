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

// Community Rules operations
const getCommunityRules = async (communityId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rules = await conn.query(
      "SELECT * FROM community_rule WHERE community_id = ? ORDER BY position ASC",
      [communityId]
    );
    return rules;
  } catch (error) {
    console.error("Error fetching community rules:", error);
    throw new Error('Failed to fetch community rules');
  } finally {
    if (conn) conn.end();
  }
};

const addCommunityRule = async (communityId, ruleData, userId) => {
  const { title, description, position } = ruleData;
  let conn;
  
  try {
    const id = uuidv4();
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Get the highest position to determine the next position
    const [positionResult] = await conn.query(
      "SELECT MAX(position) as maxPosition FROM community_rule WHERE community_id = ?",
      [communityId]
    );
    const nextPosition = (positionResult.maxPosition || 0) + 1;
    
    await conn.query(
      "INSERT INTO community_rule (id, community_id, title, description, position) VALUES (?, ?, ?, ?, ?)",
      [id, communityId, title, description, position || nextPosition]
    );
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
        (SELECT id FROM action WHERE name = 'CREATE'),
        ?, 'community_rule', NOW()
      )`,
      [activityId, userId, id]
    );
    
    // Commit the transaction
    await conn.commit();
    
    const [newRule] = await conn.query(
      "SELECT * FROM community_rule WHERE id = ?",
      [id]
    );
    return newRule;
  } catch (error) {
    console.error("Error adding community rule:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to add community rule');
  } finally {
    if (conn) conn.end();
  }
};

const updateCommunityRule = async (ruleId, ruleData, userId) => {
  const { title, description, position } = ruleData;
  let conn;
  
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Build the update query dynamically based on provided fields
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
    }
    
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    
    if (position !== undefined) {
      updates.push("position = ?");
      values.push(position);
    }
    
    if (updates.length === 0) {
      // No fields to update
      const [rule] = await conn.query(
        "SELECT * FROM community_rule WHERE id = ?",
        [ruleId]
      );
      return rule || null;
    }
    
    // Add the ID to the values array
    values.push(ruleId);
    
    await conn.query(
      `UPDATE community_rule SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
        (SELECT id FROM action WHERE name = 'UPDATE'),
        ?, 'community_rule', NOW()
      )`,
      [activityId, userId, ruleId]
    );
    
    // Commit the transaction
    await conn.commit();
    
    const [updatedRule] = await conn.query(
      "SELECT * FROM community_rule WHERE id = ?",
      [ruleId]
    );
    return updatedRule || null;
  } catch (error) {
    console.error("Error updating community rule:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to update community rule');
  } finally {
    if (conn) conn.end();
  }
};

const deleteCommunityRule = async (ruleId, userId) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Start a transaction
    await conn.beginTransaction();
    
    // Get the rule to log its community_id
    const [rule] = await conn.query(
      "SELECT community_id FROM community_rule WHERE id = ?",
      [ruleId]
    );
    
    if (!rule) {
      return false;
    }
    
    // Log activity
    const activityId = uuidv4();
    await conn.query(
      `INSERT INTO activity (
        id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
      ) VALUES (
        ?, ?, 
        (SELECT id FROM activity_type WHERE name = 'COMMUNITY_RULE'),
        (SELECT id FROM action WHERE name = 'DELETE'),
        ?, 'community_rule', ?, NOW()
      )`,
      [
        activityId, 
        userId, 
        ruleId, 
        JSON.stringify({ community_id: rule.community_id })
      ]
    );
    
    // Delete the rule
    const result = await conn.query(
      "DELETE FROM community_rule WHERE id = ?",
      [ruleId]
    );
    
    // Commit the transaction
    await conn.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting community rule:", error);
    if (conn) {
      await conn.rollback();
    }
    throw new Error('Failed to delete community rule');
  } finally {
    if (conn) conn.end();
  }
};

// Export the functions
module.exports = {
  getCommunityRules,
  addCommunityRule,
  updateCommunityRule,
  deleteCommunityRule
};
