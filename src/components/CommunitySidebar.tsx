import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommunityModControls from './CommunityModControls';

interface CommunitySidebarProps {
  communityId: string;
  communityName: string;
  description: string;
  memberCount: number;
  onJoin?: () => void;
  onLeave?: () => void;
}

const CommunitySidebar: React.FC<CommunitySidebarProps> = ({
  communityId,
  communityName,
  description,
  memberCount,
  onJoin,
  onLeave
}) => {
  const { user, token } = useAuth();
  const [isMember, setIsMember] = useState<boolean>(false);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    if (user && token) {
      checkMembershipStatus();
    }
  }, [user, token, communityId]);
  
  const checkMembershipStatus = async () => {
    if (!user || !token) return;
    
    setLoading(true);
    
    try {
      // Check if user is a member of the community
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      console.log(`Checking membership for user ${user.id} in community ${communityId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const member = await response.json();
        console.log("Membership found:", member);
        setIsMember(true);
        setIsModerator(member.role === 'moderator' || member.role === 'admin');
      } else {
        console.log("User is not a member of this community");
        setIsMember(false);
        setIsModerator(false);
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinCommunity = async () => {
    if (!user || !token) {
      alert('You must be logged in to join communities');
      return;
    }
    
    setLoading(true);
    
    try {
      // Use the imported joinCommunity function from communities API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      console.log(`Attempting to join community ${communityId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to join community');
      }
      
      const result = await response.json();
      console.log('Join response:', result);
      
      // Check the membership status to update state correctly
      await checkMembershipStatus();
      
      if (onJoin) onJoin();
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Failed to join community. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLeaveCommunity = async () => {
    if (!user || !token) return;
    
    if (!confirm('Are you sure you want to leave this community?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Fix: Use the correct endpoint for leaving a community (without userId)
      const API_BASE_URL = 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/communities/${communityId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to leave community');
      }
      
      setIsMember(false);
      setIsModerator(false);
      if (onLeave) onLeave();
    } catch (error) {
      console.error('Error leaving community:', error);
      alert('Failed to leave community. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-2">About r/{communityName}</h2>
        <p className="text-gray-700 mb-4">{description}</p>
        <div className="mb-4">
          <div className="font-medium">Members</div>
          <div className="text-gray-700">{memberCount}</div>
        </div>
        <div className="flex">
          {!user ? (
            <button 
              onClick={() => alert('You must be logged in to join communities')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Join
            </button>
          ) : !isMember ? (
            <button 
              onClick={handleJoinCommunity}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          ) : (
            <button 
              onClick={handleLeaveCommunity}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              disabled={loading}
            >
              {loading ? 'Leaving...' : 'Leave'}
            </button>
          )}
        </div>
      </div>
      
      {isMember && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">Community Actions</h3>
          <Link
            to={`/c/${communityId}/submit`}
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mb-2"
          >
            Create Post
          </Link>
        </div>
      )}
      
      {isModerator && <CommunityModControls communityId={communityId} />}
    </div>
  );
};

export default CommunitySidebar;