import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCommunityDetails } from '../api/compatibility';
import { getCommunityMember } from '../api/communities';
import JoinCommunityButton from './JoinCommunityButton';
import CommunitySettingsModal from './CommunitySettingsModal';
import { Cog, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const [isModerator, setIsModerator] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
        // Use our compatibility layer to get community details
        const communityData = await getCommunityDetails(communityId, token);
        
        // If we got data, construct a CommunityAbout object
        if (communityData) {
          // Get demo stats until backend is updated
          const stats = getDemoStats(communityData);
          
          setCommunity({
            ...communityData,
            memberCount: stats.memberCount,
            postCount: stats.postCount,
          });
          
          // Check if the user is a member and their role
          if (isAuthenticated && user && user.id) {
            // Check if user is admin (platform-wide)
            if (user.role === 'admin') {
              setIsMember(true);
              setIsModerator(true);
            } else {
              try {
                const memberInfo = await getCommunityMember(communityId, user.id, token);
                setIsMember(!!memberInfo);
                
                if (memberInfo) {
                  setIsModerator(memberInfo.role === 'moderator' || memberInfo.role === 'admin');
                }
              } catch (error) {
                console.error("Error checking community membership:", error);
                setIsMember(false);
                setIsModerator(false);
              }
            }
          }
        } else {
          setError('Community not found');
        }
      } catch (err: any) {
        console.error("Error fetching community:", err);
        setError(err.message || 'Failed to fetch community');
      } finally {
        setLoading(false);
      }
    }

    if (communityId) {
      fetchCommunity();
    }
  }, [communityId, user, token, isAuthenticated]);

  // Join and leave functionality is now handled by the JoinCommunityButton component

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 p-8 rounded-md text-center">
        <div className="h-6 bg-gray-300 w-1/3 mx-auto mb-4 rounded"></div>
        <div className="h-4 bg-gray-300 w-2/3 mx-auto rounded"></div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="text-center p-8 bg-red-50 text-red-500 rounded-md">
        <h2 className="text-xl font-bold">Error</h2>
        <p>{error || 'Community not found'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-md shadow mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{community.name}</h1>
            <p className="text-gray-600 mt-2">{community.description}</p>
            
            <div className="flex mt-4 text-sm text-gray-500 space-x-4">
              <div>
                <span className="font-medium">{community.memberCount}</span> members
              </div>
              <div>
                <span className="font-medium">{community.postCount}</span> posts
              </div>
              <div>
                Created {new Date(community.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isModerator && (
              <>
                <button
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Cog className="w-4 h-4 mr-1" />
                  Settings
                </button>
                
                <Link
                  to={`/community/${communityId}/moderation`}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Moderation
                </Link>
              </>
            )}
            
            <JoinCommunityButton
              communityId={community.id}
              className={`px-4 py-2 rounded-md`}
              onJoin={() => setIsMember(true)}
              onLeave={() => setIsMember(false)}
            />
          </div>
        </div>
      </div>
      
      {showSettingsModal && (
        <CommunitySettingsModal
          communityId={communityId}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}