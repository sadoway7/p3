const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getPosts(communityId?: string | null, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Build the URL with query parameters if communityId is provided
  let url = `${API_BASE_URL}/api/posts`;
  if (communityId) {
    url += `?communityId=${encodeURIComponent(communityId)}`;
  }
  
  const response = await fetch(url, {
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch posts');
  }
  return await response.json();
}

export async function getPost(postId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch post');
  }
  return await response.json();
}

export async function createPost(
  postData: {
    title: string,
    content: string,
    communityId: string | null,
    profile_post: boolean; // Add the missing field
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify(postData)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create post');
  }
  return await response.json();
}

export async function updatePost(
  postId: string, 
  postData: {
    title?: string,
    content?: string
  },
  token?: string | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(postData)
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update post');
  }
  return await response.json();
}

export async function deletePost(postId: string, token?: string | null) {
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return false;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete post');
  }
  return true;
}
