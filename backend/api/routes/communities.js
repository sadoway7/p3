// Import the fixed version of addCommunityMember
const communitiesAPI = require('../communities');
const communitiesAPIOriginal = require('../communities.ts');

// Route handler for adding a member to a community
exports.addMember = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    
    // Use our fixed version that handles the table name issue
    const member = await communitiesAPI.addCommunityMember(communityId, userId);
    res.status(200).json(member);
  } catch (error) {
    console.error('Error in addMember:', error);
    res.status(500).json({ error: 'Failed to add community member' });
  }
};

// Export all the other handlers from the original API
// This ensures we're only overriding the specific function that has issues
Object.keys(communitiesAPIOriginal).forEach(key => {
  if (key !== 'addCommunityMember' && !exports[key]) {
    exports[key] = communitiesAPIOriginal[key];
  }
});