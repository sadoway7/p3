// Fixed version of the communities API with correct endpoint paths
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Join community function - fixed for CORS compliance
export async function joinCommunity(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
  
  try {
    console.log(`Joining community ${communityId}...`);
    
    // Use the communities API endpoint
    const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members`, {
      method: 'POST',
      headers
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to join community';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
      }
      
      console.error(`Join community failed with status ${response.status}: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    console.log("Successfully joined community");
    return await response.json();
  } catch (error) {
    console.error('Error in joinCommunity:', error);
    throw error;
  }
}

// Leave community function - handles both direct DELETE and fallback to specific user endpoint
export async function leaveCommunity(communityId: string, userId?: string, token?: string | null) {
  if (!token) {
    throw new Error("Authentication token required to leave a community");
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    console.log(`Leaving community ${communityId}...`);
    
    // First, try the user-specific endpoint which is more likely to work
    let userToRemove = userId;
    
    // If no specific user is provided, we need to get the current user's ID
    if (!userToRemove) {
      // Parse the JWT token to get user ID - this is a simple extraction
      // of the user ID from the token payload for resilience
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userToRemove = payload.id || payload.userId || payload.sub;
        }
      } catch (e) {
        console.warn("Could not extract user ID from token", e);
      }
    }
    
    if (userToRemove) {
      const specificUserUrl = `${API_BASE_URL}/api/communities/${communityId}/members/${userToRemove}`;
      console.log(`Using user-specific endpoint: ${specificUserUrl}`);
      
      const response = await fetch(specificUserUrl, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        console.log("Successfully left community via user-specific endpoint");
        return true;
      }
      
      console.log(`User-specific endpoint failed with status ${response.status}, trying generic endpoint`);
    }
    
    // If we get here, either we couldn't get a user ID or the specific endpoint failed
    // Try the generic endpoint as a fallback
    const genericUrl = `${API_BASE_URL}/api/communities/${communityId}/members`;
    console.log(`Using generic endpoint: ${genericUrl}`);
    
    const response = await fetch(genericUrl, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to leave community';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
      }
      
      console.error(`Leave community failed with status ${response.status}: ${errorMessage}`);
      
      // If we get a 404, it could mean:
      // 1. The endpoint doesn't exist
      // 2. The user isn't a member
      if (response.status === 404) {
        // We'll check if the user is actually a member
        const isMember = await getCommunityMember(communityId, token, userToRemove);
        if (!isMember) {
          console.log("User is not a member of this community - success");
          return true;
        } else {
          console.log("User is still a member, endpoint may not exist");
          throw new Error("The API endpoint for leaving communities doesn't seem to be available");
        }
      }
      
      throw new Error(errorMessage);
    }
    
    console.log("Successfully left community");
    return true;
  } catch (error) {
    console.error('Error in leaveCommunity:', error);
    throw error;
  }
}
// Membership status checking function - optimized to use only the method we know works
export async function getCommunityMember(communityId: string, token?: string | null, userId?: string) {
  if (!token) {
    console.log("Missing token for membership check");
    return null;
  }
  
  if (!userId) {
    console.log("Missing userId for membership check");
    return null;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    console.log(`Checking membership status for user ${userId} in community ${communityId}...`);
    
    // Get all members of the community - this method is reliable and works
    const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      console.error(`Error getting community members: ${response.status}`);
      return null;
    }
    
    // Define a type for community member
    interface CommunityMember {
      community_id: string;
      user_id: string;
      role: string;
      joined_at: string | Date;
    }
    
    // Parse the response
    const membersData = await response.json();
    console.log(`Got ${membersData.length} community members`);
    
    // Find the current user in the members list
    const currentMember = membersData.find((member: CommunityMember) => member.user_id === userId);
    
    if (currentMember) {
      console.log(`User ${userId} is a member of community ${communityId}`);
      return currentMember;
    } else {
      console.log(`User ${userId} is not a member of community ${communityId}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting community member status:', error);
    return null;
  }
}

// Export selected functions from the original API (excluding the ones we've redefined)
export {
  getCommunities,
  getCommunity,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  getUserCommunities,
  getCommunityRules,
  addCommunityRule,
  updateCommunityRule,
  deleteCommunityRule,
  getCommunitySettings,
  updateCommunitySettings,
  getCommunityMembers,
  updateCommunityMemberRole,
  updateMemberRole,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getCommunityAbout,
  getCommunityModerators
} from './communities';