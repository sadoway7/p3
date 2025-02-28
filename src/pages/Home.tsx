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
  const [activeTab, setActiveTab] = useState<'trending' | 'all' | 'following'>('trending')
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card')
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
    <div className="w-full max-w-[98%] xl:max-w-[1800px] mx-auto px-2 font-mono bg-gray-50">
      {/* Minimal header with welcome message */}
      <div className="w-full bg-black text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between p-3">
          {/* Left: Welcome message */}
          {isAuthenticated ? (
            <div className="font-bold uppercase">
              Welcome, <span className="text-teal-400">{user?.username}</span>!
            </div>
          ) : (
            <div className="text-sm font-medium">
              Welcome to <span className="text-teal-400 font-bold">RUMFOR</span>
            </div>
          )}
          
          {/* Right: User actions */}
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <>
                {/* User profile and settings buttons */}
                <div className="hidden md:flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-sm transition-colors uppercase"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-sm transition-colors uppercase"
                  >
                    Settings
                  </Link>
                </div>
                
                {/* Mobile-only post button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="md:hidden px-3 py-1 bg-teal-500 text-white text-xs uppercase tracking-wider rounded-sm hover:bg-teal-400 transition-colors flex items-center"
                >
                  <span className="mr-1">+</span> Post
                </button>
              </>
            )}
            
            {!isAuthenticated && (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded-sm transition-colors uppercase"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1 text-xs bg-teal-500 hover:bg-teal-400 rounded-sm transition-colors uppercase"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Banner - Only on first visit or occasionally */}
      {!isAuthenticated && (
        <div className="bg-black text-white p-6 my-4 relative transform -rotate-1 shadow-lg">
          <div className="absolute top-0 right-0 bg-white text-black px-4 py-1 text-xl uppercase tracking-widest transform rotate-3 shadow-md">
            <span className="text-teal-500">WEL</span>
            <span className="text-pink-500">COME</span>
          </div>
          <h1 className="text-3xl font-bold mb-3 uppercase tracking-tight">
            <span className="text-teal-400">Join</span> communities. <span className="text-pink-400">Share</span> ideas. Be <span className="text-purple-400">yourself</span>.
          </h1>
          <p className="text-white text-lg ml-6 border-l-4 border-teal-400 pl-4">
            Rumfor is where communities thrive. Find your people.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:space-x-6 mt-4">
        {/* Left Sidebar - User activity and communities */}
        <div className="w-full lg:w-72 flex-shrink-0 order-1 md:order-1">
          {/* User Activity Section - No title, more styled */}
          {isAuthenticated && (
            <div className="space-y-4 mb-4">
              <div className="bg-white shadow-md border-l-4 border-teal-400 p-4 transform -rotate-1 skew-y-0.5 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-white to-transparent"></div>
                <div className="space-y-2">
                  <Link 
                    to="/profile/posts" 
                    className="block text-sm font-medium hover:text-teal-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:-rotate-0.5"
                  >
                    <span className="w-3 h-3 rounded-full bg-teal-400 mr-2"></span> Your Posts
                  </Link>
                  <Link 
                    to="/profile/comments" 
                    className="block text-sm font-medium hover:text-pink-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:rotate-0.5"
                  >
                    <span className="w-3 h-3 rounded-full bg-pink-400 mr-2"></span> Your Comments
                  </Link>
                  <Link 
                    to="/profile/votes" 
                    className="block text-sm font-medium hover:text-purple-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:-rotate-0.5"
                  >
                    <span className="w-3 h-3 rounded-full bg-purple-400 mr-2"></span> Your Votes
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block text-xs text-teal-600 font-medium hover:underline mt-2 pl-5 transform hover:translate-x-1 transition-all"
                  >
                    View full profile →
                  </Link>
                </div>
              </div>
              
              <div className="bg-white shadow-md border-l-4 border-pink-400 p-4 transform rotate-1 skew-y-0.5 relative">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-pink-400 via-white to-transparent"></div>
                <div className="space-y-2">
                  {/* Placeholder for user communities */}
                  {[1, 2, 3].map(num => (
                    <Link 
                      key={num}
                      to={`/community/${num}`}
                      className="block text-sm font-medium hover:text-pink-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white mr-2 flex-shrink-0 shadow transform hover:scale-110 transition-transform"
                        style={{ backgroundColor: num % 3 === 0 ? '#2dd4bf' : num % 3 === 1 ? '#f472b6' : '#a78bfa' }}
                      >
                        <span className="text-xs font-bold">{String.fromCharCode(64 + num)}</span>
                      </div>
                      <span className="truncate">Sample Community {num}</span>
                    </Link>
                  ))}
                  <Link 
                    to="/communities" 
                    className="block text-xs text-pink-600 font-medium hover:underline mt-2 pl-5 transform hover:translate-x-1 transition-all"
                  >
                    View all your communities →
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Discover Section - No title, more styled */}
          <div className="bg-white shadow-md border-l-4 border-purple-400 p-4 transform -rotate-1.5 mb-4 relative">
            <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            <div className="space-y-2">
              <Link 
                to="/communities?sort=new" 
                className="block text-sm font-medium hover:text-teal-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:rotate-0.5"
              >
                <span className="w-3 h-3 rounded-full bg-teal-400 mr-2 transform hover:scale-125 transition-transform"></span> 
                New Communities
              </Link>
              <Link 
                to="/communities?sort=trending" 
                className="block text-sm font-medium hover:text-pink-600 flex items-center p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:-rotate-0.5"
              >
                <span className="w-3 h-3 rounded-full bg-pink-400 mr-2 transform hover:scale-125 transition-transform"></span> 
                Trending Communities
              </Link>
              <button 
                onClick={() => setActiveTab('trending')} 
                className="block text-sm font-medium hover:text-purple-600 flex items-center w-full text-left p-2 hover:bg-gray-50 hover:translate-x-1 transition-all rounded-sm transform hover:rotate-0.5"
              >
                <span className="w-3 h-3 rounded-full bg-purple-400 mr-2 transform hover:scale-125 transition-transform"></span> 
                Trending Posts
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content Area - Middle column */}
        <div className="flex-grow order-3 lg:order-2">
          {/* Trending Communities - Horizontal scrollable row */}
          <div className="bg-white shadow-sm rounded-sm mb-4 p-4 transform rotate-0.5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg uppercase tracking-tight relative inline-block">
                <span className="text-pink-500">Trending</span> Communities
                <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-pink-400"></span>
              </h2>
              <Link to="/communities" className="text-xs text-teal-600 hover:underline">
                View All →
              </Link>
            </div>
            
            <div className="flex space-x-3 overflow-x-auto pb-2 -mx-1 px-1">
              {loading ? (
                <div className="flex-grow text-center py-8 text-sm bg-gray-50">Loading...</div>
              ) : (
                trendingCommunities.map((community: any, index: number) => (
                  <Link 
                    key={community.id} 
                    to={`/community/${community.id}`}
                    className={`flex-shrink-0 w-48 bg-white border hover:shadow-md transition-shadow rounded-sm overflow-hidden flex flex-col ${
                      index % 3 === 0 ? 'border-t-2 border-teal-400' : 
                      index % 3 === 1 ? 'border-t-2 border-pink-400' : 
                      'border-t-2 border-purple-400'
                    }`}
                  >
                    <div className="p-3 flex items-center">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-2"
                        style={{ backgroundColor: index % 3 === 0 ? '#2dd4bf' : index % 3 === 1 ? '#f472b6' : '#a78bfa' }}
                      >
                        <span className="text-xs font-bold">{community.name.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="font-bold text-sm">{community.name}</div>
                        <div className="text-xs text-gray-500">{index * 42 + 12} members</div>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 text-xs border-t text-gray-700">
                      <p className="line-clamp-2">{community.description}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
          
          {/* Content Tab Navigation - Stylized */}
          <div className="flex mb-4 relative overflow-hidden bg-white shadow-sm rounded-t transform -rotate-0.5">
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-400"></div>
            
            <button 
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${
                activeTab === 'trending' 
                  ? 'text-white transform -skew-x-2' 
                  : 'text-gray-500 hover:text-gray-700 hover:-translate-y-0.5'
              }`}
              onClick={() => setActiveTab('trending')}
            >
              {activeTab === 'trending' && (
                <div className="absolute inset-0 bg-teal-500 -z-10 transform skew-x-12"></div>
              )}
              <span className="relative z-10">Trending Posts</span>
              {activeTab === 'trending' && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white"></span>}
            </button>
            
            <button 
              className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${
                activeTab === 'all' 
                  ? 'text-white transform skew-x-2' 
                  : 'text-gray-500 hover:text-gray-700 hover:-translate-y-0.5'
              }`}
              onClick={() => setActiveTab('all')}
            >
              {activeTab === 'all' && (
                <div className="absolute inset-0 bg-pink-500 -z-10 transform -skew-x-12"></div>
              )}
              <span className="relative z-10">Latest Posts</span>
              {activeTab === 'all' && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white"></span>}
            </button>
            
            {isAuthenticated && (
              <button 
                className={`px-5 py-3 text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden ${
                  activeTab === 'following' 
                    ? 'text-white transform -skew-x-2' 
                    : 'text-gray-500 hover:text-gray-700 hover:-translate-y-0.5'
                }`}
                onClick={() => setActiveTab('following')}
              >
                {activeTab === 'following' && (
                  <div className="absolute inset-0 bg-purple-500 -z-10 transform skew-x-12"></div>
                )}
                <span className="relative z-10">Following</span>
                {activeTab === 'following' && <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white"></span>}
              </button>
            )}
          </div>
          
          {/* Post Content */}
          <div className="bg-white shadow-sm rounded-sm p-4 mb-4 transform -rotate-0.5">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="font-bold text-lg uppercase tracking-tight relative inline-block">
                {activeTab === 'trending' && <span><span className="text-purple-500">Trending</span> Posts</span>}
                {activeTab === 'all' && <span><span className="text-purple-500">Latest</span> Posts</span>}
                {activeTab === 'following' && <span><span className="text-purple-500">Following</span> Feed</span>}
                <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-purple-400"></span>
              </h2>
              
              {/* Sort options - different options based on active tab */}
              <div className="flex items-center text-xs">
                {activeTab === 'trending' && (
                  <select className="bg-gray-100 border-none rounded py-1 px-2 text-xs">
                    <option>Hot</option>
                    <option>Top Today</option>
                    <option>Top This Week</option>
                    <option>Top This Month</option>
                  </select>
                )}
                
                {activeTab === 'all' && (
                  <select className="bg-gray-100 border-none rounded py-1 px-2 text-xs">
                    <option>New</option>
                    <option>Rising</option>
                    <option>Controversial</option>
                  </select>
                )}
                
                {activeTab === 'following' && (
                  <select className="bg-gray-100 border-none rounded py-1 px-2 text-xs">
                    <option>Recent</option>
                    <option>Top</option>
                  </select>
                )}
              </div>
            </div>
            
            {/* Descriptive text */}
            <div className="mb-4 text-xs text-gray-500 italic border-l-2 pl-2">
              {activeTab === 'trending' && (
                <p>Popular posts from all communities, sorted by votes and engagement</p>
              )}
              {activeTab === 'all' && (
                <p>Latest posts from all communities in chronological order</p>
              )}
              {activeTab === 'following' && (
                <p>Recent posts from communities you follow</p>
              )}
            </div>
            
            {/* Posts with optimized layout based on viewMode */}
            <div className={viewMode === 'compact' ? 'space-y-1' : 'space-y-4'}>
              <PostList 
                communityId={null} 
                postType={activeTab}
              />
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0 order-2 lg:order-3 mb-4 lg:mb-0">
          {/* Post creation options */}
          {isAuthenticated && (
            <div className="mb-4 space-y-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-3 py-2 bg-black text-white text-sm font-bold uppercase shadow hover:bg-gray-900 transition-colors flex items-center justify-center transform -rotate-0.5 border-b-2 border-teal-400"
              >
                <span className="mr-1">+</span> Create Post
              </button>
            </div>
          )}
          
          {/* View mode toggle - without title, more stylized */}
          <div className="bg-black text-white p-4 transform rotate-1 skew-x-1 shadow-md mb-4 border-t-2 border-teal-400">
            <div className="flex justify-center">
              <div className="inline-flex bg-gray-800 rounded-sm p-1 w-full">
                <button 
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all transform ${
                    viewMode === 'card' 
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white -rotate-0.5' 
                      : 'text-gray-300 hover:text-white hover:-translate-y-0.5'
                  }`}
                  onClick={() => setViewMode('card')}
                >
                  Card View
                </button>
                <button 
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all transform ${
                    viewMode === 'compact' 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rotate-0.5' 
                      : 'text-gray-300 hover:text-white hover:translate-y-0.5'
                  }`}
                  onClick={() => setViewMode('compact')}
                >
                  Compact View
                </button>
              </div>
            </div>
          </div>
          
          {/* Content preferences & tools - not duplicating profile functionality */}
          {isAuthenticated && (
            <div className="bg-black text-white p-4 transform -rotate-1 skew-y-1 shadow-md mb-4 relative border-l-4 border-pink-400">
              <div className="space-y-2">
                <Link 
                  to="/bookmarks"
                  className="w-full text-left p-2 text-sm rounded-sm bg-gray-900 hover:bg-gray-800 hover:translate-x-1 transition-all flex items-center transform hover:rotate-0.5"
                >
                  <span className="w-3 h-3 rounded-full bg-pink-400 mr-2 animate-pulse"></span>
                  Bookmarked Posts
                </Link>
                <Link 
                  to="/notifications"
                  className="w-full text-left p-2 text-sm rounded-sm bg-gray-900 hover:bg-gray-800 hover:translate-x-1 transition-all flex items-center transform hover:-rotate-0.5"
                >
                  <span className="w-3 h-3 rounded-full bg-teal-400 mr-2 animate-pulse"></span>
                  Notifications
                </Link>
                <button 
                  className="w-full text-left p-2 text-sm rounded-sm bg-gray-900 hover:bg-gray-800 hover:translate-x-1 transition-all flex items-center transform hover:rotate-0.5"
                  onClick={() => {
                    // This would toggle a dark mode or theme preference
                    alert('Theme preference would be toggled here');
                  }}
                >
                  <span className="w-3 h-3 rounded-full bg-purple-400 mr-2 animate-pulse"></span>
                  Toggle Theme
                </button>
              </div>
            </div>
          )}
          
          {/* About section - no title but more styled */}
          <div className="bg-black text-white p-4 transform rotate-0.5 skew-x-1 shadow-md mb-4 relative overflow-hidden border-r-4 border-purple-400">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></div>
            <p className="text-sm pl-2 relative z-10">
              <span className="text-teal-400 font-bold">RUMFOR</span> is a community platform where you can join communities, share posts, and connect with others.
            </p>
            <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-gray-900 rounded-full opacity-30"></div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}
