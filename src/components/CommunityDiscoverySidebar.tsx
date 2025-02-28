import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCommunities } from '../api/communities';

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
  privacy?: 'public' | 'private';
}

export default function CommunityDiscoverySidebar() {
  const [newCommunities, setNewCommunities] = useState<Community[]>([]);
  const [popularCommunities, setPopularCommunities] = useState<Community[]>([]);
  const [randomCommunity, setRandomCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get all communities
        const allCommunities = await getCommunities();
        
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
        
      } catch (error) {
        console.error('Error fetching community data:', error);
        setError('Failed to load communities');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Function to navigate to a random community
  const goToRandomCommunity = () => {
    if (randomCommunity) {
      navigate(`/community/${randomCommunity.id}`);
    }
  };

  return (
    <div className="bg-black text-white p-4">
      <h2 className="font-bold uppercase tracking-tight text-xl relative inline-block mb-4">
        <span className="text-teal-400">DISCOVER</span>
      </h2>
      
      <div className="space-y-6 mt-6">
        {/* New Communities Section */}
        <div className="bg-gray-900 p-4 border-l-2 border-teal-400">
          <div className="flex items-center justify-between border-b border-gray-700 mb-2 pb-1">
            <h3 className="text-xs uppercase font-medium tracking-wide text-teal-400">NEW</h3>
            <span className="text-xs text-gray-500">Communities</span>
          </div>
          
          {loading ? (
            <div className="animate-pulse text-xs">Loading...</div>
          ) : error ? (
            <div className="text-xs text-red-400">Error loading communities</div>
          ) : newCommunities.length > 0 ? (
            <ul className="space-y-1">
              {newCommunities.map(community => (
                <li key={community.id} className="rounded hover:bg-gray-800 p-1 transition-colors">
                  <Link to={`/community/${community.id}`} className="block">
                    <span className="font-medium text-sm">{community.name}</span>
                    <p className="text-xs text-gray-400 truncate">{community.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-gray-400">No communities found</div>
          )}
        </div>
        
        {/* Popular Communities Section */}
        <div className="bg-gray-900 p-4 border-l-2 border-pink-400">
          <div className="flex items-center justify-between border-b border-gray-700 mb-2 pb-1">
            <h3 className="text-xs uppercase font-medium tracking-wide text-pink-400">POPULAR</h3>
            <span className="text-xs text-gray-500">Communities</span>
          </div>
          
          {loading ? (
            <div className="animate-pulse text-xs">Loading...</div>
          ) : error ? (
            <div className="text-xs text-red-400">Error loading communities</div>
          ) : popularCommunities.length > 0 ? (
            <ul className="space-y-1">
              {popularCommunities.map(community => (
                <li key={community.id} className="rounded hover:bg-gray-800 p-1 transition-colors">
                  <Link to={`/community/${community.id}`} className="block">
                    <span className="font-medium text-sm">{community.name}</span>
                    <p className="text-xs text-gray-400 truncate">{community.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-gray-400">No communities found</div>
          )}
        </div>
        
        {/* Random Community Section */}
        <div 
          className="bg-gray-900 p-4 border-l-2 border-purple-400 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={goToRandomCommunity}
        >
          <div className="flex items-center justify-between border-b border-gray-700 mb-2 pb-1">
            <h3 className="text-xs uppercase font-medium tracking-wide text-purple-400">RANDOM</h3>
            <span className="text-xs text-gray-500">Community</span>
          </div>
          
          {loading ? (
            <div className="animate-pulse text-xs">Loading...</div>
          ) : error ? (
            <div className="text-xs text-red-400">Error loading communities</div>
          ) : randomCommunity ? (
            <div className="text-sm">
              <div className="font-medium">{randomCommunity.name}</div>
              <p className="text-xs text-gray-400 truncate">{randomCommunity.description}</p>
              <button className="mt-2 text-xs text-purple-400 hover:text-purple-300">
                Click to visit →
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-400">No communities found</div>
          )}
        </div>
      </div>
    </div>
  );
}