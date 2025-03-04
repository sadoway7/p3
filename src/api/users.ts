import { getApiPath } from './apiUtils';

interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  post_count?: number;
  comment_count?: number;
  upvotes_received?: number;
  downvotes_received?: number;
  upvotes_given?: number;
  downvotes_given?: number;
  communities_joined?: number;
  last_active?: string;
}

export async function getCurrentUser(token?: string | null): Promise<User> {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/auth/me'), {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch current user');
  }
  
  return await response.json();
}

export async function getUserById(userId: string): Promise<User> {
  const response = await fetch(getApiPath(`/api/users/${userId}`));
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch user');
  }
  
  return await response.json();
}

export async function getUserByUsername(username: string): Promise<User> {
  // First, lookup the user ID by username
  const lookupResponse = await fetch(getApiPath(`/api/users/lookup/${username}`));
  
  if (!lookupResponse.ok) {
    if (lookupResponse.status === 404) {
      throw new Error('User not found');
    }
    const errorData = await lookupResponse.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to lookup user');
  }
  
  const { id } = await lookupResponse.json();
  
  // Then, fetch the full user profile by ID
  return getUserById(id);
}

export async function getAllUsers(): Promise<User[]> {
  const response = await fetch(getApiPath('/api/users'));
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch users');
  }
  
  return await response.json();
}

export async function updateUserProfile(
  userData: {
    username?: string;
    email?: string;
    bio?: string;
    avatar?: string;
  },
  token?: string | null
): Promise<User> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(getApiPath('/api/users/profile'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(userData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update profile');
  }
  
  return await response.json();
}

// Helper function to get username from user ID
export async function getUsername(userId: string): Promise<string> {
  try {
    const user = await getUserById(userId);
    return user.username || 'Anonymous';
  } catch (error) {
    console.error(`Error fetching username for ${userId}:`, error);
    return 'Anonymous';
  }
}