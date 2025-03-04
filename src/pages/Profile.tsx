import { getApiPath } from '../api/apiUtils'

import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import UserInfo from '../components/UserInfo'
import UserPosts from '../components/UserPosts'
import ProfileActions from '../components/ProfileActions'
import EditProfileModal from '../components/EditProfileModal'
import ActivityHistory from '../components/ActivityHistory'
import { useAuth } from '../context/AuthContext'
import { getPosts } from '../api/posts'
import { getUserById, getUserByUsername } from '../api/users'

interface ProfileProps {
  isUser?: boolean;
}

interface Post {
  id: string;
  title?: string;
  content: string;
  userId?: string;
  username?: string;
  communityId?: string;
  community?: string;
  created_at?: string;
  likes?: number;
  comments?: number;
}

interface UserData {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  role: string;
  created_at: string;
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

export default function Profile({ isUser }: ProfileProps) {
  const { username } = useParams()
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'community' | 'activity'>('profile')
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [communityPosts, setCommunityPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(user)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Fetch posts when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // If viewing own profile, use the authenticated user data
        if (isUser && user) {
          setUserData(user)
          
          // Fetch posts for the current user
          const posts = await getPosts(null, token)
          
          // For now, we'll just show all posts in the profile tab
          // In a real implementation, you'd filter these based on whether they're profile or community posts
          setProfilePosts(posts)
        } 
        // If viewing someone else's profile
        else if (username) {
          // Fetch user data by username
          try {
            // Get user by username
            const matchedUser = await getUserByUsername(username)
            
            if (!matchedUser) {
              throw new Error('User not found')
            }
            
            setUserData(matchedUser)
            
            // Fetch posts for this user
            const posts = await getPosts(null, token)
            // Filter posts by this user
            const userPosts = posts.filter((post: Post) => post.userId === matchedUser.id)
            setProfilePosts(userPosts)
          } catch (err) {
            setError('User not found')
          }
        }
      } catch (err) {
        setError(typeof err === 'string' ? err : 'Failed to load posts')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [isUser, user, username, token])

  return (
    <div className="w-full font-mono">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar - User Info */}
        <div className="w-full md:w-[300px] flex-shrink-0">
          <UserInfo 
            username={userData?.username || ''} 
            userData={userData}
            isCurrentUser={isUser}
            onEditProfile={() => setShowEditModal(true)}
          />
          
          {isUser && (
            <div className="mt-6">
              <ProfileActions onEditProfile={() => setShowEditModal(true)} />
            </div>
          )}
          
          {/* Edit Profile Modal */}
          {showEditModal && (
            <EditProfileModal
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false)
                // Refresh user data
                if (user) {
                  setUserData(user)
                }
              }}
            />
          )}
          
          {/* Communities Section */}
          <div className="mt-6 bg-black text-white p-6 transform -rotate-0.5 shadow-md">
            <h2 className="font-bold uppercase tracking-tight text-xl relative inline-block mb-4">
              <span className="text-teal-400">COMMUNITIES</span>
              <span className="absolute bottom-0 left-0 w-full h-1 bg-teal-400"></span>
            </h2>
            
            <div className="text-center py-4 text-gray-400">
              <p>No communities yet</p>
            </div>
          </div>
        </div>
        
        {/* Main Content - Posts */}
        <div className="flex-grow">
          {/* Tabs */}
          <div className="flex mb-6">
            <button 
              className={`flex-1 py-3 px-4 uppercase font-bold tracking-wider ${
                activeTab === 'profile' 
                  ? 'bg-black text-white border-b-2 border-teal-400' 
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              Profile Posts
            </button>
            <button 
              className={`flex-1 py-3 px-4 uppercase font-bold tracking-wider ${
                activeTab === 'community' 
                  ? 'bg-black text-white border-b-2 border-pink-400' 
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setActiveTab('community')}
            >
              Community Posts
            </button>
            <button 
              className={`flex-1 py-3 px-4 uppercase font-bold tracking-wider ${
                activeTab === 'activity' 
                  ? 'bg-black text-white border-b-2 border-purple-400' 
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>
          
          {/* Content based on active tab */}
          {activeTab === 'profile' ? (
            <>
              {loading ? (
                <div className="text-center py-12 text-2xl uppercase tracking-widest animate-pulse">
                  Loading posts...
                </div>
              ) : error ? (
                <div className="bg-black text-white p-4 mb-6">
                  <span className="text-pink-400 font-bold uppercase">ERROR:</span> {error}
                </div>
              ) : profilePosts.length === 0 ? (
                <div className="text-center py-12 bg-black text-white">
                  <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
                  <p className="mt-4 text-gray-300">No profile posts yet.</p>
                </div>
              ) : (
                <UserPosts username={userData?.username || ''} posts={profilePosts} />
              )}
            </>
          ) : activeTab === 'community' ? (
            <>
              {loading ? (
                <div className="text-center py-12 text-2xl uppercase tracking-widest animate-pulse">
                  Loading posts...
                </div>
              ) : error ? (
                <div className="bg-black text-white p-4 mb-6">
                  <span className="text-pink-400 font-bold uppercase">ERROR:</span> {error}
                </div>
              ) : communityPosts.length === 0 ? (
                <div className="text-center py-12 bg-black text-white">
                  <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
                  <p className="mt-4 text-gray-300">No community posts yet.</p>
                </div>
              ) : (
                <UserPosts username={userData?.username || ''} posts={communityPosts} />
              )}
            </>
          ) : (
            // Activity tab
            <ActivityHistory 
              userId={userData?.id} 
              showFilters={true} 
            />
          )}
        </div>
      </div>
    </div>
  )
}
