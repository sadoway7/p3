import { getApiPath } from './apiUtils';

export async function getCommunities(searchTerm?: string) {
  const url = searchTerm
    ? getApiPath(`/api/communities?search=${encodeURIComponent(searchTerm)}`)
    : getApiPath('/api/communities');
    
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch communities');
  }
  return await response.json();
}

export async function getCommunity(communityId: string) {
  const response = await fetch(getApiPath(`/api/communities/${communityId}`));
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch community');
  }
  return await response.json();
}

export async function createCommunity(
  communityData: { 
    name: string, 
    description: string, 
    privacy: 'public' | 'private',
    creator_id?: string
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/communities'), {
    method: 'POST',
    headers,
    body: JSON.stringify(communityData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create community');
  }
  return await response.json();
}

export async function updateCommunity(
  communityId: string, 
  communityData: {
    name?: string,
    description?: string,
    privacy?: 'public' | 'private'
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(communityData)
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update community');
  }
  return await response.json();
}

export async function deleteCommunity(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}`), {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete community');
  }
  return true;
}

export async function getUserCommunities(userId: string) {
  const response = await fetch(getApiPath(`/api/users/${userId}/communities`));
  if (!response.ok) {
    throw new Error('Failed to fetch user communities');
  }
  return await response.json();
}

// Community Rules API
export async function getCommunityRules(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/rules`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch community rules');
  }
  return await response.json();
}

export async function addCommunityRule(
  communityId: string, 
  ruleData: { 
    title: string, 
    description: string 
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/rules`), {
    method: 'POST',
    headers,
    body: JSON.stringify(ruleData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add community rule');
  }
  return await response.json();
}

export async function updateCommunityRule(
  communityId: string, 
  ruleId: string, 
  ruleData: {
    title?: string,
    description?: string
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/rules/${ruleId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(ruleData)
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update community rule');
  }
  return await response.json();
}

export async function deleteCommunityRule(
  communityId: string, 
  ruleId: string,
  token?: string | null
) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/rules/${ruleId}`), {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete community rule');
  }
  return true;
}

// Community Settings API
export async function getCommunitySettings(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/settings`), {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch community settings');
  }
  return await response.json();
}

export async function updateCommunitySettings(
  communityId: string, 
  settingsData: {
    allow_post_images?: boolean,
    allow_post_links?: boolean,
    join_method?: 'auto_approve' | 'requires_approval' | 'invite_only',
    require_post_approval?: boolean,
    restricted_words?: string,
    custom_theme_color?: string,
    custom_banner_url?: string,
    minimum_account_age_days?: number,
    minimum_karma_required?: number,
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/settings`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(settingsData)
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update community settings');
  }
  return await response.json();
}

// Community Members API
export async function getCommunityMembers(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/members`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch community members');
  }
  return await response.json();
}

export async function joinCommunity(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/members`), {
    method: 'POST',
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to join community');
  }
  return await response.json();
}

export async function updateCommunityMemberRole(
  communityId: string, 
  userId: string, 
  role: 'member' | 'moderator' | 'admin',
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/members/${userId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role })
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update community member role');
  }
  return await response.json();
}

// Add alias for updateMemberRole that ModeratorDashboard is trying to import
export const updateMemberRole = updateCommunityMemberRole;

export async function leaveCommunity(communityId: string, userId?: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // If userId is provided, we're removing a specific user (as a moderator)
  // Otherwise we're removing the current user (self)
  const url = userId 
    ? getApiPath(`/api/communities/${communityId}/members/${userId}`)
    : getApiPath(`/api/communities/${communityId}/members`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to leave community');
  }
  return true;
}

// Join request operations
export async function getPendingJoinRequests(communityId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/join-requests`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch join requests');
  }
  return await response.json();
}

export async function approveJoinRequest(communityId: string, requestId: string, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/join-requests/${requestId}/approve`), {
    method: 'POST',
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to approve join request');
  }
  return await response.json();
}

export async function rejectJoinRequest(communityId: string, requestId: string, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/join-requests/${requestId}/reject`), {
    method: 'POST',
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reject join request');
  }
  return await response.json();
}

// Community About API
export async function getCommunityAbout(communityId: string) {
  const response = await fetch(getApiPath(`/api/communities/${communityId}/about`));
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch community about');
  }
  return await response.json();
}

// Get community moderators with usernames
export async function getCommunityModerators(communityId: string, token?: string | null) {
  // First try to get members which should include username data
  try {
    const members = await getCommunityMembers(communityId, token);
    
    // Filter only moderators and admins
    return members.filter((member: any) => 
      member.role === 'moderator' || member.role === 'admin'
    );
  } catch (error) {
    console.error("Error fetching moderators:", error);
    return [];
  }
}

// Get member status for a specific user in a community
export async function getCommunityMember(communityId: string, userId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/communities/${communityId}/members/${userId}`), {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null; // User is not a member
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch member status');
  }
  return await response.json();
}