import React, { useState, useEffect } from 'react';
import PostItem from './PostItem';
import { useAuth } from '../context/AuthContext';
import { getCommunityPosts } from '../api/compatibility';

interface Post {
  id: string;
  title: string;
  content: string;
  username: string;
  timestamp: string;
  comments: number;
  votes: number;
  privacy?: 'public' | 'private';
}

interface PostListProps {
  communityId?: string | null;
}

export default function PostList({ communityId }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        if (communityId) {
          // Use our compatibility layer instead of direct API call
          const data = await getCommunityPosts(communityId, token);
          
          // Convert the data to our Post interface format
          const formattedPosts = data.map((post: any) => ({
            id: post.id,
            title: post.title || 'Untitled Post',
            content: post.content || '',
            username: post.username || 'Unknown User',
            timestamp: post.created_at || new Date().toISOString(),
            comments: 0, // We'll implement this later
            votes: 0,    // We'll implement this later
          }));
          
          setPosts(formattedPosts);
        } else {
          setPosts([]);
        }
      } catch (error: unknown) {
        console.error('Error fetching posts:', error);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [communityId, token]);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>Error loading posts: {error}</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-600">No posts found</h3>
        <p className="text-gray-500 mt-2">Be the first to create a post in this community!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostItem 
          key={post.id} 
          post={post}
          communityId={communityId}
        />
      ))}
    </div>
  );
}