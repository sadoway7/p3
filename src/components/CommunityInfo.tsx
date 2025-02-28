import React, { useState, useEffect } from 'react';
import { getCommunityAbout } from '../api/communities';

interface CommunityAbout {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  memberCount: number;
  postCount: number;
  moderators: string[];
  created_at: string;
}

interface Props {
  communityId: string;
}

export default function CommunityInfo({ communityId }: Props) {
  const [community, setCommunity] = useState<CommunityAbout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommunity() {
      try {
        setLoading(true);
        const communityData = await getCommunityAbout(communityId);
        setCommunity(communityData);
      } catch (error: unknown) {
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

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 animate-pulse rounded mb-2"></div>
        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border-red-300">
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h1 className="text-2xl font-bold mb-2">Community Not Found</h1>
        <p className="text-gray-600">The community you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <h1 className="text-2xl font-bold mb-2">r/{community.name}</h1>
      <p className="text-gray-600">{community.description}</p>
      <div className="mt-4 text-sm text-gray-500 flex space-x-4">
        <span>{community.memberCount} members</span>
        <span>{community.postCount} posts</span>
      </div>
      {community.privacy === 'private' && (
        <div className="mt-2 text-sm text-gray-500 bg-gray-100 p-2 rounded">
          This is a private community
        </div>
      )}
    </div>
  );
}
