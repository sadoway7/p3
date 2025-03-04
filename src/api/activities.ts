import { getApiPath } from './apiUtils';

export interface Activity {
  id: string;
  user_id: string;
  activity_type_id: string;
  action_id: string;
  entity_id?: string;
  entity_type?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  activity_type_name: string;
  action_name: string;
  username?: string;
  entity_details?: any;
}

export interface ActivityType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ActionType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityQueryOptions {
  limit?: number;
  offset?: number;
  activityType?: string;
  actionType?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

// Get all activity types
export async function getActivityTypes(token?: string | null): Promise<ActivityType[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/activity/types'), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch activity types');
  }
  
  return await response.json();
}

// Get all action types
export async function getActionTypes(token?: string | null): Promise<ActionType[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/activity/actions'), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch action types');
  }
  
  return await response.json();
}

// Get activities for the current user
export async function getCurrentUserActivities(
  options: ActivityQueryOptions = {},
  token?: string | null
): Promise<Activity[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build query string from options
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.offset) queryParams.append('offset', options.offset.toString());
  if (options.activityType) queryParams.append('activityType', options.activityType);
  if (options.actionType) queryParams.append('actionType', options.actionType);
  if (options.entityType) queryParams.append('entityType', options.entityType);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  
  const queryString = queryParams.toString();
  const url = `${getApiPath('/api/activity/me')}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch user activities');
  }
  
  return await response.json();
}

// Get activities for a specific user (admin only or self)
export async function getUserActivities(
  userId: string,
  options: ActivityQueryOptions = {},
  token?: string | null
): Promise<Activity[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build query string from options
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.offset) queryParams.append('offset', options.offset.toString());
  if (options.activityType) queryParams.append('activityType', options.activityType);
  if (options.actionType) queryParams.append('actionType', options.actionType);
  if (options.entityType) queryParams.append('entityType', options.entityType);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  
  const queryString = queryParams.toString();
  const url = `${getApiPath(`/api/activity/user/${userId}`)}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch user activities');
  }
  
  return await response.json();
}

// Get activities for a specific community
export async function getCommunityActivities(
  communityId: string,
  options: ActivityQueryOptions = {},
  token?: string | null
): Promise<Activity[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build query string from options
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.offset) queryParams.append('offset', options.offset.toString());
  if (options.activityType) queryParams.append('activityType', options.activityType);
  if (options.actionType) queryParams.append('actionType', options.actionType);
  if (options.entityType) queryParams.append('entityType', options.entityType);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  
  const queryString = queryParams.toString();
  const url = `${getApiPath(`/api/activity/community/${communityId}`)}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch community activities');
  }
  
  return await response.json();
}

// Get activities for a specific post
export async function getPostActivities(
  postId: string,
  options: { limit?: number; offset?: number } = {},
  token?: string | null
): Promise<Activity[]> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build query string from options
  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.offset) queryParams.append('offset', options.offset.toString());
  
  const queryString = queryParams.toString();
  const url = `${getApiPath(`/api/activity/post/${postId}`)}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch post activities');
  }
  
  return await response.json();
}

// Log a new activity (admin only)
export async function logActivity(
  activityData: {
    userId: string;
    activityType: string;
    actionType: string;
    entityId?: string;
    entityType?: string;
    metadata?: any;
  },
  token?: string | null
): Promise<Activity> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/activity/log'), {
    method: 'POST',
    headers,
    body: JSON.stringify(activityData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to log activity');
  }
  
  return await response.json();
}

// Helper function to format activity for display
export function formatActivity(activity: Activity): string {
  const { activity_type_name, action_name, entity_type, entity_details, created_at } = activity;
  
  let entityName = entity_type || 'unknown';
  let entityTitle = '';
  
  if (entity_details) {
    if (entity_type === 'post' && entity_details.title) {
      entityTitle = entity_details.title;
    } else if (entity_type === 'comment' && entity_details.content) {
      entityTitle = entity_details.content.substring(0, 30) + (entity_details.content.length > 30 ? '...' : '');
    } else if (entity_type === 'community' && entity_details.name) {
      entityTitle = entity_details.name;
    } else if (entity_type === 'user' && entity_details.username) {
      entityTitle = entity_details.username;
    }
  }
  
  const date = new Date(created_at).toLocaleString();
  
  if (entityTitle) {
    return `${activity_type_name} ${action_name.toLowerCase()} - ${entityName}: "${entityTitle}" (${date})`;
  } else {
    return `${activity_type_name} ${action_name.toLowerCase()} - ${entityName} (${date})`;
  }
}
