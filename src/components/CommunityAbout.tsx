import React, { useState, useEffect } from 'react';
import { getCommunityAbout } from "../api/communities";

interface CommunityAboutInfo {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at?: string;
  moderators: {
    community_id: string;
    user_id: string;
    role: 'moderator' | 'admin';
    username: string;
    joined_at: string;
  }[];
  memberCount: number;
  postCount: number;
  creationDateFormatted: string;
}

interface Props {
  communityId: string;
}

export default function CommunityAbout({ communityId }: Props) {
  const [communityAbout, setCommunityAbout] = useState<CommunityAboutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Use the more efficient getCommunityAbout endpoint
        const communityData = await getCommunityAbout(communityId);
        
        if (communityData) {
          setCommunityAbout(communityData);
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

  if (!communityAbout) {
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
        <p>Created: {communityAbout.creationDateFormatted}</p>
        <p>Members: {communityAbout.memberCount}</p>
        <p>Posts: {communityAbout.postCount}</p>
        
        {communityAbout.moderators && communityAbout.moderators.length > 0 && (
          <div>
            <p className="font-medium">Moderators:</p>
            <ul className="list-disc list-inside ml-2">
              {communityAbout.moderators.map(mod => (
                <li key={mod.user_id} className="text-blue-600 font-medium">
                  {mod.username || `User ${mod.user_id.substring(0, 8)}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div>
          <p className="font-medium">Description:</p>
          <p>{communityAbout.description}</p>
        </div>
        
        <p>Privacy: {communityAbout.privacy === 'public' ? 'Public' : 'Private'}</p>
      </div>
    </div>
  );
}
