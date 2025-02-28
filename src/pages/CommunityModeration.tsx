import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ModeratorDashboard from '../components/ModeratorDashboard';
import { isUserModerator } from '../api/moderation';
import { getCommunity, getPendingJoinRequests, approveJoinRequest, rejectJoinRequest } from '../api/communities';

interface JoinRequest {
  id: string;
  user_id: string;
  community_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  updated_at: string;
  username?: string;
}

const CommunityModeration: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState<boolean>(false);
  const [community, setCommunity] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState<boolean>(false);
  const [processingRequestIds, setProcessingRequestIds] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // If not logged in, redirect to login
    if (!user || !token) {
      navigate('/login', { state: { from: `/community/${communityId}/moderation` } });
      return;
    }
    
    // Check if user is a moderator
    checkModeratorStatus();
    loadCommunity();
    
    // If on join-requests tab, load the join requests
    if (activeTab === 'join-requests') {
      loadJoinRequests();
    }
  }, [communityId, user, token, activeTab]);
  
  const checkModeratorStatus = async () => {
    if (!communityId || !user || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if user is a moderator
      const result = await fetch(`http://localhost:3001/api/communities/${communityId}/members/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (result.ok) {
        const member = await result.json();
        setIsModerator(member.role === 'moderator' || member.role === 'admin');
      } else {
        setIsModerator(false);
      }
    } catch (err) {
      console.error('Error checking moderator status:', err);
      setError('Failed to check moderator status.');
      setIsModerator(false);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCommunity = async () => {
    if (!communityId) return;
    
    try {
      const communityData = await getCommunity(communityId);
      setCommunity(communityData);
    } catch (err) {
      console.error('Error loading community:', err);
      setError('Failed to load community information.');
    }
  };
  
  const loadJoinRequests = async () => {
    if (!communityId || !token) return;
    
    try {
      setJoinRequestsLoading(true);
      const requests = await getPendingJoinRequests(communityId, token);
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    } finally {
      setJoinRequestsLoading(false);
    }
  };
  
  const handleApproveJoinRequest = async (requestId: string) => {
    if (!communityId || !token) return;
    
    try {
      // Mark this request as processing
      setProcessingRequestIds(prev => ({ ...prev, [requestId]: true }));
      
      await approveJoinRequest(communityId, requestId, token);
      
      // Remove this request from the list
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error approving join request:', error);
      alert('Failed to approve join request');
    } finally {
      // Clear the processing state
      setProcessingRequestIds(prev => ({ ...prev, [requestId]: false }));
    }
  };
  
  const handleRejectJoinRequest = async (requestId: string) => {
    if (!communityId || !token) return;
    
    try {
      // Mark this request as processing
      setProcessingRequestIds(prev => ({ ...prev, [requestId]: true }));
      
      await rejectJoinRequest(communityId, requestId, token);
      
      // Remove this request from the list
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error rejecting join request:', error);
      alert('Failed to reject join request');
    } finally {
      // Clear the processing state
      setProcessingRequestIds(prev => ({ ...prev, [requestId]: false }));
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }
  
  if (!isModerator) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          You do not have permission to access the moderation dashboard for this community.
        </div>
        <div className="mt-4">
          <button 
            className="text-blue-500 hover:text-blue-700"
            onClick={() => navigate(`/community/${communityId}`)}
          >
            Return to Community
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      {community && (
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">Moderating r/{community.name}</h1>
          <button 
            className="text-blue-500 hover:text-blue-700 mb-4"
            onClick={() => navigate(`/community/${communityId}`)}
          >
            Return to Community
          </button>
          
          {/* Tabs */}
          <div className="flex border-b mb-6">
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => navigate(`/community/${communityId}/moderation?tab=dashboard`)}
            >
              Dashboard
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => navigate(`/community/${communityId}/moderation?tab=queue`)}
            >
              Content Queue
            </button>
            <button 
              className={`px-4 py-2 font-medium ${activeTab === 'join-requests' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
              onClick={() => {
                navigate(`/community/${communityId}/moderation?tab=join-requests`);
                loadJoinRequests();
              }}
            >
              Join Requests
            </button>
          </div>
        </div>
      )}
      
      {/* Content based on active tab */}
      {activeTab === 'join-requests' ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Join Requests</h2>
          
          {joinRequestsLoading ? (
            <p className="text-gray-600">Loading join requests...</p>
          ) : joinRequests.length === 0 ? (
            <p className="text-gray-600">No pending join requests</p>
          ) : (
            <div className="space-y-4">
              {joinRequests.map(request => (
                <div key={request.id} className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">
                        {request.username || `User ${request.user_id.substring(0, 8)}...`}
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className={`px-4 py-1 rounded bg-green-500 text-white hover:bg-green-600 ${
                          processingRequestIds[request.id] ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleApproveJoinRequest(request.id)}
                        disabled={processingRequestIds[request.id]}
                      >
                        {processingRequestIds[request.id] ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        className={`px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600 ${
                          processingRequestIds[request.id] ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleRejectJoinRequest(request.id)}
                        disabled={processingRequestIds[request.id]}
                      >
                        {processingRequestIds[request.id] ? 'Processing...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // For other tabs, use the existing ModeratorDashboard component
        communityId && <ModeratorDashboard communityId={communityId} />
      )}
    </div>
  );
};

export default CommunityModeration;