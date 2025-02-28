import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import CommunityHeader from '../components/CommunityHeader'
import PostList from '../components/PostList'
import CommunityRules from '../components/CommunityRules'
import CommunityAbout from '../components/CommunityAbout'
import CommunitySettings from '../components/CommunitySettings'
import ActivityHistory from '../components/ActivityHistory'
import CreatePostModal from '../components/CreatePostModal'
import { useAuth } from '../context/AuthContext'
import ModeratorDebug from '../debug/ModeratorDebug'

export default function Community() {
  const { id } = useParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { isAuthenticated } = useAuth()

  const handlePostCreated = () => {
    // Refresh the page or update the post list
    window.location.reload()
  }

  return (
    <div className="w-full max-w-[98%] xl:max-w-[1800px] mx-auto px-2 py-8 font-mono">
      <CommunityHeader communityId={id || ''} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-2">
        <div className="lg:col-span-3">
          {/* Create Post Button - Anti-design style with color accents */}
          {isAuthenticated && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-6 bg-black text-white mb-8 hover:bg-gray-900 flex items-center justify-center transform hover:skew-y-1 transition-transform shadow-lg relative overflow-hidden group"
            >
              <span className="font-bold text-xl uppercase tracking-widest relative z-10">
                + CREATE <span className="text-teal-400">POST</span>
              </span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 transform translate-x-0 group-hover:translate-y-1 transition-transform"></span>
            </button>
          )}
          
          {/* Latest Posts - Anti-design style with color accents */}
          <div className="bg-gray-100 p-8 mb-8 relative transform -rotate-0.5 shadow-lg">
            <div className="absolute -top-6 left-8 bg-black text-white px-4 py-1 transform rotate-2 shadow-md">
              <span className="text-purple-400">COMMUNITY</span> POSTS
            </div>
            <PostList communityId={id} />
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-8">
          {/* Community Info Sections - Anti-design style with color accents */}
          <div className="bg-gray-100 p-6 transform rotate-0.5 shadow-md">
            <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
              About
              <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-400"></span>
            </h2>
            <CommunityAbout communityId={id || ''} />
          </div>
          
          <div className="bg-gray-100 p-6 transform -rotate-0.5 shadow-md">
            <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
              Rules
              <span className="absolute bottom-0 left-0 w-full h-1 bg-pink-400"></span>
            </h2>
            <CommunityRules communityId={id || ''} />
          </div>
          
          <div className="bg-gray-100 p-6 transform rotate-0.5 shadow-md">
            <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
              Settings
              <span className="absolute bottom-0 left-0 w-full h-1 bg-purple-400"></span>
            </h2>
            <CommunitySettings communityId={id || ''} />
          </div>
          
          <div className="bg-gray-100 p-6 transform -rotate-0.5 shadow-md">
            <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
              Activity
              <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-400"></span>
            </h2>
            <div className="max-h-[400px] overflow-y-auto">
              <ActivityHistory communityId={id || ''} limit={10} />
            </div>
          </div>
          
          {/* Debug component - remove when not needed */}
          <ModeratorDebug communityId={id || ''} />
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)} 
          communityId={id}
          onSuccess={handlePostCreated}
        />
      )}
    </div>
  )
}
