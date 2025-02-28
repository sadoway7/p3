import React, { useState, useEffect } from 'react'
import { ArrowUp, MessageSquare, Share2, Bookmark } from 'lucide-react'
import { getPost } from '../api/posts'
import { voteOnPost, getUserPostVote } from '../api/votes'
import { useAuth } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

interface PostProps {
  postId: string;
}

export default function Post({ postId }: PostProps) {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [userVote, setUserVote] = useState<number>(0)
  const [voteLoading, setVoteLoading] = useState<boolean>(false)
  const [votes, setVotes] = useState<number>(0)
  const { user, token } = useAuth()

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const data = await getPost(postId, token)
        setPost(data)
        setVotes(data.votes || 0)
        setError(null)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId, token])

  useEffect(() => {
    // Fetch user's vote if they're logged in
    const fetchUserVote = async () => {
      if (!user || !token || !postId) return
      
      try {
        const response = await getUserPostVote(postId, token)
        setUserVote(response.value)
      } catch (err) {
        console.error('Error fetching user vote:', err)
      }
    }
    
    fetchUserVote()
  }, [postId, user, token])

  const handleVote = async (voteValue: number) => {
    if (!user || !token) {
      // Prompt to login if not authenticated
      alert('Please log in to vote')
      return
    }
    
    if (voteLoading) return
    
    try {
      setVoteLoading(true)
      
      // Determine the new vote value
      let newVoteValue = voteValue
      
      // If user clicks the same vote button again, remove the vote
      if (userVote === voteValue) {
        newVoteValue = 0
      }
      
      // Calculate the vote difference for optimistic UI update
      const voteDifference = newVoteValue - userVote
      
      // Update UI optimistically
      setUserVote(newVoteValue)
      setVotes(prev => prev + voteDifference)
      
      // Make API call
      await voteOnPost(postId, newVoteValue, token)
    } catch (err) {
      console.error('Error voting:', err)
      
      // Revert optimistic updates on failure
      setUserVote(userVote)
      setVotes(votes)
      
      // Show error message
      alert('Failed to vote. Please try again.')
    } finally {
      setVoteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 shadow-md mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 border-l-4 border-red-500 shadow-md mb-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="bg-white p-6 border-l-4 border-yellow-500 shadow-md mb-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Post not found</span>
        </div>
        <p className="mt-2 text-gray-600">This post doesn't exist or has been deleted.</p>
      </div>
    )
  }

  // Format timestamp
  const timestamp = post.timestamp || post.created_at
  const formattedTime = timestamp 
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : 'unknown time'

  return (
    <div className="bg-white p-6 shadow-md mb-6 border-l-4 border-teal-400 transform hover:scale-[1.005] transition-transform">      
      <div className="flex">
        {/* Voting */}
        <div className="flex flex-col items-center mr-4">
          <button 
            className={`p-1 rounded transition-colors ${
              userVote === 1 
                ? 'text-teal-600'
                : 'text-gray-400 hover:text-teal-600'
            }`}
            onClick={() => handleVote(1)}
            disabled={voteLoading}
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <span className={`font-medium my-1 ${
            votes > 0 ? 'text-teal-600' : votes < 0 ? 'text-pink-600' : 'text-gray-700'
          }`}>
            {votes}
          </span>
          <button 
            className={`p-1 rounded transition-colors transform rotate-180 ${
              userVote === -1 
                ? 'text-pink-600'
                : 'text-gray-400 hover:text-pink-600'
            }`}
            onClick={() => handleVote(-1)}
            disabled={voteLoading}
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Post metadata */}
          <div className="mb-2 text-sm text-gray-500">
            {post.community_name || post.community ? (
              <Link to={`/community/${post.community_id}`} className="font-medium text-teal-600 hover:underline">
                r/{post.community_name || post.community}
              </Link>
            ) : (
              <span className="font-medium">Posted by {post.username || 'Anonymous'}</span>
            )}
            <span className="mx-1">·</span>
            <span>{formattedTime}</span>
          </div>
          
          {/* Post title and content */}
          <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
          <div className="text-gray-800 mb-4 whitespace-pre-line">
            {post.content}
          </div>
          
          {/* Post tags/categories if available */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Post Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex space-x-6">
        <button className="flex items-center text-gray-500 hover:text-teal-600 transition-colors">
          <MessageSquare className="w-5 h-5 mr-1" />
          <span>Comments</span>
        </button>
        
        <button className="flex items-center text-gray-500 hover:text-pink-600 transition-colors">
          <Share2 className="w-5 h-5 mr-1" />
          <span>Share</span>
        </button>
        
        <button className="flex items-center text-gray-500 hover:text-purple-600 transition-colors">
          <Bookmark className="w-5 h-5 mr-1" />
          <span>Save</span>
        </button>
      </div>
    </div>
  )
}