import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CommunitySearch from '../components/CommunitySearch';
import CommunityList from '../components/CommunityList';
import CreateCommunityModal from '../components/CreateCommunityModal';
import { getCommunities, joinCommunity } from '../api/communities';
import { useAuth } from '../context/AuthContext';

interface Community {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  privacy?: 'public' | 'private';
}

export default function Communities() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();

  const fetchCommunities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCommunities();
      setCommunities(data);
    } catch (err) {
      console.error('Failed to fetch communities:', err);
      setError('Failed to load communities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleCommunityCreated = (communityId: string) => {
    // Refresh the communities list
    fetchCommunities();

    // Navigate to the new community page
    navigate(`/community/${communityId}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim()) {
      return;
    }

    try {
      setIsSearching(true);

      const results = await getCommunities(searchTerm);
      setCommunities(results);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSearching(false);
    }
  };

    const handleJoinCommunity = async (communityId: string) => {
        if (!isAuthenticated) {
            // Redirect to login or show login modal
            alert('Please log in to join this community');
            return;
        }

        try {
            await joinCommunity(communityId, token);
            // Refresh the communities list to update UI
            fetchCommunities();
        } catch (error) {
            console.error('Failed to join community:', error);
            setError('Failed to join community');
        }
    };

  return (
    <div className="w-full font-mono">
      {/* Full-width header banner */}
      <div className="w-full bg-black text-white py-8 px-4 mb-8 relative">
        <h1 className="text-4xl font-bold uppercase tracking-tight relative inline-block">
          <span className="text-teal-400">COMM</span>
          <span>UNI</span>
          <span className="text-pink-400">TIES</span>
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></span>
        </h1>
        <p className="text-gray-300 mt-2 ml-6 border-l-2 border-pink-400 pl-4">
          Discover and join communities that match your interests
        </p>

        <button
          onClick={() => setShowCreateModal(true)}
          className="absolute right-4 mt-4 px-6 py-3 bg-white text-black font-bold uppercase tracking-wider transform hover:skew-x-2 transition-transform shadow-md"
        >
          + CREATE COMMUNITY
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="w-full md:w-[300px] flex-shrink-0">
          <div className="bg-black text-white p-4">
            <h2 className="font-bold uppercase tracking-tight text-xl relative inline-block mb-4">
              <span className="text-teal-400">DISCOVER</span>
            </h2>
            
            <div className="space-y-6 mt-6">
              <div className="bg-gray-900 p-4 border-l-2 border-teal-400">
                <h3 className="text-sm uppercase font-bold">NEW COMMUNITIES</h3>
                <p className="text-xs text-gray-400 mt-1">Find the latest communities</p>
              </div>
              
              <div className="bg-gray-900 p-4 border-l-2 border-pink-400">
                <h3 className="text-sm uppercase font-bold">POPULAR COMMUNITIES</h3>
                <p className="text-xs text-gray-400 mt-1">Join the most active groups</p>
              </div>
              
              <div className="bg-gray-900 p-4 border-l-2 border-purple-400">
                <h3 className="text-sm uppercase font-bold">RANDOM COMMUNITY</h3>
                <p className="text-xs text-gray-400 mt-1">Discover something new</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-grow">
          {/* Search Bar */}
          <div className="bg-black text-white p-4 mb-6">
            <div className="text-center mb-2">
              <span className="text-teal-400">F</span>
              <span>I</span>
              <span className="text-pink-400">N</span>
              <span>D</span>
              <span> </span>
              <span className="text-purple-400">C</span>
              <span>O</span>
              <span className="text-teal-400">M</span>
              <span>M</span>
              <span className="text-pink-400">U</span>
              <span>N</span>
              <span className="text-purple-400">I</span>
              <span>T</span>
              <span className="text-teal-400">I</span>
              <span>E</span>
              <span className="text-pink-400">S</span>
            </div>
            
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-3 bg-white text-black border-0 shadow-inner focus:outline-none placeholder-gray-500"
                disabled={isSearching}
              />
              <button 
                type="submit" 
                className="px-6 py-3 bg-gray-700 text-white uppercase tracking-wider hover:bg-gray-600"
                disabled={isSearching || !searchTerm.trim()}
              >
                {isSearching ? 'Searching...' : 'SEARCH'}
              </button>
            </form>
          </div>
          
          {/* Community List */}
          {error && (
            <div className="bg-black text-white p-4 mb-6">
              <span className="text-pink-400 font-bold uppercase">ERROR:</span> {error}
            </div>
          )}
          
          {isLoading || isSearching ? (
            <div className="text-center py-12 text-2xl uppercase tracking-widest animate-pulse">
              {isSearching ? 'Searching communities...' : 'Loading communities...'}
            </div>
          ) : (
            <div className="space-y-4">
              {communities.length === 0 ? (
                <div className="text-center py-12 bg-black text-white">
                  <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
                  <p className="mt-4 text-gray-300">No communities found. Create one to get started!</p>
                </div>
              ) : (
                communities.map((community) => (
                  <div
                    key={community.id}
                    className="bg-white p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="flex-grow">
                      <Link
                        to={`/community/${community.id}`}
                        className="font-bold text-xl hover:text-teal-600 transition-colors"
                      >
                        r/{community.name}
                      </Link>
                      <p className="text-base mt-2">{community.description}</p>
                      
                      <div className="mt-3 flex flex-wrap items-center text-sm space-x-4">
                        {community.created_at && (
                          <div className="text-gray-500">
                            Created <span className="text-purple-600">{new Date(community.created_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <button 
                        onClick={() => handleJoinCommunity(community.id)}
                        className="px-6 py-3 bg-black text-white uppercase tracking-wider">
                        JOIN
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCommunityCreated}
        />
      )}
    </div>
  );
}
