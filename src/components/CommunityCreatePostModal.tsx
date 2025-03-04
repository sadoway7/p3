import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts';
import { getCommunity } from '../api/communities';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
    communityId: string;
    communityName?: string;
    onSuccess?: (postId: string) => void;
    isMember?: boolean;
}

export default function CommunityCreatePostModal({ onClose, communityId, communityName: propCommunityName, onSuccess, isMember }: Props) {
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState<string | undefined>(propCommunityName);
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  // Fetch community data if communityName is not provided
  useEffect(() => {
    if (!propCommunityName && communityId) {
      const fetchCommunity = async () => {
        try {
          const community = await getCommunity(communityId);
          if (community) {
            setCommunityName(community.name);
          }
        } catch (error) {
          // Silently handle error - we'll just use the communityId
        }
      };
      
      fetchCommunity();
    }
  }, [communityId, propCommunityName]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('You must be logged in to create a post');
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
      // Prepare post data - let the API handle ID generation
      const postData = {
        title: postTitle,
        content: postContent,
        communityId: communityId,
        profile_post: false
      };

      const newPost = await createPost(postData, token);
      
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
          <h2 className="text-lg font-medium">
            Create Post {communityName && `in r/${communityName}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {!isMember ? (
          <div className="p-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
              <h3 className="font-bold mb-2">Membership Required</h3>
              <p>You need to join this community before you can create posts.</p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
        )}
      </div>
    </div>
  );
}