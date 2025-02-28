import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { joinCommunity } from '../api/communities'

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description: string;
    members?: number;
    privacy?: 'public' | 'private';
  };
}

export default function CommunityCard({ community }: CommunityCardProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [isJoining, setIsJoining] = React.useState(false);
  
  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to community page
    
    if (!isAuthenticated) {
      alert('Please log in to join this community');
      return;
    }
    
    try {
      setIsJoining(true);
      await joinCommunity(community.id, token);
      alert('Successfully joined community!');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('invite-only')) {
          alert('This community is invite-only');
        } else if (error.message.includes('approval')) {
          alert('Join request submitted for approval');
        } else {
          alert(`Error: ${error.message}`);
        }
      } else {
        alert('An error occurred');
      }
      console.error('Join error:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="wireframe-border p-4 bg-white wireframe-shadow">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/community/${community.id}`}
            className="font-medium text-gray-900 hover:underline"
          >
            {community.name}
          </Link>
          <p className="text-sm text-gray-600 mt-1">{community.description}</p>
        </div>
        <button 
          className={`px-3 py-1 wireframe-border text-sm ${isJoining ? 'bg-gray-200' : ''}`}
          onClick={handleJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining...' : 'Join'}
        </button>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {community.members} members
      </div>
    </div>
  )
}
