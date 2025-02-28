import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PostList from '../components/PostList'
import Sidebar from '../components/Sidebar'
import CreatePostModal from '../components/CreatePostModal'
import CommunityDiscovery from '../components/CommunityDiscovery'
import { useAuth } from '../context/AuthContext'
import { getCommunities } from '../api/communities'

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [trendingCommunities, setTrendingCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    const fetchTrendingCommunities = async () => {
      try {
        setLoading(true)
        const communities = await getCommunities()
        // For now, just use the first few communities as "trending"
        setTrendingCommunities(communities.slice(0, 3))
      } catch (error) {
        console.error('Failed to fetch trending communities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingCommunities()
  }, [])

  return (
    <div className="w-full max-w-[98%] xl:max-w-[1800px] mx-auto px-2 font-mono">
      {/* Welcome Banner - Anti-design style with color accents */}
      <div className="bg-black text-white p-8 mb-12 relative transform -rotate-1 shadow-lg">
        <div className="absolute top-0 right-0 bg-white text-black px-4 py-1 text-xl uppercase tracking-widest transform rotate-3 shadow-md">
          <span className="text-teal-500">R</span>
          <span>U</span>
          <span className="text-pink-500">M</span>
          <span>F</span>
          <span className="text-purple-500">O</span>
          <span>R</span>
        </div>
        <h1 className="text-5xl font-bold mb-6 mt-4 uppercase tracking-tight">
          <span className="relative">
            W<span className="absolute -top-1 -right-1 text-teal-400 opacity-50">W</span>
          </span>
          <span>E</span>
          <span className="relative">
            L<span className="absolute -top-1 -right-1 text-pink-400 opacity-50">L</span>
          </span>
          <span>C</span>
          <span className="relative">
            O<span className="absolute -top-1 -right-1 text-purple-400 opacity-50">O</span>
          </span>
          <span>M</span>
          <span>E</span>
        </h1>
        <p className="text-white mb-8 text-lg ml-12 border-l-4 border-teal-400 pl-4">
          Join communities. Share ideas. Be yourself.
        </p>
        {isAuthenticated && (
          <p className="text-white text-xl bg-gray-800 p-4 transform -rotate-1 shadow-md border-b-2 border-pink-400">
            Welcome back, <span className="font-bold uppercase">{user?.username}</span>!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3">
          {/* Create Post Button - Anti-design style with color accents */}
          {isAuthenticated && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-6 bg-black text-white mb-12 hover:bg-gray-900 flex items-center justify-center transform hover:skew-y-1 transition-transform shadow-lg relative overflow-hidden group"
            >
              <span className="font-bold text-2xl uppercase tracking-widest relative z-10">
                + CREATE <span className="text-teal-400">POST</span>
              </span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 transform translate-x-0 group-hover:translate-y-1 transition-transform"></span>
            </button>
          )}

          {/* Trending Communities - Anti-design style with color accents */}
          <div className="bg-gray-100 p-8 mb-12 relative transform rotate-0.5 shadow-lg">
            <div className="absolute -top-6 -right-6 bg-black text-white px-3 py-1 transform -rotate-3 shadow-md">
              <span className="text-pink-400">HOT</span> RIGHT NOW
            </div>
            <h2 className="font-bold text-3xl mb-8 uppercase tracking-tight relative inline-block">
              TRENDING <span className="text-pink-500">COMMUNITIES</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-pink-400"></span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {loading ? (
                <div className="col-span-3 text-center py-8 text-2xl bg-white shadow-inner">LOADING...</div>
              ) : (
                trendingCommunities.map((community: any, index: number) => (
                  <Link 
                    key={community.id} 
                    to={`/community/${community.id}`}
                    className={`bg-white p-4 hover:bg-gray-50 transform hover:skew-x-1 hover:-skew-y-1 transition-transform shadow-md ${
                      index % 3 === 0 ? 'border-t-2 border-teal-400' : 
                      index % 3 === 1 ? 'border-t-2 border-pink-400' : 
                      'border-t-2 border-purple-400'
                    }`}
                  >
                    <h3 className="font-bold text-lg">r/{community.name}</h3>
                    <p className="text-sm truncate">{community.description}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Community Discovery - Will be styled by its own component */}
          <CommunityDiscovery />
          
          {/* Latest Posts - Anti-design style with color accents */}
          <div className="bg-gray-100 p-8 mt-12 mb-12 relative transform -rotate-0.5 shadow-lg">
            <div className="absolute -top-6 left-12 bg-black text-white px-4 py-1 transform rotate-2 shadow-md">
              <span className="text-purple-400">FRESH</span> CONTENT
            </div>
            <h2 className="font-bold text-3xl mb-8 uppercase tracking-tight relative inline-block">
              LATEST <span className="text-purple-500">POSTS</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-purple-400"></span>
            </h2>
            <PostList />
          </div>
        </div>

        <div className="lg:col-span-1">
          <Sidebar />
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}
