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
  try {
    const url = `${API_BASE_URL}/api/posts/${postId}/comments${threaded ? '?threaded=true' : ''}`;
    console.log(`Fetching comments from: ${url}`);
    
    const response = await fetch(url);
    
    // Log the response status for debugging
    console.log(`Comments API response status: ${response.status}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch comments: ${response.status}`);
      return []; // Return empty array instead of throwing
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in getPostComments:', error);
    return []; // Return empty array on any error
  }
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
  try {
    console.log(`Creating comment for post ${postId}:`, commentData);
    
    // Check if token is available
    if (!token) {
      console.warn('No authentication token provided for creating comment');
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Include post_id in the comment data if not already there
    const data = {
      ...commentData,
      post_id: postId
    };
    
    console.log(`Sending comment request to ${API_BASE_URL}/api/posts/${postId}/comments`);
    console.log('Request payload:', data);
    console.log('Headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    
    console.log(`Comment API response status: ${response.status}`);
    
    if (!response.ok) {
      // Try to get error details from response
      const errorText = await response.text();
      console.error('Error response from comment API:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to create comment: ${response.status}`);
      } catch (parseError) {
        throw new Error(`Failed to create comment: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    }
    
    const responseData = await response.json();
    console.log('Comment created successfully:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error in createComment:', error);
    throw error; // Rethrow to let the component handle it
  }
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

// Get comment count for a post
export async function getCommentCount(postId: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments/count`);
    
    if (!response.ok) {
      console.warn(`Error fetching comment count for post ${postId}: ${response.status}`);
      return 0; // Return 0 on error
    }
    
    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.warn(`Failed to fetch comment count for post ${postId}:`, error);
    return 0; // Return 0 on any error
  }
}