import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Post from '../components/Post'
import CommentSection from '../components/CommentSection'
import ActivityHistory from '../components/ActivityHistory'
import { getPost } from '../api/posts'
import { useAuth } from '../context/AuthContext'

export default function PostDetail() {
  const { postId } = useParams()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!postId) return

      try {
        setLoading(true)
        const data = await getPost(postId, token)
        setPost(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching post details:', err)
        setError('Failed to load post details')
      } finally {
        setLoading(false)
      }
    }

    fetchPostDetails()
  }, [postId, token])

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse bg-white p-6 shadow-md mb-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white p-6 border-l-4 border-red-500 shadow-md mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      </div>
    )
  }

  // Return layout if post is loaded successfully
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Post postId={postId || ''} />
          <CommentSection postId={postId || ''} />
        </div>
        <div className="hidden lg:block">
          {post && post.community_id && (
            <div className="bg-white p-4 shadow-md mb-4 border-l-4 border-teal-400">
              <h3 className="font-bold text-lg mb-2">About This Community</h3>
              <Link 
                to={`/community/${post.community_id}`}
                className="block font-medium text-teal-600 hover:underline"
              >
                {post.community_name || 'View Community'}
              </Link>
              <p className="text-sm text-gray-600 mt-2">
                {post.community_description || 'Join the discussion in this community.'}
              </p>
            </div>
          )}
          
          <div className="bg-white p-4 shadow-md mb-4 border-l-4 border-pink-400">
            <h3 className="font-bold text-lg mb-2">Community Rules</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600">
              <li className="mb-1">Be respectful to others</li>
              <li className="mb-1">No spam or self-promotion</li>
              <li className="mb-1">Stay on topic</li>
            </ol>
          </div>
          
          <div className="bg-white p-4 shadow-md border-l-4 border-purple-400">
            <h3 className="font-bold text-lg mb-2">Post Activity</h3>
            <div className="max-h-[300px] overflow-y-auto">
              <ActivityHistory postId={postId || ''} limit={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}