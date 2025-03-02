import { getApiBaseUrl } from './apiUtils';

const API_BASE_URL = getApiBaseUrl();

// Vote on a post
export async function voteOnPost(
  postId: string, 
  value: number, // 1 for upvote, -1 for downvote, 0 for removing vote
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/votes/posts/${postId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ value })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to vote on post');
  }
  
  return await response.json();
}

// Vote on a comment
export async function voteOnComment(
  commentId: string, 
  value: number, // 1 for upvote, -1 for downvote, 0 for removing vote
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/votes/comments/${commentId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ value })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to vote on comment');
  }
  
  return await response.json();
}

// Get user's vote on a post
export async function getUserPostVote(
  postId: string,
  token?: string | null
) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/votes/posts/${postId}/user`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, return 0 (no vote)
      return { value: 0 };
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get user post vote');
  }
  
  return await response.json();
}

// Get user's vote on a comment
export async function getUserCommentVote(
  commentId: string,
  token?: string | null
) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/votes/comments/${commentId}/user`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, return 0 (no vote)
      return { value: 0 };
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get user comment vote');
  }
  
  return await response.json();
}