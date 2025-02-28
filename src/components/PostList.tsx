import React, { useState, useEffect } from 'react';
import PostItem from './PostItem';
import { getPosts } from '../api/posts';
import { useAuth } from '../context/AuthContext';

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
        const data = await getPosts(communityId, token);
        setPosts(data);
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
    return <div>Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
