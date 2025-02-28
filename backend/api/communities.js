// Fix for the community join request functionality
// This file extends the communities.ts code to handle both singular/plural naming issues

const mariadb = require('mariadb');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

// Override the addCommunityMember function to handle the table name issue
exports.addCommunityMember = async function(communityId, userId, role = 'member') {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start a transaction
        await conn.beginTransaction();
        
        // Check if user is already a member
        const [existingMember] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (existingMember) {
            // Just update their role if needed
            if (existingMember.role !== role) {
                await conn.query(
                    "UPDATE community_member SET role = ? WHERE community_id = ? AND user_id = ?",
                    [role, communityId, userId]
                );
            }
            
            // If they had a pending join request, try to mark it as approved
            // We catch errors here to handle the case where the table might not exist
            try {
                await conn.query(
                    "UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'",
                    [communityId, userId]
                );
            } catch (error) {
                console.log("Note: community_join_request table might not exist yet. Continuing anyway.");
            }
            
            // Get user details
            const [user] = await conn.query(
                "SELECT username FROM user WHERE id = ?",
                [userId]
            );
            
            // Commit the transaction
            await conn.commit();
            
            return {
                community_id: communityId,
                user_id: userId,
                username: user.username,
                role: role,
                joined_at: existingMember.joined_at
            };
        }
        
        // Insert new member
        await conn.query(
            "INSERT INTO community_member (community_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())",
            [communityId, userId, role]
        );
        
        // If they had a pending join request, try to mark it as approved
        try {
            await conn.query(
                "UPDATE community_join_request SET status = 'approved', updated_at = NOW() WHERE community_id = ? AND user_id = ? AND status = 'pending'",
                [communityId, userId]
            );
        } catch (error) {
            console.log("Note: community_join_request table might not exist yet. Continuing anyway.");
        }
        
        // Get user details
        const [user] = await conn.query(
            "SELECT username FROM user WHERE id = ?",
            [userId]
        );
        
        // Log activity
        const activityId = uuidv4();
        await conn.query(
            `INSERT INTO activity (
                id, user_id, activity_type_id, action_id, entity_id, entity_type, metadata, created_at
            ) VALUES (
                ?, ?, 
                (SELECT id FROM activity_type WHERE name = 'COMMUNITY'),
                (SELECT id FROM action WHERE name = 'JOIN'),
                ?, 'community', ?, NOW()
            )`,
            [
                activityId, 
                userId, 
                communityId, 
                JSON.stringify({ role })
            ]
        );
        
        // Update user statistics
        await conn.query(
            "UPDATE user_statistic SET communities_joined = communities_joined + 1 WHERE user_id = ?",
            [userId]
        );
        
        // Commit the transaction
        await conn.commit();
        
        return {
            community_id: communityId,
            user_id: userId,
            username: user.username,
            role,
            joined_at: new Date()
        };
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