import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingModQueue } from '../api/moderation';
import { getPendingJoinRequests } from '../api/communities';

interface CommunityModControlsProps {
  communityId: string;
}

const CommunityModControls: React.FC<CommunityModControlsProps> = ({ communityId }) => {
  const { token } = useAuth();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingJoinCount, setPendingJoinCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    if (!token) return;
    loadPendingCounts();
  }, [communityId, token]);
  
  const loadPendingCounts = async () => {
    try {
      setLoading(true);
      
      // Load both pending post moderation and join requests in parallel
      const [pendingPosts, joinRequests] = await Promise.all([
        getPendingModQueue(communityId, token).catch(() => []),
        getPendingJoinRequests(communityId, token).catch(() => [])
      ]);
      
      setPendingCount(pendingPosts.length);
      setPendingJoinCount(joinRequests.length);
    } catch (err) {
      console.error('Error loading pending counts:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Moderator Tools</h3>
      
      <div className="space-y-2">
        <Link
          to={`/community/${communityId}/moderation`}
          className="block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-center"
        >
          Moderator Dashboard
        </Link>
        
        {pendingCount > 0 && (
          <Link
            to={`/community/${communityId}/moderation?tab=queue`}
            className="flex items-center justify-between bg-orange-100 hover:bg-orange-200 text-orange-800 py-2 px-4 rounded"
          >
            <span>Posts Pending Approval</span>
            <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {pendingCount}
            </span>
          </Link>
        )}
        
        {pendingJoinCount > 0 && (
          <Link
            to={`/community/${communityId}/moderation?tab=join-requests`}
            className="flex items-center justify-between bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded"
          >
            <span>Join Requests</span>
            <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
              {pendingJoinCount}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default CommunityModControls;