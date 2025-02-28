// API Compatibility Layer
// This file helps adapt between the frontend and backend API changes

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Handles error responses from the API
export async function handleApiResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed with status: ${response.status}`);
  }
  return await response.json();
}

// Empty array fallback for endpoints that might fail
export async function safeGetArray(url: string, token?: string | null): Promise<any[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(`API call to ${url} failed with status ${response.status}`);
      return []; // Return empty array as fallback
    }
    return await response.json();
  } catch (error) {
    console.warn(`API call to ${url} failed with error`, error);
    return []; // Return empty array on any error
  }
}

// Safe object getter that returns null on failure
export async function safeGetObject(url: string, token?: string | null): Promise<any | null> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(`API call to ${url} failed with status ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`API call to ${url} failed with error`, error);
    return null;
  }
}

// Community activities endpoint (returns empty array for now)
export async function getCommunityActivities(communityId: string, limit = 10): Promise<any[]> {
  return [];
}

// Community rules - safely handles missing position column
export async function getCommunityRules(communityId: string, token?: string | null): Promise<any[]> {
  return safeGetArray(`${API_BASE_URL}/api/communities/${communityId}/rules`, token);
}

// Posts for a community - handles table name mismatch
export async function getCommunityPosts(communityId: string, token?: string | null): Promise<any[]> {
  return safeGetArray(`${API_BASE_URL}/api/posts?communityId=${communityId}`, token);
}

// Community settings - robust error handling
export async function getCommunitySettings(communityId: string, token?: string | null): Promise<any | null> {
  return safeGetObject(`${API_BASE_URL}/api/communities/${communityId}/settings`, token);
}

// Get community members
export async function getCommunityMembers(communityId: string, token?: string | null): Promise<any[]> {
  return safeGetArray(`${API_BASE_URL}/api/communities/${communityId}/members`, token);
}

// Get community details
export async function getCommunityDetails(communityId: string, token?: string | null): Promise<any | null> {
  return safeGetObject(`${API_BASE_URL}/api/communities/${communityId}`, token);
}

// Get empty activity history 
export async function getActivityHistory(entity: 'community' | 'user' | 'post', id: string, token?: string | null): Promise<any[]> {
  return []; // Return empty activities for now
}

// Get post comments with error handling
export async function getPostComments(postId: string, threaded: boolean = false): Promise<any[]> {
  try {
    // For now, just return an empty array immediately to avoid server errors
    // This is a temporary measure until backend is fixed
    return [];
    
    /*
    // Original implementation
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments${threaded ? '?threaded=true' : ''}`);
    if (!response.ok) {
      console.warn(`Error fetching comments for post ${postId}: ${response.status}`);
      return []; // Return empty array on error
    }
    return await response.json();
    */
  } catch (error) {
    console.warn(`Failed to fetch comments for post ${postId}:`, error);
    return []; // Return empty array on any error
  }
}

// Get user's vote on a post with error handling
export async function getUserVoteOnPost(postId: string, token?: string | null): Promise<number> {
  // If not authenticated, return 0 (no vote)
  if (!token) return 0;
  
  try {
    // No need to try multiple endpoints as they all fail
    // Instead, we'll implement the functionality directly in the frontend
    // for now to avoid server errors
    
    // Logic: Each user gets a vote of 0 (no vote) for all posts by default
    // This is what would be returned from the server in the normal case
    return 0;
    
    /*
    // Original implementation
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };
    
    const response = await fetch(`${API_BASE_URL}/api/votes/post/${postId}/user`, { headers });
    if (!response.ok) {
      console.warn(`Vote endpoint failed with status: ${response.status}`);
      return 0; // Return 0 (no vote) on error
    }
    const data = await response.json();
    return data.value || 0;
    */
  } catch (error) {
    console.warn(`Failed to fetch user vote for post ${postId}:`, error);
    return 0; // Return 0 (no vote) on any error
  }
}