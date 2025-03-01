import React, { useState, useEffect } from 'react';
import PostItem from './PostItem';
import { useAuth } from '../context/AuthContext';
import { getCommunityPosts } from '../api/compatibility';
import { getPosts } from '../api/posts-fix';
import { getCommentCount } from '../api/comments';

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
  postType?: 'trending' | 'all' | 'following';
  maxPosts?: number;
  compact?: boolean;
}

export default function PostList({ communityId, postType = 'all', maxPosts, compact = false }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        let data;
        if (communityId) {
          // Use our compatibility layer for community-specific posts
          data = await getCommunityPosts(communityId, token);
        } else {
          // Use the posts API directly for all posts based on the post type
          const params: Record<string, string> = {};
          
          if (postType === 'trending') {
            params.sort = 'trending';
          } else if (postType === 'all') {
            params.sort = 'new';
          } else if (postType === 'following') {
            params.following = 'true';
          }
          
          data = await getPosts(null, token);
          
          // Sort the posts based on post type if the API doesn't support it yet
          if (postType === 'trending' && data.length > 0) {
            // Sort by highest vote count as a proxy for trending
            data.sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
          } else if (postType === 'all' && data.length > 0) {
            // Sort by creation date, newest first
            data.sort((a: any, b: any) => {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
          }
          // For 'following', we would filter for posts from communities the user follows
          // This would typically be handled by the API, but we've left it as-is for now
        }
        
        // Convert the data to our Post interface format
        const formattedPosts = data.map((post: any) => ({
          id: post.id,
          title: post.title || 'Untitled Post',
          content: post.content || '',
          username: post.username || 'Unknown User',
          timestamp: post.created_at || new Date().toISOString(),
          comments: post.comments_count || 0, // Use the comments_count property if available
          votes: post.votes_count || post.vote_count || 0, // Use any available vote count property
          community_id: post.community_id || null,
          community_name: post.community_name || post.community || null
        }));
        
        // For each post, try to fetch the comment count if it's not already included
        const postsWithComments = await Promise.all(
          formattedPosts.map(async (post) => {
            // If comments is already set to a non-zero value, keep it
            if (post.comments > 0) {
              return post;
            }
            
            try {
              // Otherwise try to fetch the comment count
              const count = await getCommentCount(post.id);
              return { ...post, comments: count };
            } catch (err) {
              // If fetching fails, keep the original count
              return post;
            }
          })
        );
        
        setPosts(postsWithComments);
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
  }, [communityId, token, postType]);

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
        <p className="text-gray-500 mt-2">
          {communityId 
            ? "Be the first to create a post in this community!" 
            : "No posts available. Try creating a new post or joining communities."}
        </p>
      </div>
    );
  }

  // Apply maxPosts limit if provided
  const displayPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-4'}`}>
      {displayPosts.map(post => (
        <PostItem 
          key={post.id} 
          post={post}
          communityId={communityId}
          compact={compact}
        />
      ))}
    </div>
  );
}