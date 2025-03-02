// Simplified fix for community creation
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const communitiesApi = require('./communities');

// Middleware to create community with proper user ID handling
exports.createCommunity = async (req, res) => {
  try {
    // Extract auth token
    const token = req.headers.authorization;
    let userId = null;
    
    // Get user ID from token if present
    if (token) {
      try {
        const tokenStr = token.startsWith('Bearer ') ? token.slice(7) : token;
        const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);
        userId = decoded.userId || null;
      } catch (err) {
        console.warn('Warning: Could not decode token', err.message);
      }
    }
    
    // If no valid userId from token, check the request body for creator_id
    if (!userId && req.body.creator_id) {
      userId = req.body.creator_id;
    }

    // Create the community without user reference first (skip activity logging)
    const { name, description, privacy } = req.body;
    
    // Create a unique ID for the community
    const communityId = uuidv4();
    
    // We'll call our typescript API but skip activity logging
    const communityData = {
      id: communityId,
      name,
      description,
      privacy: privacy || 'public',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Directly insert into database
    const newCommunity = await communitiesApi.createCommunity({
      name, 
      description, 
      privacy,
      // Only pass creator_id if we have a valid user ID
      ...(userId ? { creator_id: userId } : {})
    });
    
    // If we have a valid user ID, add them as a moderator
    if (userId) {
      try {
        await communitiesApi.addCommunityMember(newCommunity.id, userId, 'moderator');
      } catch (memberError) {
        console.error("Warning: Could not add user as moderator, but community was created:", memberError);
        // Don't fail if just adding the member fails
      }
    }
    
    res.status(201).json(newCommunity);
  } catch (error) {
    console.error("Error creating community:", error);
    res.status(500).json({ error: 'Failed to create community' });
  }
};