import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEnhancedCommunitySettings } from '../api/moderation';

interface PostCreationFormProps {
  communityId: string;
  onPostCreated?: () => void;
}

const PostCreationForm: React.FC<PostCreationFormProps> = ({ communityId, onPostCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if community requires post approval
    const checkCommunitySettings = async () => {
      if (!token) return;
      
      try {
        const settings = await getEnhancedCommunitySettings(communityId, token);
        setRequiresApproval(settings.require_post_approval);
      } catch (err) {
        console.error('Error fetching community settings:', err);
      }
    };
    
    checkCommunitySettings();
  }, [communityId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    
    if (!user || !token) {
      setError('You must be logged in to create a post');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE_URL = 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          communityId
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create post');
      }
      
      const newPost = await response.json();
      
      // Clear form
      setTitle('');
      setContent('');
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }
      
      // Check if post is pending approval
      if (newPost.pending_approval) {
        alert('Your post has been submitted and is pending moderator approval.');
        navigate(`/c/${communityId}`);
      } else {
        // Navigate to the new post
        navigate(`/posts/${newPost.id}`);
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Create a Post</h2>
      
      {requiresApproval && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">Note:</p>
          <p>Posts in this community require moderator approval before they are visible to other users.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 font-medium mb-2">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Give your post a title"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="content" className="block text-gray-700 font-medium mb-2">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={6}
            placeholder="What do you want to share?"
            required
          ></textarea>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostCreationForm;