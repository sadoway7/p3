// API route handler for community members
// This adds an endpoint to check current user membership

const express = require('express');
const router = express.Router();
const { getCommunityMember } = require('../communities.ts');
const { addCommunityMember } = require('../communities.js');
const auth = require('../../middleware/auth');

// Route to check if the current user is a member of a community
router.get('/:communityId/members/current', auth, async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    // Check if the user is a member
    const member = await getCommunityMember(communityId, userId);
    
    if (member) {
      return res.status(200).json({ 
        is_member: true,
        role: member.role,
        member_since: member.joined_at
      });
    } else {
      return res.status(200).json({ is_member: false });
    }
  } catch (error) {
    console.error('Error checking member status:', error);
    res.status(500).json({ error: 'Failed to check membership status' });
  }
});

// Route to add a member to a community
router.post('/:communityId/members', auth, async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    // Use our fixed version that handles the table name issue
    const member = await addCommunityMember(communityId, userId);
    res.status(200).json(member);
  } catch (error) {
    console.error('Error in addMember:', error);
    res.status(500).json({ error: 'Failed to add community member' });
  }
});

module.exports = router;