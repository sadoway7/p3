import React, { useState, useEffect } from 'react';
import { getCommunity, getCommunityMembers } from "../api/communities";

interface CommunityInfo {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at?: string;
}

interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  username?: string;
}

interface Props {
  communityId: string;
}

export default function CommunityAbout({ communityId }: Props) {
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [moderators, setModerators] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch both community info and member data in parallel
        const [communityData, membersData] = await Promise.all([
          getCommunity(communityId),
          getCommunityMembers(communityId).catch(() => []) // Use empty array if this fails
        ]);
        
        if (communityData) {
          setCommunity(communityData);
          
          // Calculate member count from the members data
          if (Array.isArray(membersData)) {
            setMemberCount(membersData.length);
            
            // Filter the members data to find moderators and admins
            console.log('Raw members data:', membersData);
            
            const moderatorsList = membersData.filter(member => 
              member.role === 'moderator' || member.role === 'admin'
            );
            
            console.log('Filtered moderators:', moderatorsList);
            
            // Set the moderators state with the filtered data
            setModerators(moderatorsList);
          }
        } else {
          setError('Community not found');
        }
      } catch (error: unknown) {
        console.error("Error fetching community data:", error);
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
      fetchData();
    }
  }, [communityId]);

  if (loading) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">About</h2>
        <div className="text-sm text-gray-600">
          <p>Loading community information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">About</h2>
        <div className="text-sm text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">About</h2>
        <div className="text-sm text-gray-600">
          <p>Community not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h2 className="font-medium mb-2">About</h2>
      <div className="text-sm text-gray-600 space-y-2">
        <p>Created: {new Date(community.created_at).toLocaleDateString()}</p>
        <p>Members: {memberCount}</p>
        
        {moderators.length > 0 && (
          <div>
            <p className="font-medium">Moderators:</p>
            <ul className="list-disc list-inside ml-2">
              {moderators.map(mod => (
                <li key={mod.user_id} className="text-blue-600 font-medium">
                  {/* Display username if available, otherwise show user_id */}
                  {mod.username || `User ${mod.user_id.substring(0, 8)}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div>
          <p className="font-medium">Description:</p>
          <p>{community.description}</p>
        </div>
        
        <p>Privacy: {community.privacy === 'public' ? 'Public' : 'Private'}</p>
      </div>
    </div>
  );
}
