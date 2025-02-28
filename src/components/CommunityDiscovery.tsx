import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCommunities } from '../api/communities'

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

export default function CommunityDiscovery() {
  const [newCommunities, setNewCommunities] = useState<Community[]>([])
  const [popularCommunities, setPopularCommunities] = useState<Community[]>([])
  const [randomCommunity, setRandomCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true)
        const allCommunities = await getCommunities()
        
        if (allCommunities.length === 0) {
          return;
        }
        
        // Sort by creation date for newest communities
        const sortedByDate = [...allCommunities].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setNewCommunities(sortedByDate.slice(0, 3));
        
        // For now, just use the first 3 communities as "popular"
        setPopularCommunities(allCommunities.slice(0, 3));
        
        // Get a random community
        const randomIndex = Math.floor(Math.random() * allCommunities.length);
        setRandomCommunity(allCommunities[randomIndex]);
        
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
  
  // Navigate to random community
  const goToRandomCommunity = () => {
    if (randomCommunity) {
      navigate(`/community/${randomCommunity.id}`)
    }
  }

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
      
      {/* Explore Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* New Communities section */}
        <div className="bg-gray-800 p-4 border-l-4 border-teal-500 transform hover:skew-x-1 hover:-skew-y-1 transition-transform shadow-md">
          <div className="flex items-center justify-between border-b border-gray-700 mb-3 pb-1">
            <h3 className="text-sm uppercase font-medium tracking-wide text-teal-400">NEW</h3>
            <span className="text-xs text-gray-500">Communities</span>
          </div>
          <div className="space-y-2">
            {newCommunities.map((community) => (
              <Link 
                key={community.id} 
                to={`/community/${community.id}`}
                className="block hover:bg-gray-700 p-2 rounded transition-colors"
              >
                <div className="font-medium">r/{community.name}</div>
                <p className="text-sm text-gray-300 truncate">{community.description}</p>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Popular Communities section */}
        <div className="bg-gray-800 p-4 border-l-4 border-pink-500 transform hover:skew-x-1 hover:-skew-y-1 transition-transform shadow-md">
          <div className="flex items-center justify-between border-b border-gray-700 mb-3 pb-1">
            <h3 className="text-sm uppercase font-medium tracking-wide text-pink-400">POPULAR</h3>
            <span className="text-xs text-gray-500">Communities</span>
          </div>
          <div className="space-y-2">
            {popularCommunities.map((community) => (
              <Link 
                key={community.id} 
                to={`/community/${community.id}`}
                className="block hover:bg-gray-700 p-2 rounded transition-colors"
              >
                <div className="font-medium">r/{community.name}</div>
                <p className="text-sm text-gray-300 truncate">{community.description}</p>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Random Community section */}
        <div 
          className="bg-gray-800 p-4 border-l-4 border-purple-500 transform hover:skew-x-1 hover:-skew-y-1 transition-transform shadow-md cursor-pointer"
          onClick={goToRandomCommunity}
        >
          <div className="flex items-center justify-between border-b border-gray-700 mb-3 pb-1">
            <h3 className="text-sm uppercase font-medium tracking-wide text-purple-400">RANDOM</h3>
            <span className="text-xs text-gray-500">Community</span>
          </div>
          {randomCommunity ? (
            <div className="p-2">
              <div className="font-medium">r/{randomCommunity.name}</div>
              <p className="text-sm text-gray-300 truncate">{randomCommunity.description}</p>
              <div className="mt-4 text-sm text-purple-400">Click to visit →</div>
            </div>
          ) : (
            <p className="text-sm text-gray-300 mt-2">No communities found</p>
          )}
        </div>
      </div>
      
      {newCommunities.length === 0 && popularCommunities.length === 0 && !randomCommunity && (
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
