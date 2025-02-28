import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CommunityModControls from './CommunityModControls';
import { getCommunityMember } from '../api/communities';
import JoinCommunityButton from './JoinCommunityButton';

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
      // Use the imported getCommunityMember function
      console.log(`Checking membership for user ${user.id} in community ${communityId}`);
      const member = await getCommunityMember(communityId, user.id, token);
      
      if (member) {
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
  
  // These functions are now handled by the JoinCommunityButton component
  
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
          <JoinCommunityButton 
            communityId={communityId}
            variant="sidebar"
            onJoin={onJoin}
            onLeave={onLeave}
          />
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