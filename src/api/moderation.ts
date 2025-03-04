import { getApiPath } from './apiUtils';

// Types
export interface ModeratorPermission {
  community_id: string;
  user_id: string;
  can_manage_settings: boolean;
  can_manage_members: boolean;
  can_manage_posts: boolean;
  can_manage_comments: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunitySettings {
  community_id: string;
  allow_post_images: boolean;
  allow_post_links: boolean;
  require_post_approval: boolean;
  restricted_words: string | null;
  custom_theme_color: string | null;
  custom_banner_url: string | null;
  minimum_account_age_days: number;
  minimum_karma_required: number;
  updated_at: string;
}

export interface BannedUser {
  community_id: string;
  user_id: string;
  reason: string | null;
  banned_by: string;
  ban_expires_at: string | null;
  created_at: string;
  banned_username?: string;
  moderator_username?: string;
}

export interface ModerationLog {
  id: string;
  community_id: string;
  moderator_id: string;
  action_type: string;
  target_id: string | null;
  target_type: string | null;
  reason: string | null;
  created_at: string;
  moderator_username?: string;
}

export interface PendingPost {
  id: string;
  title: string;
  content: string;
  user_id: string;
  community_id: string;
  created_at: string;
  updated_at: string;
  queued_at: string;
  author_username: string;
}

// Functions
export async function isUserModerator(communityId: string, token?: string | null): Promise<boolean> {
  if (!token) return false;
  
  try {
    // Get the current user info
    const userResponse = await fetch(getApiPath('/api/auth/me'), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!userResponse.ok) return false;
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    // Check if the user is a moderator of the community
    const response = await fetch(getApiPath(`/api/communities/${communityId}/members/${userId}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) return false;
    
    const member = await response.json();
    return member.role === 'moderator' || member.role === 'admin';
  } catch (err) {
    console.error("Error checking moderator status:", err);
    return false;
  }
}

export async function getCommunitySettings(communityId: string, token?: string | null): Promise<CommunitySettings> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/settings`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch community settings');
  }
  return await response.json();
}

export async function updateCommunitySettings(
  communityId: string,
  settings: Partial<CommunitySettings>,
  token?: string | null
): Promise<CommunitySettings> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/settings`), {
    method: 'PUT',
    headers,
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update community settings');
  }
  return await response.json();
}

// Keep these as aliases for backward compatibility
export const getEnhancedCommunitySettings = getCommunitySettings;
export const updateEnhancedCommunitySettings = updateCommunitySettings;

export async function getModeratorPermissions(
  communityId: string, 
  userId: string,
  token?: string | null
): Promise<ModeratorPermission> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/moderator-permissions/${userId}`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch moderator permissions');
  }
  return await response.json();
}

export async function setModeratorPermissions(
  communityId: string,
  userId: string,
  permissions: Partial<ModeratorPermission>,
  token?: string | null
): Promise<ModeratorPermission> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/moderator-permissions/${userId}`), {
    method: 'POST',
    headers,
    body: JSON.stringify(permissions)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to set moderator permissions');
  }
  return await response.json();
}

export async function getPendingModQueue(communityId: string, token?: string | null): Promise<PendingPost[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/mod-queue`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch moderation queue');
  }
  return await response.json();
}

export async function moderatePost(
  postId: string,
  action: 'approve' | 'reject',
  reason?: string,
  token?: string | null
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/posts/${postId}/moderate`), {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, reason })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to moderate post');
  }
  return await response.json();
}

export async function getModerationLogs(
  communityId: string,
  limit = 50,
  offset = 0,
  token?: string | null
): Promise<ModerationLog[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(
    getApiPath(`/api/moderation/communities/${communityId}/logs?limit=${limit}&offset=${offset}`),
    { headers }
  );
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch moderation logs');
  }
  return await response.json();
}

export async function getBannedUsers(communityId: string, token?: string | null): Promise<BannedUser[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/banned-users`), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch banned users');
  }
  return await response.json();
}

export async function banUser(
  communityId: string,
  userId: string,
  reason?: string,
  duration?: number,
  token?: string | null
): Promise<BannedUser> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/ban/${userId}`), {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason, duration })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to ban user');
  }
  return await response.json();
}

export async function unbanUser(
  communityId: string,
  userId: string,
  reason?: string,
  token?: string | null
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/unban/${userId}`), {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to unban user');
  }
}

export async function updateMemberRole(
  communityId: string,
  userId: string,
  role: 'member' | 'moderator' | 'admin',
  token?: string | null
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath(`/api/moderation/communities/${communityId}/members/${userId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update member role');
  }
  return await response.json();
}