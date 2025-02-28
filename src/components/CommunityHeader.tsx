import React, { useState, useEffect } from 'react';
import { getCommunity } from '../api/communities';
import { useAuth } from '../context/AuthContext';

interface CommunityAbout {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  memberCount?: number;
  postCount?: number;
  moderators?: string[];
  created_at: string;
}

interface Props {
  communityId: string;
}

export default function CommunityHeader({ communityId }: Props) {
  const [community, setCommunity] = useState<CommunityAbout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const { user, token, isAuthenticated } = useAuth();

  // For demo purposes - hardcoded counts until backend is updated
  const getDemoStats = (community: any) => {
    // Generate pseudo-random but consistent numbers based on community ID
    const hash = community.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const memberCount = 10 + (hash % 990); // Between 10-1000 members
    const postCount = 5 + (hash % 195);   // Between 5-200 posts
    
    return {
      memberCount,
      postCount
    };
  };

  useEffect(() => {
    async function fetchCommunity() {
      try {
        setLoading(true);
        // Use the simpler getCommunity function which is more reliable
        const communityData = await getCommunity(communityId);
        
        // If we got data, construct a CommunityAbout object
        if (communityData) {
          // Get demo stats until backend is updated
          const { memberCount, postCount } = getDemoStats(communityData);
          
          const formattedData: CommunityAbout = {
            id: communityData.id,
            name: communityData.name || 'Community',
            description: communityData.description || 'No description available',
            privacy: communityData.privacy || 'public',
            memberCount: memberCount, // Use demo stats
            postCount: postCount,     // Use demo stats
            moderators: communityData.moderators || [],
            created_at: communityData.created_at || new Date().toISOString()
          };
          setCommunity(formattedData);
        } else {
          setError('Community not found');
        }
      } catch (error: unknown) {
        console.error("Error fetching community:", error);
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    }

    if (communityId) {
      fetchCommunity();
    }
  }, [communityId]);

  // Check if user is a member when user or community changes
  useEffect(() => {
    if (isAuthenticated && user && community) {
      console.log("Checking membership for user", user.id, "in community", community.id);
      
      // If user is a moderator, they're a member
      if (community.moderators && community.moderators.includes(user.id)) {
        console.log("User is a moderator, setting as member");
        setIsMember(true);
        return;
      }

      // Check if the user is a member
      const checkMembership = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
          console.log("Checking membership via API:", `${API_BASE_URL}/api/communities/${community.id}/members/${user.id}`);
          
          const response = await fetch(
            `${API_BASE_URL}/api/communities/${community.id}/members/${user.id}`, 
            {
              headers: { 
                'Authorization': `Bearer ${token}` 
              }
            }
          );
          
          console.log("Membership response:", response.status, response.statusText);
          
          if (response.ok) {
            console.log("User is a member");
            setIsMember(true);
          } else {
            console.log("User is NOT a member");
            setIsMember(false);
          }
        } catch (error) {
          console.error("Error checking membership:", error);
          setIsMember(false);
        }
      };
      
      checkMembership();
    }
  }, [isAuthenticated, user, community, token, communityId]);

  const handleJoin = async () => {
    if (!isAuthenticated || !token || !community) return;
    
    try {
      setJoinLoading(true);
      console.log("Joining community:", community.id);
      
      // Call the join API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      console.log("POST request to:", `${API_BASE_URL}/api/communities/${community.id}/members`);
      
      const response = await fetch(`${API_BASE_URL}/api/communities/${community.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Join response:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log("Join error data:", errorData);
        
        // Handle different response types
        if (response.status === 403 && errorData.error && errorData.error.includes('invite-only')) {
          alert('This community is invite-only. You cannot join without an invitation.');
          throw new Error('Invite-only community');
        } else if (response.status === 202) {
          alert('Your join request has been submitted and awaiting moderator approval.');
          throw new Error('Requires approval');
        } else {
          alert(`Error: ${errorData.error || 'Failed to join community'}`);
          throw new Error(errorData.error || 'Failed to join community');
        }
      }
      
      // If we got here, the join was successful
      console.log("Join successful, setting as member");
      setIsMember(true);
      
      // Increment member count locally
      setCommunity({
        ...community,
        memberCount: (community.memberCount || 0) + 1
      });
      
      // Force a refresh of the membership status
      setTimeout(() => {
        const checkMembership = async () => {
          try {
            const memberResponse = await fetch(
              `${API_BASE_URL}/api/communities/${community.id}/members/${user.id}`, 
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            console.log("Member check after join:", memberResponse.status);
            if (memberResponse.ok) {
              setIsMember(true);
            }
          } catch (error) {
            console.error("Error in post-join membership check:", error);
          }
        };
        
        checkMembership();
      }, 500);
      
    } catch (error) {
      console.error("Error joining community:", error);
      // The error alerts are handled in the try block
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!isAuthenticated || !token || !community) return;
    
    try {
      setJoinLoading(true);
      console.log("Leaving community:", community.id);
      
      // Call the leave API - note the URL change to match the new leave endpoint
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      console.log("DELETE request to:", `${API_BASE_URL}/api/communities/${community.id}/members`);
      
      const response = await fetch(`${API_BASE_URL}/api/communities/${community.id}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Leave response:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || 'Failed to leave community'}`);
        throw new Error(errorData.error || 'Failed to leave community');
      }
      
      // If we got here, the leave was successful
      console.log("Successfully left community");
      setIsMember(false);
      
      // Decrement member count locally
      if (community.memberCount && community.memberCount > 0) {
        setCommunity({
          ...community,
          memberCount: community.memberCount - 1
        });
      }
      
      // Force a refresh of the membership status
      setTimeout(() => {
        const checkMembership = async () => {
          try {
            const memberResponse = await fetch(
              `${API_BASE_URL}/api/communities/${community.id}/members/${user.id}`, 
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            console.log("Member check after leave:", memberResponse.status);
            if (!memberResponse.ok) {
              setIsMember(false);
            }
          } catch (error) {
            console.error("Error in post-leave membership check:", error);
          }
        };
        
        checkMembership();
      }, 500);
      
    } catch (error) {
      console.error("Error leaving community:", error);
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-black text-white p-4 relative shadow-md font-mono">
        <div className="h-8 w-64 bg-gray-800 animate-pulse mb-3"></div>
        <div className="h-4 w-full bg-gray-800 animate-pulse mb-3"></div>
        <div className="h-4 w-48 bg-gray-800 animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black text-white p-4 relative shadow-md font-mono">
        <h1 className="text-xl font-bold mb-2 uppercase">ERROR</h1>
        <p className="text-pink-400 border-l-4 border-pink-400 pl-2">{error}</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="bg-black text-white p-4 relative shadow-md font-mono">
        <h1 className="text-xl font-bold mb-2 uppercase">NOT FOUND</h1>
        <p className="text-gray-300 border-l-4 border-purple-400 pl-2">
          Community not found or removed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white p-4 relative shadow-md font-mono flex flex-col sm:flex-row sm:items-center justify-between mb-0">
      {/* Community Info */}
      <div className="flex-grow">
        <h1 className="text-2xl font-bold uppercase tracking-tight relative inline-block">
          r/{community.name}
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></span>
        </h1>
        
        <p className="text-gray-300 mt-2 text-sm border-l-4 border-teal-400 pl-2">
          {community.description}
        </p>
        
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="bg-gray-800 px-2 py-1">
            <span className="text-teal-400 font-bold">{community.memberCount || 0}</span> members
          </div>
          <div className="bg-gray-800 px-2 py-1">
            <span className="text-pink-400 font-bold">{community.postCount || 0}</span> posts
          </div>
          <div className="bg-gray-800 px-2 py-1">
            Since <span className="text-purple-400">{new Date(community.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {/* Join Button */}
      <div className="mt-4 sm:mt-0 sm:ml-4">
        {isAuthenticated ? (
          <button
            onClick={isMember ? handleLeave : handleJoin}
            disabled={joinLoading}
            className={`px-5 py-2 font-bold text-white text-sm transition-colors ${
              joinLoading ? 'bg-gray-500 cursor-not-allowed' :
              isMember 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-teal-500 hover:bg-teal-600'
            } transform hover:scale-105 transition-transform`}
          >
            {joinLoading ? 'Processing...' : (isMember ? 'Leave' : 'Join')}
          </button>
        ) : (
          <button
            onClick={() => alert('Please log in to join this community')}
            className="px-5 py-2 font-bold text-white text-sm bg-gray-600 hover:bg-gray-700 transition-colors"
          >
            Login to Join
          </button>
        )}
      </div>
      
      {/* Private Community Notice */}
      {community.privacy === 'private' && (
        <div className="mt-3 w-full bg-gray-800 p-2 border-l-4 border-pink-400 text-xs">
          <span className="text-pink-400 font-bold uppercase">Private Community</span>
          <p className="text-gray-300">Join to view posts.</p>
        </div>
      )}
    </div>
  );
}
