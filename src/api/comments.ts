const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  username?: string;
  replies?: Comment[];
}

export interface CommentInput {
  content: string;
  post_id: string;
  parent_comment_id?: string;
}

// Get all comments for a post
export async function getPostComments(postId: string, threaded: boolean = false) {
  const url = `${API_BASE_URL}/api/posts/${postId}/comments${threaded ? '?threaded=true' : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  
  return await response.json();
}

// Get a specific comment
export async function getComment(commentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch comment');
  }
  
  return await response.json();
}

// Create a new comment
export async function createComment(
  postId: string, 
  commentData: { 
    content: string, 
    parentCommentId?: string 
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commentData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create comment');
  }
  
  return await response.json();
}

// Update a comment
export async function updateComment(
  commentId: string, 
  content: string,
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content })
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update comment');
  }
  
  return await response.json();
}

// Delete a comment
export async function deleteComment(commentId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete comment');
  }
  
  return true;
}

// Get replies to a comment
export async function getCommentReplies(commentId: string) {
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}/replies`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch comment replies');
  }
  
  return await response.json();
}