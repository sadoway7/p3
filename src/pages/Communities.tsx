import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CreateCommunityModal from '../components/CreateCommunityModal';
import CommunityDiscoverySidebar from '../components/CommunityDiscoverySidebar';
import CommunityListItem from '../components/CommunityListItem';
import { getCommunities, getUserCommunities } from '../api/communities';
import { useAuth } from '../context/AuthContext';
import JoinCommunityButton from '../components/JoinCommunityButton';
import { getPosts } from '../api/posts';
import { Post } from '../types';

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
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCommunityId, setExpandedCommunityId] = useState<string | null>(null);
  const [communitySearchTerms, setCommunitySearchTerms] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<'trending' | 'new' | 'popular' | 'active'>('trending');
  const [filterBy, setFilterBy] = useState<'all' | 'public' | 'private'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const [communityPosts, setCommunityPosts] = useState<Record<string, Post[]>>({});
  const [loadingPosts, setLoadingPosts] = useState<Record<string, boolean>>({});
  const [postErrors, setPostErrors] = useState<Record<string, string | null>>({});
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [loadingUserCommunities, setLoadingUserCommunities] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();
  
  // Function to toggle community expansion
  const toggleCommunityExpansion = async (communityId: string) => {
    const isExpanding = expandedCommunityId !== communityId;
    setExpandedCommunityId(isExpanding ? communityId : null);
    
    // If expanding and we don't have posts for this community yet, fetch them
    if (isExpanding && !communityPosts[communityId]) {
      await fetchCommunityPosts(communityId);
    }
  };
  
  // Function to fetch posts for a specific community
  const fetchCommunityPosts = async (communityId: string) => {
    // Skip if we're already loading posts for this community
    if (loadingPosts[communityId]) return;
    
    setLoadingPosts(prev => ({ ...prev, [communityId]: true }));
    setPostErrors(prev => ({ ...prev, [communityId]: null }));
    
    try {
      const posts = await getPosts(communityId, token);
      setCommunityPosts(prev => ({ ...prev, [communityId]: posts }));
    } catch (error) {
      // Error already handled by setting postErrors state
      setPostErrors(prev => ({
        ...prev,
        [communityId]: error instanceof Error ? error.message : 'Failed to load posts'
      }));
    } finally {
      setLoadingPosts(prev => ({ ...prev, [communityId]: false }));
    }
  };
  
  // Function to update a community's search term
  const updateCommunitySearchTerm = (communityId: string, term: string) => {
    setCommunitySearchTerms(prev => ({
      ...prev,
      [communityId]: term
    }));
  };
  
  // Sort communities based on selected criteria
  const sortCommunities = (sortType: 'trending' | 'new' | 'popular' | 'active') => {
    setSortBy(sortType);
    
    let sorted = [...allCommunities];
    
    switch (sortType) {
      case 'new':
        // Sort by creation date (newest first)
        sorted = sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'popular':
        // For a real app, this would be based on member count
        // Here we'll use the index for demo purposes
        sorted = sorted.sort((a, b) => {
          const aIndex = parseInt(a.id) || 0;
          const bIndex = parseInt(b.id) || 0;
          return (bIndex * 42 + 12) - (aIndex * 42 + 12);
        });
        break;
      case 'active':
        // For a real app, this would be based on recent posts
        // Here we'll use the id for demo purposes
        sorted = sorted.sort((a, b) => {
          const aIndex = parseInt(a.id) || 0;
          const bIndex = parseInt(b.id) || 0;
          return (bIndex * 17 + 8) - (aIndex * 17 + 8);
        });
        break;
      default: // 'trending'
        // In a real app, this would be a complex algorithm
        // For demo, we'll shuffle a bit using both creation date and id
        sorted = sorted.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          const idA = parseInt(a.id) || 0;
          const idB = parseInt(b.id) || 0;
          
          return (dateB + idB) - (dateA + idA);
        });
    }
    
    // Apply filtering
    applyFilters(sorted);
  };
  
  // Filter communities based on selected criteria
  const filterCommunities = (filterType: 'all' | 'public' | 'private') => {
    setFilterBy(filterType);
    applyFilters([...allCommunities]);
  };
  
  // Apply current filters to the communities
  const applyFilters = (communitiesToFilter: Community[]) => {
    let filtered = communitiesToFilter;
    
    // Apply privacy filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(community => 
        filterBy === 'private' ? community.privacy === 'private' : community.privacy !== 'private'
      );
    }
    
    setCommunities(filtered);
  };

  const fetchCommunities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCommunities();
      setAllCommunities(data);
      
      // Apply current sorting and filtering
      let processedData = [...data];
      
      // Sort based on current sortBy value
      switch (sortBy) {
        case 'new':
          processedData.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case 'popular':
          processedData.sort((a, b) => {
            const aIndex = parseInt(a.id) || 0;
            const bIndex = parseInt(b.id) || 0;
            return (bIndex * 42 + 12) - (aIndex * 42 + 12);
          });
          break;
        case 'active':
          processedData.sort((a, b) => {
            const aIndex = parseInt(a.id) || 0;
            const bIndex = parseInt(b.id) || 0;
            return (bIndex * 17 + 8) - (aIndex * 17 + 8);
          });
          break;
        default: // 'trending'
          processedData.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            const idA = parseInt(a.id) || 0;
            const idB = parseInt(b.id) || 0;
            
            return (dateB + idB) - (dateA + idA);
          });
      }
      
      // Apply filter
      if (filterBy !== 'all') {
        processedData = processedData.filter(community => 
          filterBy === 'private' ? community.privacy === 'private' : community.privacy !== 'private'
        );
      }
      
      setCommunities(processedData);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load communities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch user's joined communities
  const fetchUserCommunities = async () => {
    if (!isAuthenticated || !token || !user) {
      setUserCommunities([]);
      return;
    }
    
    setLoadingUserCommunities(true);
    try {
      const userCommunitiesData = await getUserCommunities(user.id);
      setUserCommunities(userCommunitiesData);
    } catch (error) {
      // Silently handle error - we'll just show empty user communities
    } finally {
      setLoadingUserCommunities(false);
    }
  };
  
  // Fetch all communities on mount
  useEffect(() => {
    fetchCommunities();
  }, []);
  
  // Fetch user communities when auth state changes
  useEffect(() => {
    fetchUserCommunities();
  }, [isAuthenticated, token, user]);

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

    // Join functionality is now handled by the JoinCommunityButton component

  return (
    <div className="w-full font-mono bg-gray-50">
      {/* Filter/Sorting bar - always visible */}
      <div className="w-full bg-black text-white py-2 px-4 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Sort:</span>
            <select 
              className="bg-gray-800 text-white border-none rounded px-2 py-1 text-xs cursor-pointer"
              value={sortBy}
              onChange={(e) => sortCommunities(e.target.value as 'trending' | 'new' | 'popular' | 'active')}
            >
              <option value="trending">Trending</option>
              <option value="new">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="active">Most Active</option>
            </select>
          </div>
          
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-gray-400 text-sm">Filter:</span>
            <div className="flex space-x-1">
              <button 
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterBy === 'all' ? 'bg-teal-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => filterCommunities('all')}
              >
                All
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterBy === 'public' ? 'bg-teal-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => filterCommunities('public')}
              >
                Public
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  filterBy === 'private' ? 'bg-teal-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                onClick={() => filterCommunities('private')}
              >
                Private
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm">
          {/* View toggle - list vs. compact */}
          <div className="hidden md:flex items-center mr-2 border-r border-gray-700 pr-3">
            <span className="text-gray-400 text-xs mr-1">View:</span>
            <div className="flex">
              <button 
                className={`px-2 py-1 rounded-l text-xs flex items-center justify-center transition-colors border-r border-gray-700 ${
                  viewMode === 'list' ? 'bg-teal-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title="List view"
                onClick={() => setViewMode('list')}
              >
                <span>List</span>
              </button>
              <button 
                className={`px-2 py-1 rounded-r text-xs flex items-center justify-center transition-colors ${
                  viewMode === 'compact' ? 'bg-teal-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title="Compact view"
                onClick={() => setViewMode('compact')}
              >
                <span>Compact</span>
              </button>
            </div>
          </div>
          
          <button 
            className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-xs transition-colors flex items-center"
            onClick={() => fetchCommunities()}
          >
            <span className="mr-1">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Full width layout */}
      <div className="flex w-full">
        {/* Left Sidebar - fixed width on desktop */}
        <div className="hidden md:block w-64 xl:w-72 flex-shrink-0 border-r border-gray-200 h-screen overflow-y-auto custom-scrollbar sticky top-10">
          <div className="p-4">
            {/* Search bar - compact but prominent in sidebar */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 text-sm bg-white text-black border-2 border-teal-400 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={isSearching}
                />
                <button 
                  type="submit" 
                  className="absolute right-0 top-0 bottom-0 px-3 bg-teal-400 text-black font-bold text-sm uppercase tracking-wide hover:bg-teal-300 transition-colors rounded-r"
                  disabled={isSearching || !searchTerm.trim()}
                >
                  {isSearching ? '...' : 'Go'}
                </button>
              </div>
            </form>
            
            {/* Your Communities Section */}
            <div className="bg-gray-100 p-3 mb-4 border-l-2 border-teal-400">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm uppercase">Your Communities</h3>
                <button 
                  className="text-xs font-medium text-teal-600 hover:text-teal-800"
                  onClick={() => navigate('/communities/user')}
                >
                  See All
                </button>
              </div>
              
              {isAuthenticated ? (
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  {loadingUserCommunities ? (
                    <div className="py-2 text-center">
                      <div className="inline-flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="text-xs text-gray-500 ml-1">Loading...</span>
                      </div>
                    </div>
                  ) : userCommunities.length > 0 ? (
                    userCommunities.map((community, index) => (
                      <Link
                        to={`/community/${community.id}`}
                        key={community.id}
                        className="flex items-center py-1.5 border-b border-gray-200 last:border-0 hover:bg-gray-50"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs mr-2"
                          style={{ backgroundColor: index % 3 === 0 ? '#2dd4bf' : index % 3 === 1 ? '#f472b6' : '#a78bfa' }}
                        >
                          {community.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm hover:text-teal-600 truncate">{community.name}</span>
                      </Link>
                    ))
                  ) : (
                    <div className="py-2 text-center">
                      <p className="text-xs text-gray-500">You haven't joined any communities yet.</p>
                      <p className="text-xs text-teal-600 mt-1">Join communities to see them here!</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Sign in to see your communities
                </div>
              )}
            </div>
            
            {/* Create Community Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2.5 bg-black text-white text-sm font-bold uppercase hover:bg-gray-800 transition-colors mb-4 rounded-sm flex items-center justify-center shadow"
            >
              <span className="mr-2">+</span> Create Community
            </button>
            
            <CommunityDiscoverySidebar />
          </div>
        </div>
        
        {/* Main Content Area - expands to fill available width */}
        <div className="flex-grow min-h-screen">
          {/* Mobile only create button */}
          <div className="md:hidden w-full p-4 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-black text-white text-sm font-bold uppercase rounded-sm shadow-md flex items-center"
            >
              <span className="mr-1">+</span> Create
            </button>
          </div>
          
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="md:hidden mx-4 mt-4 mb-2">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 text-sm bg-gray-800 text-white border-2 border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                disabled={isSearching}
              />
              <button 
                type="submit" 
                className="px-3 py-2 bg-teal-400 text-black font-bold text-xs uppercase tracking-wider hover:bg-teal-300"
                disabled={isSearching || !searchTerm.trim()}
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
          </form>
        
          {/* Status indicators */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-3 mx-4 mt-4 text-sm">
              <span className="font-bold">ERROR:</span> {error}
            </div>
          )}
          
          {(isLoading || isSearching) && (
            <div className="bg-gray-100 p-4 m-4 rounded shadow-inner">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="ml-2 text-sm text-gray-600">{isSearching ? 'Searching communities...' : 'Loading communities...'}</span>
              </div>
            </div>
          )}
          
          {/* Community List with stacked horizontal layout */}
          {!isLoading && !isSearching && (
            <div className="mx-4 my-4">
              {communities.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded shadow-md">
                  <span className="text-xl uppercase font-bold tracking-wider text-gray-700">No Communities Found</span>
                  <p className="mt-2 text-gray-500">Try creating a new community or adjusting your search.</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  {communities.map((community, index) => {
                    const isExpanded = expandedCommunityId === community.id;
                    const communitySearchTerm = communitySearchTerms[community.id] || '';
                    const communityColor = index % 3 === 0 ? '#2dd4bf' : index % 3 === 1 ? '#f472b6' : '#a78bfa';

                    return (
                      <CommunityListItem
                        key={community.id}
                        community={community}
                        index={index}
                        isExpanded={isExpanded}
                        communityColor={communityColor}
                        communitySearchTerm={communitySearchTerm}
                        toggleCommunityExpansion={toggleCommunityExpansion}
                        updateCommunitySearchTerm={updateCommunitySearchTerm}
                        viewMode={viewMode}
                        communityPosts={communityPosts[community.id] || []}
                        loadingPosts={loadingPosts[community.id] || false}
                        postErrors={postErrors[community.id] || null}
                        fetchCommunityPosts={fetchCommunityPosts}
                      />
                    );
                  })}
                </div>
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
