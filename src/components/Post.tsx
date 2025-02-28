import React, { useState, useEffect } from 'react'
import { ArrowUp, MessageSquare, Share2, Bookmark } from 'lucide-react'
import { getPost } from '../api/posts'
import { voteOnPost } from '../api/votes'
import { getUserVoteOnPost } from '../api/compatibility'
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
  const { user, token } = useAuth()

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const data = await getPost(postId)
        setPost(data)
        setError(null)
      } catch (err: any) {
        console.error('Error fetching post:', err)
        setError(err.message || 'Failed to load post')
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
        // Use the compatibility layer function which handles errors
        const voteValue = await getUserVoteOnPost(postId, token)
        setUserVote(voteValue)
      } catch (err) {
        console.error('Error fetching user vote:', err)
        // Default to no vote
        setUserVote(0)
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
      
      // Toggle vote off if clicking the same button twice
      const newValue = userVote === voteValue ? 0 : voteValue
      
      await voteOnPost(postId, newValue, token)
      setUserVote(newValue)
      
      // Update post vote count optimistically
      if (post) {
        const votes = post.votes || 0
        setPost({
          ...post,
          votes: votes - userVote + newValue
        })
      }
    } catch (err) {
      console.error('Error voting:', err)
    } finally {
      setVoteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse">
        <div className="flex items-start space-x-4">
          {/* Vote buttons placeholder */}
          <div className="flex flex-col items-center space-y-1 w-10">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          
          {/* Post content placeholder */}
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-24 bg-gray-100 rounded mb-2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="text-gray-500">Post not found</div>
      </div>
    )
  }

  const {
    title,
    content,
    username,
    community_name,
    created_at,
    votes = 0,
    comments_count = 0
  } = post

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-start space-x-2">
        {/* Vote buttons */}
        <div className="flex flex-col items-center space-y-1">
          <button 
            className={`p-1 rounded hover:bg-gray-100 ${userVote === 1 ? 'text-orange-500' : 'text-gray-400'}`}
            onClick={() => handleVote(1)}
            disabled={voteLoading}
            aria-label="Upvote"
          >
            <ArrowUp size={20} />
          </button>
          
          <span className="text-xs font-medium text-gray-800">
            {votes}
          </span>
          
          <button 
            className={`p-1 rounded hover:bg-gray-100 ${userVote === -1 ? 'text-blue-500' : 'text-gray-400'}`}
            onClick={() => handleVote(-1)}
            disabled={voteLoading}
            aria-label="Downvote"
          >
            <ArrowUp size={20} className="transform rotate-180" />
          </button>
        </div>
        
        {/* Post content */}
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">
            Posted in <Link to={`/community/${post.community_id}`} className="hover:underline">{community_name}</Link>
            {' '}by {username} • {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </div>
          
          <h2 className="text-lg font-medium mb-2">{title}</h2>
          
          <div className="text-sm text-gray-700 mb-3">
            {content}
          </div>
          
          {/* Post actions */}
          <div className="flex items-center text-gray-500 text-xs">
            <Link to={`/post/${postId}`} className="flex items-center hover:bg-gray-100 px-2 py-1 rounded">
              <MessageSquare size={16} className="mr-1" />
              {comments_count} {comments_count === 1 ? 'Comment' : 'Comments'}
            </Link>
            
            <button className="flex items-center hover:bg-gray-100 px-2 py-1 rounded ml-2">
              <Share2 size={16} className="mr-1" />
              Share
            </button>
            
            <button className="flex items-center hover:bg-gray-100 px-2 py-1 rounded ml-2">
              <Bookmark size={16} className="mr-1" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}