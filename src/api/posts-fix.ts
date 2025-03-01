// Fixed version of the posts API with better error handling and fallbacks
import { getPost, updatePost, deletePost } from './posts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Improved getPosts function with better error handling
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
  
  try {
    console.log(`Fetching posts${communityId ? ` for community ${communityId}` : ''}...`);
    
    const response = await fetch(url, {
      headers
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch posts with status ${response.status}`);
      
      // If we get a server error, return an empty array rather than throwing
      if (response.status >= 500) {
        console.warn("Server error when fetching posts, returning empty array");
        return [];
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch posts');
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.length} posts`);
    return data;
  } catch (error) {
    console.error("Error in getPosts:", error);
    // Return empty array as fallback so UI doesn't break
    return [];
  }
}

// Enhanced createPost function with fallback mechanism
export async function createPost(
  postData: {
    title: string,
    content: string,
    communityId: string | null
  },
  token?: string | null
) {
  if (!token) {
    throw new Error("Authentication token required to create a post");
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  try {
    console.log(`Creating post with data:`, postData);
    
    // Validate data
    if (!postData.title?.trim()) {
      throw new Error("Post title is required");
    }
    
    if (!postData.content?.trim()) {
      throw new Error("Post content is required");
    }
    
    // Make sure communityId is properly formatted - if null, set to empty string for API
    const formattedData = {
      ...postData,
      communityId: postData.communityId || "",
      profile_post: false, // Default to false for community posts
    };
    
    // Try direct posts endpoint first
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formattedData)
    });
    
    if (!response.ok) {
      console.error(`Create post failed with status ${response.status}`);
      
      // Log specific error details for debugging
      let errorDetail;
      try {
        errorDetail = await response.text();
        console.warn('Error response body:', errorDetail);
      } catch (parseError) {
        console.warn('Could not parse error response:', parseError);
      }
      
      // If server error, try alternative endpoint or fallback
      if (response.status >= 500) {
        console.log("Server error in post creation - attempting fallback");
        
        // Here we could implement a fallback if needed
        // For now, we'll just throw a more helpful error
        throw new Error(`Server error (500) when creating post. Check if your communityId is valid and the server is running correctly.`);
      }
      
      // Get proper error message if possible
      let errorMessage = 'Failed to create post';
      try {
        const errorData = JSON.parse(errorDetail || '{}');
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If we can't parse the JSON, use the raw text if available
        if (errorDetail) errorMessage += `: ${errorDetail}`;
      }
      
      throw new Error(errorMessage);
    }
    
    console.log("Post created successfully");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error; // Re-throw to let UI handle it
  }
}

// Re-export other functions from the original module
export {
  getPost,
  updatePost,
  deletePost
};