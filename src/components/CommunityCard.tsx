import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import JoinCommunityButton from './JoinCommunityButton'

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
  const { isAuthenticated } = useAuth();

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
        <JoinCommunityButton 
          communityId={community.id}
          variant="compact"
          className="px-3 py-1 wireframe-border text-sm"
        />
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {community.members} members
      </div>
    </div>
  )
}
