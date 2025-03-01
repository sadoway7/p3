// Fallback implementation for posting when server endpoints fail
import { v4 as uuidv4 } from 'uuid';
import { getPosts, getPost, updatePost, deletePost } from './posts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Local storage keys
const LOCAL_POSTS_KEY = 'local_posts';
const LOCAL_COMMENTS_KEY = 'local_comments';

// Type definitions
interface Post {
  id: string;
  title: string;
  content: string;
  community_id?: string | null;
  user_id: string;
  username: string;
  created_at: string;
  updated_at?: string;
  votes_count: number;
  comments_count: number;
}

// Get posts with fallback to locally stored posts
export async function getPostsWithFallback(communityId?: string | null, token?: string | null) {
  try {
    // Try to get posts from server first
    const serverPosts = await getPosts(communityId, token);
    
    // Merge with local posts
    const localPosts = getLocalPosts();
    
    // Filter local posts by community if needed
    const filteredLocalPosts = communityId 
      ? localPosts.filter(post => post.community_id === communityId)
      : localPosts;
    
    // Combine server and local posts, ensuring no duplicates
    const combinedPosts = [
      ...serverPosts,
      ...filteredLocalPosts.filter(localPost => 
        !serverPosts.some(serverPost => serverPost.id === localPost.id)
      )
    ];
    
    // Sort by creation date (newest first)
    return combinedPosts.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error("Server error fetching posts, using local posts only:", error);
    // If server request fails, return local posts
    const localPosts = getLocalPosts();
    
    // Filter by community if needed
    return communityId 
      ? localPosts.filter(post => post.community_id === communityId)
      : localPosts;
  }
}

// Create post with fallback to local storage
export async function createPostWithFallback(
  postData: {
    title: string;
    content: string;
    communityId: string | null;
  },
  token?: string | null,
  userData?: {
    id: string;
    username: string;
  }
) {
  try {
    console.log(`Attempting to create post on server:`, postData);
    
    // Try to create post on server first
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
      // If server returns an error, throw to trigger the fallback
      const errorText = await response.text();
      console.warn(`Server returned ${response.status} when creating post:`, errorText);
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }
    
    const newPost = await response.json();
    console.log("Post created successfully on server:", newPost);
    return newPost;
  } catch (error) {
    console.error("Error creating post on server, using local fallback:", error);
    
    // Extract user info from token if not provided
    const userInfo = userData || extractUserFromToken(token);
    
    if (!userInfo || !userInfo.id || !userInfo.username) {
      throw new Error("User information required for local post creation");
    }
    
    // Create a local post
    const localPost: Post = {
      id: `local-${uuidv4()}`,
      title: postData.title,
      content: postData.content,
      community_id: postData.communityId,
      user_id: userInfo.id,
      username: userInfo.username,
      created_at: new Date().toISOString(),
      votes_count: 0,
      comments_count: 0
    };
    
    // Save to local storage
    saveLocalPost(localPost);
    
    // Show notification to user
    console.info("⚠️ Post saved locally due to server error. It will only be visible to you until the server is fixed.");
    
    return localPost;
  }
}

// Helper function to extract user info from JWT token
function extractUserFromToken(token?: string | null): { id: string; username: string } | null {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.id || payload.userId || payload.sub,
      username: payload.username || payload.name || 'User'
    };
  } catch (e) {
    console.error("Error extracting user info from token:", e);
    return null;
  }
}

// Local storage functions
function getLocalPosts(): Post[] {
  try {
    const postsJson = localStorage.getItem(LOCAL_POSTS_KEY);
    return postsJson ? JSON.parse(postsJson) : [];
  } catch (e) {
    console.error("Error reading local posts:", e);
    return [];
  }
}

function saveLocalPost(post: Post): void {
  try {
    const posts = getLocalPosts();
    posts.push(post);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error("Error saving local post:", e);
  }
}

export { getPost, updatePost, deletePost };