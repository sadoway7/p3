import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCommunities } from '../api/communities'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const data = await getCommunities()
        setCommunities(data)
      } catch (error) {
        console.error('Failed to fetch communities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [])

  return (
    <div className="space-y-8 font-mono">
      {/* User Section - Only show if logged in */}
      {isAuthenticated && user && (
        <div className="bg-gray-900 text-white p-6 relative transform -rotate-1 shadow-lg">
          <div className="absolute -top-4 -right-4 bg-white text-black px-3 py-1 text-xs uppercase transform rotate-3 shadow-md">
            <span className="text-teal-500">Y</span>
            <span className="text-pink-500">O</span>
            <span className="text-purple-500">U</span>
          </div>
          <h2 className="font-bold mb-4 uppercase text-xl">{user.username}</h2>
          <div className="space-y-3 bg-gray-800 p-3 ml-4 border-l-2 border-teal-400">
            <Link to="/profile" className="block text-sm font-bold hover:text-teal-300 uppercase">
              Profile
            </Link>
            <Link to="/profile/posts" className="block text-sm hover:text-pink-300 uppercase">
              Your Posts
            </Link>
            <Link to="/profile/comments" className="block text-sm hover:text-purple-300 uppercase">
              Your Comments
            </Link>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-gray-100 p-6 transform rotate-1 shadow-md">
        <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
          Quick Links
          <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-400"></span>
        </h2>
        <div className="space-y-3 ml-2">
          <Link to="/communities" className="block text-sm uppercase hover:ml-2 transition-all hover:text-teal-600">
            All Communities
          </Link>
          <Link to="/communities?sort=popular" className="block text-sm uppercase hover:ml-2 transition-all hover:text-pink-600">
            Popular Communities
          </Link>
          <Link to="/communities?sort=new" className="block text-sm uppercase hover:ml-2 transition-all hover:text-purple-600">
            New Communities
          </Link>
          <Link to="/communities" className="block text-sm font-bold uppercase mt-6 bg-black text-white p-2 text-center hover:bg-gray-800 transition-colors shadow-sm relative overflow-hidden group">
            <span className="relative z-10">+ Create a Community</span>
            <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
          </Link>
        </div>
      </div>

      {/* Popular Communities */}
      <div className="bg-gray-100 p-6 transform -rotate-0.5 shadow-md">
        <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
          Popular Communities
          <span className="absolute bottom-0 left-0 w-full h-1 bg-pink-400"></span>
        </h2>
        {loading ? (
          <div className="text-sm uppercase tracking-widest animate-pulse p-4 bg-white text-center shadow-inner">Loading...</div>
        ) : (
          <div className="space-y-3">
            {communities.slice(0, 5).map((community, index) => (
              <Link
                key={community.id}
                to={`/community/${community.id}`}
                className={`block text-sm hover:ml-2 transition-all p-2 hover:bg-white ${
                  index % 3 === 0 ? 'border-l-2 border-teal-400' : 
                  index % 3 === 1 ? 'border-l-2 border-pink-400' : 
                  'border-l-2 border-purple-400'
                }`}
              >
                r/{community.name}
              </Link>
            ))}
            {communities.length === 0 && (
              <div className="text-sm bg-white p-4 text-center uppercase shadow-inner">No communities found</div>
            )}
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="bg-black text-white p-6 transform rotate-0.5 shadow-lg">
        <h2 className="font-bold mb-4 uppercase tracking-tight text-xl relative inline-block">
          About Rumfor
          <span className="absolute bottom-0 left-0 w-full h-1 bg-purple-400"></span>
        </h2>
        <p className="text-sm mb-4 ml-4 border-l-2 border-teal-400 pl-2">
          Rumfor is a community platform where you can join communities, share posts, and connect with others.
        </p>
        <div className="text-xs uppercase tracking-widest text-center bg-gray-800 p-2 mt-4">
          <span className="text-teal-400">©</span> 2025 <span className="text-pink-400">R</span>umfor
        </div>
      </div>
    </div>
  )
}
