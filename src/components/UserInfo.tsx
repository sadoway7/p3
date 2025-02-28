import React from 'react'

interface UserData {
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  post_count?: number;
  comment_count?: number;
  upvotes_received?: number;
  downvotes_received?: number;
  upvotes_given?: number;
  downvotes_given?: number;
  communities_joined?: number;
  last_active?: string;
}

interface UserInfoProps {
  username: string;
  userData?: UserData;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
}

export default function UserInfo({ username, userData, isCurrentUser = false, onEditProfile }: UserInfoProps) {
  // Display a default username if none is provided
  const displayName = username || 'anonymous'
  
  return (
    <div className="bg-black text-white p-6 transform rotate-0.5 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Profile Picture Placeholder */}
          <div className="w-16 h-16 bg-gray-800 rounded-none transform -rotate-3 shadow-md border-2 border-teal-400 relative overflow-hidden">
            {/* Placeholder Icon */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          
          <div>
            <h1 className="text-xl font-bold uppercase">{displayName}</h1>
            <p className="text-sm text-gray-400">Member since 2023</p>
          </div>
        </div>
        
        {/* Edit Profile Button - Only shown for current user */}
        {isCurrentUser && onEditProfile && (
          <button 
            onClick={onEditProfile}
            className="px-3 py-2 bg-gray-900 text-white uppercase tracking-wider hover:bg-gray-800 transition-transform transform hover:translate-x-1 border-l-2 border-teal-400 shadow-md text-sm"
          >
            Edit Profile
          </button>
        )}
      </div>
      
      <div className="mt-6 bg-gray-900 p-4 border-l-2 border-pink-400">
        <p className="text-gray-300">
          {userData?.bio || 'No bio yet'}
        </p>
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Posts</span>
          <span className="text-teal-400 font-bold">{userData?.post_count || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Comments</span>
          <span className="text-pink-400 font-bold">{userData?.comment_count || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Communities</span>
          <span className="text-purple-400 font-bold">{userData?.communities_joined || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Upvotes</span>
          <span className="text-teal-400 font-bold">{userData?.upvotes_received || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Downvotes</span>
          <span className="text-pink-400 font-bold">{userData?.downvotes_received || '-'}</span>
        </div>
      </div>
    </div>
  )
}
