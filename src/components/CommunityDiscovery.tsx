import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCommunities } from '../api/communities'

export default function CommunityDiscovery() {
  const [communities, setCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const data = await getCommunities()
        setCommunities(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching communities:', err)
        setError('Failed to load communities')
      } finally {
        setLoading(false)
      }
    }

    fetchCommunities()
  }, [])

  if (loading) {
    return (
      <div className="bg-black text-white p-8 relative font-mono transform rotate-0.5">
        <div className="absolute -top-6 left-16 bg-white text-black px-4 py-1 transform -rotate-2">EXPLORE</div>
        <h2 className="font-bold text-3xl mb-8 uppercase tracking-tight">DISCOVER COMMUNITIES</h2>
        <div className="text-center py-12 text-2xl uppercase tracking-widest animate-pulse">LOADING...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black text-white p-8 relative font-mono transform rotate-0.5">
        <div className="absolute -top-6 left-16 bg-white text-black px-4 py-1 transform -rotate-2">EXPLORE</div>
        <h2 className="font-bold text-3xl mb-8 uppercase tracking-tight">DISCOVER COMMUNITIES</h2>
        <div className="text-center py-12 bg-gray-800">
          <span className="text-2xl uppercase font-bold">ERROR:</span> {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black text-white p-8 relative font-mono transform rotate-0.5 shadow-lg">
      <div className="absolute -top-6 left-16 bg-white text-black px-4 py-1 transform -rotate-2 shadow-md">
        <span className="text-purple-500">E</span>
        <span>X</span>
        <span className="text-teal-500">P</span>
        <span>L</span>
        <span className="text-pink-500">O</span>
        <span>R</span>
        <span>E</span>
      </div>
      <h2 className="font-bold text-3xl mb-8 uppercase tracking-tight">
        DISCOVER <span className="text-teal-400">COMMUNITIES</span>
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {communities.slice(0, 6).map((community, index) => (
          <Link 
            key={community.id} 
            to={`/community/${community.id}`}
            className={`bg-gray-800 p-4 hover:bg-gray-700 transform hover:skew-x-1 hover:-skew-y-1 transition-transform shadow-md ${
              index % 3 === 0 ? 'border-l-4 border-teal-500' : 
              index % 3 === 1 ? 'border-l-4 border-pink-500' : 
              'border-l-4 border-purple-500'
            }`}
          >
            <h3 className="font-bold text-lg">r/{community.name}</h3>
            <p className="text-sm text-gray-300 truncate">{community.description}</p>
          </Link>
        ))}
      </div>
      
      {communities.length === 0 && (
        <div className="text-center py-12 bg-gray-800 shadow-inner">
          <span className="text-2xl uppercase font-bold">EMPTY</span>
          <p className="mt-4 text-gray-300">No communities found. Create one to get started!</p>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <Link 
          to="/communities" 
          className="inline-block px-8 py-4 bg-white text-black uppercase tracking-wider transform hover:skew-x-2 transition-transform shadow-md relative overflow-hidden group"
        >
          <span className="relative z-10">View All Communities</span>
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
        </Link>
      </div>
    </div>
  )
}
