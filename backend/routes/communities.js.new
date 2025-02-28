import express from 'express';
const router = express.Router();
import dotenv from 'dotenv';
import pool from '../db/connection.js';
import communityApi from '../api/community/index.js';

dotenv.config();

// Check if user is a community moderator
const isCommunityModerator = async (req, res, next) => {
    const communityId = req.params.id;
    const userId = req.user.id;
    
    let conn;
    try {
        conn = await pool.getConnection();
        const [membership] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role IN ('moderator', 'admin')",
            [communityId, userId]
        );
        
        if (!membership) {
            return res.status(403).json({ error: 'Moderator access required' });
        }
        
        next();
    } catch (error) {
        console.error("Error checking moderator status:", error);
        return res.status(500).json({ error: 'Failed to check moderator status' });
    } finally {
        if (conn) conn.release();
    }
};

// Check if user can view a community (public or member of private)
const canViewCommunity = async (req, res, next) => {
    const communityId = req.params.id;
    const userId = req.user?.id; // Optional, might be unauthenticated
    
    let conn;
    try {
        conn = await pool.getConnection();
        const [community] = await conn.query(
            "SELECT * FROM community WHERE id = ?",
            [communityId]
        );
        
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        
        // Public communities are visible to everyone
        if (community.privacy === 'public') {
            return next();
        }
        
        // Private communities require membership
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const [membership] = await conn.query(
            "SELECT * FROM community_member WHERE community_id = ? AND user_id = ?",
            [communityId, userId]
        );
        
        if (!membership) {
            return res.status(403).json({ error: 'Membership required' });
        }
        
        next();
    } catch (error) {
        console.error("Error checking community access:", error);
        return res.status(500).json({ error: 'Failed to check community access' });
    } finally {
        if (conn) conn.release();
    }
};

// Communities API
router.get('/', async (req, res) => {
    try {
        const searchTerm = req.query.search;
        
        if (searchTerm) {
            const communitiesList = await communityApi.searchCommunities(searchTerm);
            res.json(communitiesList);
        } else {
            const allCommunities = await communityApi.getCommunities();
            res.json(allCommunities);
        }
    } catch (error) {
        console.error("Error fetching communities:", error);
        res.status(500).json({ error: 'Failed to fetch communities' });
    }
});

router.get('/:id', canViewCommunity, async (req, res) => {
    const { id } = req.params;
    try {
        const community = await communityApi.getCommunity(id);
        if (!community) {
            return res.status(404).json({ error: 'Community not found' });
        }
        res.json(community);
    } catch (error) {
        console.error("Error fetching community:", error);
        res.status(500).json({ error: 'Failed to fetch community' });
    }
});

router.post('/', async (req, res) => {
    const { name, description, privacy } = req.body;
    const userId = req.user.id;
    
    try {
        // Create the community
        const newCommunity = await communityApi.createCommunity({ name, description, privacy });
        
        // Add the creator as a moderator
        await communityApi.addCommunityMember(newCommunity.id, userId, 'moderator');
        
        // Activity logging is now handled within the community API functions
        
        res.status(201).json(newCommunity);
    } catch (error) {
        console.error("Error creating community:", error);
        res.status(500).json({ error: 'Failed to create community' });
    }
});

router.put('/:id', isCommunityModerator, async (req, res) => {
    const { id } = req.params;
    const { name, description, privacy } = req.body;
    try {
        const updatedCommunity = await communityApi.updateCommunity(id, { name, description, privacy });
        if (!updatedCommunity) {
            return res.status(404).json({ error: 'Community not found' });
        }
        res.json(updatedCommunity);
    } catch (error) {
        console.error("Error updating community:", error);
        res.status(500).json({ error: 'Failed to update community' });
    }
});

router.delete('/:id', isCommunityModerator, async (req, res) => {
    const { id } = req.params;
    try {
        const success = await communityApi.deleteCommunity(id);
        if (!success) {
            return res.status(404).json({ error: 'Community not found' });
        }
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting community:", error);
        res.status(500).json({ error: 'Failed to delete community' });
    }
});

// Community Rules API
router.get('/:id/rules', canViewCommunity, async (req, res) => {
    const { id } = req.params;
    try {
        const rules = await communityApi.getCommunityRules(id);
        res.json(rules);
    } catch (error) {
        console.error("Error fetching community rules:", error);
        res.status(500).json({ error: 'Failed to fetch community rules' });
    }
});

router.post('/:id/rules', isCommunityModerator, async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        const newRule = await communityApi.addCommunityRule(id, { title, description });
        res.status(201).json(newRule);
    } catch (error) {
        console.error("Error adding community rule:", error);
        res.status(500).json({ error: 'Failed to add community rule' });
    }
});

router.put('/:id/rules/:ruleId', isCommunityModerator, async (req, res) => {
    const { ruleId } = req.params;
    const { title, description } = req.body;
    try {
        const updatedRule = await communityApi.updateCommunityRule(ruleId, { title, description });
        if (!updatedRule) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.json(updatedRule);
    } catch (error) {
        console.error("Error updating community rule:", error);
        res.status(500).json({ error: 'Failed to update community rule' });
    }
});

router.delete('/:id/rules/:ruleId', isCommunityModerator, async (req, res) => {
    const { ruleId } = req.params;
    try {
        const success = await communityApi.deleteCommunityRule(ruleId);
        if (!success) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting community rule:", error);
        res.status(500).json({ error: 'Failed to delete community rule' });
    }
});

// Community Settings API
router.get('/:id/settings', canViewCommunity, async (req, res) => {
    const { id } = req.params;
    try {
        const settings = await communityApi.getCommunitySettings(id);
        if (!settings) {
            return res.status(404).json({ error: 'Settings not found' });
        }
        res.json(settings);
    } catch (error) {
        console.error("Error fetching community settings:", error);
        res.status(500).json({ error: 'Failed to fetch community settings' });
    }
});

router.put('/:id/settings', isCommunityModerator, async (req, res) => {
    const { id } = req.params;
    const { 
        allow_post_images, 
        allow_post_links, 
        join_method,
        require_post_approval,
        restricted_words,
        custom_theme_color,
        custom_banner_url,
        minimum_account_age_days,
        minimum_karma_required
    } = req.body;
    
    try {
        const updatedSettings = await communityApi.updateCommunitySettings(id, { 
            allow_post_images, 
            allow_post_links,
            join_method,
            require_post_approval,
            restricted_words,
            custom_theme_color,
            custom_banner_url,
            minimum_account_age_days,
            minimum_karma_required
        });
        
        if (!updatedSettings) {
            return res.status(404).json({ error: 'Settings not found' });
        }
        
        res.json(updatedSettings);
    } catch (error) {
        console.error("Error updating community settings:", error);
        res.status(500).json({ error: 'Failed to update community settings' });
    }
});

// Community Members API
router.get('/:id/members', canViewCommunity, async (req, res) => {
    const { id } = req.params;
    try {
        const members = await communityApi.getCommunityMembers(id);
        res.json(members);
    } catch (error) {
        console.error("Error fetching community members:", error);
        res.status(500).json({ error: 'Failed to fetch community members' });
    }
});

// Get a specific member
router.get('/:id/members/:userId', async (req, res) => {
    const { id, userId } = req.params;
    console.log(`GET request for member: community ${id}, user ${userId}`);
    
    try {
        const member = await communityApi.getCommunityMember(id, userId);
        console.log("Member result:", member);
        
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json(member);
    } catch (error) {
        console.error("Error fetching community member:", error);
        res.status(500).json({ error: 'Failed to fetch community member' });
    }
});

router.post('/:id/members', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id; // User joins themselves
    console.log(`POST request for member: community ${id}, user ${userId}`);
    
    try {
        // Get community settings to check join method
        const settings = await communityApi.getCommunitySettings(id);
        
        if (!settings) {
            return res.status(404).json({ error: 'Community not found' });
        }
        
        console.log("Community settings:", settings);
        
        // Handle based on join method
        switch (settings.join_method) {
            case 'auto_approve':
                console.log("Auto-approving join request");
                // Directly add as member
                const newMember = await communityApi.addCommunityMember(id, userId, 'member');
                return res.status(201).json(newMember);
                
            case 'requires_approval':
                console.log("Creating pending join request");
                // Create a join request
                const joinRequest = await communityApi.createJoinRequest(id, userId);
                return res.status(202).json({
                    message: 'Join request submitted for approval',
                    request: joinRequest
                });
                
            case 'invite_only':
                console.log("Rejecting invite-only join request");
                return res.status(403).json({ error: 'This community is invite-only' });
                
            default:
                console.log("Using fallback auto-approve method");
                // Fallback to auto-approve for any unexpected values
                const fallbackMember = await communityApi.addCommunityMember(id, userId, 'member');
                return res.status(201).json(fallbackMember);
        }
    } catch (error) {
        console.error("Error joining community:", error);
        res.status(500).json({ error: 'Failed to join community' });
    }
});

router.put('/:id/members/:userId', isCommunityModerator, async (req, res) => {
    const { id, userId } = req.params;
    const { role } = req.body;
    try {
        const updatedMember = await communityApi.updateCommunityMemberRole(id, userId, role);
        if (!updatedMember) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json(updatedMember);
    } catch (error) {
        console.error("Error updating community member role:", error);
        res.status(500).json({ error: 'Failed to update community member role' });
    }
});

router.delete('/:id/members', async (req, res) => {
    const { id } = req.params;
    const currentUserId = req.user.id;
    
    console.log(`DELETE request for current user to leave: community ${id}, user ${currentUserId}`);
    
    try {
        console.log(`Removing member ${currentUserId} from community ${id}`);
        
        const success = await communityApi.removeCommunityMember(id, currentUserId);
        
        if (!success) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        console.log(`Successfully removed member ${currentUserId} from community ${id}`);
        res.status(204).end();
    } catch (error) {
        console.error("Error removing community member:", error);
        res.status(500).json({ error: 'Failed to remove community member' });
    }
});

router.delete('/:id/members/:userId', async (req, res) => {
    const { id, userId } = req.params;
    const currentUserId = req.user.id;
    
    console.log(`DELETE request for specific member: community ${id}, target user ${userId}, current user ${currentUserId}`);
    
    // Check if user is removing themselves or is a moderator
    if (userId !== currentUserId) {
        let conn;
        try {
            conn = await pool.getConnection();
            const [membership] = await conn.query(
                "SELECT * FROM community_member WHERE community_id = ? AND user_id = ? AND role IN ('moderator', 'admin')",
                [id, currentUserId]
            );
            
            if (!membership) {
                return res.status(403).json({ error: 'You can only remove yourself unless you are a moderator' });
            }
        } catch (error) {
            console.error("Error checking moderator status:", error);
            return res.status(500).json({ error: 'Failed to check moderator status' });
        } finally {
            if (conn) conn.release();
        }
    }
    
    try {
        console.log(`Removing member ${userId} from community ${id}`);
        
        const success = await communityApi.removeCommunityMember(id, userId);
        
        if (!success) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        console.log(`Successfully removed member ${userId} from community ${id}`);
        res.status(204).end();
    } catch (error) {
        console.error("Error removing community member:", error);
        res.status(500).json({ error: 'Failed to remove community member' });
    }
});

// Join Requests API
router.get('/:id/join-requests', isCommunityModerator, async (req, res) => {
    const { id } = req.params;
    try {
        const requests = await communityApi.getJoinRequests(id);
        res.json(requests);
    } catch (error) {
        console.error("Error fetching join requests:", error);
        res.status(500).json({ error: 'Failed to fetch join requests' });
    }
});

router.get('/:id/join-requests/:requestId', isCommunityModerator, async (req, res) => {
    const { requestId } = req.params;
    try {
        const request = await communityApi.getJoinRequest(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Join request not found' });
        }
        res.json(request);
    } catch (error) {
        console.error("Error fetching join request:", error);
        res.status(500).json({ error: 'Failed to fetch join request' });
    }
});

router.post('/:id/join-requests/:requestId/approve', isCommunityModerator, async (req, res) => {
    const { requestId } = req.params;
    try {
        const success = await communityApi.updateJoinRequestStatus(requestId, 'approved');
        if (!success) {
            return res.status(404).json({ error: 'Join request not found' });
        }
        res.status(200).json({ message: 'Join request approved' });
    } catch (error) {
        console.error("Error approving join request:", error);
        res.status(500).json({ error: 'Failed to approve join request' });
    }
});

router.post('/:id/join-requests/:requestId/reject', isCommunityModerator, async (req, res) => {
    const { requestId } = req.params;
    try {
        const success = await communityApi.updateJoinRequestStatus(requestId, 'rejected');
        if (!success) {
            return res.status(404).json({ error: 'Join request not found' });
        }
        res.status(200).json({ message: 'Join request rejected' });
    } catch (error) {
        console.error("Error rejecting join request:", error);
        res.status(500).json({ error: 'Failed to reject join request' });
    }
});

// Community About API
router.get('/:id/about', canViewCommunity, async (req, res) => {
    const { id } = req.params;
    try {
        const about = await communityApi.getCommunity(id);
        if (!about) {
            return res.status(404).json({ error: 'Community not found' });
        }
        
        // Format the response to include only the about information
        const aboutInfo = {
            id: about.id,
            name: about.name,
            description: about.description,
            privacy: about.privacy,
            created_at: about.created_at,
            member_count: await communityApi.getCommunityMemberCount(id)
        };
        
        res.json(aboutInfo);
    } catch (error) {
        console.error("Error fetching community about:", error);
        res.status(500).json({ error: 'Failed to fetch community about' });
    }
});

// User Communities API
router.get('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const userCommunities = await communityApi.getUserCommunities(id);
        res.json(userCommunities);
    } catch (error) {
        console.error("Error fetching user communities:", error);
        res.status(500).json({ error: 'Failed to fetch user communities' });
    }
});

// Discover Communities API
router.get('/discover/trending', async (req, res) => {
    try {
        const trendingCommunities = await communityApi.getTrendingCommunities();
        res.json(trendingCommunities);
    } catch (error) {
        console.error("Error fetching trending communities:", error);
        res.status(500).json({ error: 'Failed to fetch trending communities' });
    }
});

router.get('/discover/recommended', async (req, res) => {
    const userId = req.user?.id;
    try {
        const recommendedCommunities = await communityApi.getRecommendedCommunities(userId);
        res.json(recommendedCommunities);
    } catch (error) {
        console.error("Error fetching recommended communities:", error);
        res.status(500).json({ error: 'Failed to fetch recommended communities' });
    }
});

export {
    router,
    canViewCommunity,
    isCommunityModerator
};
