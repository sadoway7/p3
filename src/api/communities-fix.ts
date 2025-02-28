// Fixed version of the communities API with correct endpoint paths
import { getCommunities } from './communities';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Correct implementation of joinCommunity function
export async function joinCommunity(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    console.log(`Joining community ${communityId}...`);
    
    // The correct path according to the router is /api/communities/:id/members
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
    
    return await response.json();
  } catch (error) {
    console.error('Error in joinCommunity:', error);
    throw error;
  }
}

// Correct implementation of leaveCommunity function
export async function leaveCommunity(communityId: string, userId?: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    console.log(`Leaving community ${communityId}...`);
    
    // If userId is provided, we're removing a specific user (as a moderator)
    // Otherwise we're removing the current user (self)
    const url = userId 
      ? `${API_BASE_URL}/api/communities/${communityId}/members/${userId}`
      : `${API_BASE_URL}/api/communities/${communityId}/members`;
    
    const response = await fetch(url, {
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
      
      if (response.status === 404) {
        return false;
      }
      
      throw new Error(errorMessage);
    }
    
    return true;
  } catch (error) {
    console.error('Error in leaveCommunity:', error);
    throw error;
  }
}

// Correct implementation of getCommunityMember function
export async function getCommunityMember(communityId: string, token?: string | null) {
  if (!token) return null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    // First, try to get the user info from the token
    // JWT tokens usually contain the user ID in the payload
    // But we need to get it from the server to be safe
    const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, { 
      headers 
    });
    
    if (!userResponse.ok) {
      return null;
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    if (!userId) {
      console.error('Failed to get user ID from token');
      return null;
    }
    
    // Now get the membership status with the correct user ID
    const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members/${userId}`, { 
      headers 
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Not a member
        return null;
      }
      throw new Error('Failed to fetch member status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting community member status:', error);
    // Return null to indicate not a member for safety
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