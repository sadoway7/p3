import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserCommunities } from '../api/communities';
import { createPost } from '../api/posts';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
  communityId?: string;
  onSuccess?: (postId: string) => void;
}

interface Community {
  id: string;
  name: string;
}

export default function CreatePostModal({ onClose, communityId, onSuccess }: Props) {
  const [postType, setPostType] = useState(communityId ? 'community' : 'profile'); // 'community' or 'profile'
  const [selectedCommunity, setSelectedCommunity] = useState(communityId || '');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!isAuthenticated || !user) return;
      
      try {
        setLoading(true);
        console.log('Fetching communities user is a member of...');
        const communities = await getUserCommunities(user.id);
        console.log('User communities:', communities);
        
        // Make sure we're getting user's joined communities
        if (Array.isArray(communities)) {
          setUserCommunities(communities);
        } else {
          console.error('Invalid communities data:', communities);
          setError('Failed to load your communities - invalid data format');
        }
      } catch (error) {
        console.error('Failed to fetch communities:', error);
        setError('Failed to load your communities');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated, user, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('You must be logged in to create a post');
      return;
    }
    
    if (postType === 'community' && !selectedCommunity) {
      setError('Please select a community');
      return;
    }
    
    if (!postTitle.trim()) {
      setError('Post title is required');
      return;
    }
    
    if (!postContent.trim()) {
      setError('Post content is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const postData = {
        title: postTitle,
        content: postContent,
        communityId: postType === 'community' ? selectedCommunity : null,
        profile_post: postType === 'profile', // Set profile_post based on post type
      };

      console.log('Creating post with data:', postData);
      const newPost = await createPost(postData, token);
      console.log('New post created:', newPost);
      
      if (onSuccess) {
        onSuccess(newPost.id);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      setError(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Create Post</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setPostType('community')}
              className={`px-4 py-2 wireframe-border ${
                postType === 'community' ? 'bg-gray-100' : ''
              }`}
            >
              Community
            </button>
            <button
              type="button"
              onClick={() => setPostType('profile')}
              className={`px-4 py-2 wireframe-border ${
                postType === 'profile' ? 'bg-gray-100' : ''
              }`}
            >
              Profile
            </button>
          </div>

          {postType === 'community' && (
            <div>
              <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-1">
                Community
              </label>
              <select
                id="community"
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
                disabled={isSubmitting || loading}
              >
                <option value="">Select a community</option>
                {userCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    r/{community.name}
                  </option>
                ))}
              </select>
              {loading && (
                <p className="text-sm text-gray-500 mt-1">Loading your communities...</p>
              )}
            </div>
          )}
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Post title"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="What's on your mind?"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}