import React, { useState, useEffect, useContext } from 'react'
import CommentItem from './CommentItem'
import { getPostComments, createComment, Comment } from '../api/comments'
import { AuthContext } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [sortOption, setSortOption] = useState<string>('new')
  const auth = useContext(AuthContext)
  const user = auth?.user
  const token = auth?.token

  // Function to fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true)
      console.log('Fetching comments for post:', postId)
      const data = await getPostComments(postId, true) // Get threaded comments
      console.log('Comments data:', data)
      setComments(data || []) // Ensure we always have an array even if API returns null/undefined
      setError(null)
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError('Failed to load comments')
      setComments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  // Fetch comments when component mounts
  useEffect(() => {
    if (postId) {
      fetchComments()
    } else {
      setLoading(false)
      setComments([])
    }
  }, [postId])

  // Handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim() || !user) {
      if (!user) {
        setError('You must be logged in to comment')
      }
      return
    }
    
    setError(null) // Clear any previous errors
    
    try {
      setSubmitting(true)
      console.log('Submitting comment for post:', postId)
      console.log('Comment text:', commentText)
      console.log('User:', user.username)
      
      const newComment = await createComment(
        postId, 
        { content: commentText },
        token
      )
      
      console.log('Comment submission successful, response:', newComment)
      
      // Clear the input
      setCommentText('')
      
      // Show success message temporarily
      setError('Comment posted successfully!')
      setTimeout(() => setError(null), 3000)
      
      // Fetch comments again to ensure we have the latest data
      fetchComments()
    } catch (err: any) {
      console.error('Error posting comment:', err)
      // Provide more detailed error message
      if (err instanceof Error) {
        setError(`Failed to post comment: ${err.message}`)
      } else {
        setError('Failed to post comment. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle reply submission
  const handleReply = async (parentId: string, content: string) => {
    if (!content.trim() || !user) return
    
    try {
      const newReply = await createComment(
        postId,
        { 
          content, 
          parentCommentId: parentId 
        },
        token
      )
      
      // Fetch comments again to ensure we have the latest data
      fetchComments()
      return true
    } catch (err) {
      console.error('Error posting reply:', err)
      if (err instanceof Error) {
        setError(`Failed to post reply: ${err.message}`)
      } else {
        setError('Failed to post reply. Please try again.')
      }
      setTimeout(() => setError(null), 3000)
      return false
    }
  }

  // Format comment data for display
  const formatCommentForDisplay = (comment: Comment): any => {
    return {
      ...comment,
      timestamp: comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : '',
      votes: comment.votes || 0, // Use actual votes from API
      replies: comment.replies ? comment.replies.map(formatCommentForDisplay) : []
    }
  }

  const formattedComments = comments.map(formatCommentForDisplay)
  
  // Sort comments based on the selected option
  const sortedComments = [...formattedComments].sort((a, b) => {
    if (sortOption === 'top') {
      return (b.votes || 0) - (a.votes || 0);
    } else if (sortOption === 'old') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      // Default 'new'
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (loading) {
    return (
      <div className="bg-white p-6 shadow-md mb-6 border-l-4 border-teal-400">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-100 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded ml-8"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 shadow-md mb-6 border-l-4 border-teal-400">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          Comments ({comments.length})
        </h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-600">Sort by:</span>
          <select 
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="new">New</option>
            <option value="top">Top</option>
            <option value="old">Old</option>
          </select>
        </div>
      </div>
      
      {/* Error/Success Display */}
      {error && (
        <div className={`mb-4 p-3 rounded text-sm ${
          error.includes('success') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {error}
        </div>
      )}
      
      {/* Comment form - Reddit-like UI with buttons inside */}
      <div className="mb-6 border-2 border-gray-100 rounded-md transition-all hover:border-teal-100">
        <h3 className="text-sm font-medium p-3 pb-1">Comment as {user ? user.username : 'guest'}</h3>
        <form onSubmit={handleSubmitComment}>
          <div className="relative">
            <textarea
              className="w-full p-3 pt-2 border-t border-gray-200 focus:outline-none transition-colors min-h-[100px]"
              placeholder={user ? "What are your thoughts?" : "Please sign in to comment"}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={!user || submitting}
            />
            
            {/* Formatting toolbar */}
            <div className="flex items-center px-3 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex-grow flex gap-2">
                <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  <span className="font-bold">B</span>
                </button>
                <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  <span className="italic">I</span>
                </button>
                <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  <span className="underline">U</span>
                </button>
                <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Link
                </button>
              </div>
              
              <button
                type="submit"
                className="px-4 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
                disabled={!user || !commentText.trim() || submitting}
              >
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Comments list */}
      <div className="space-y-4">
        {sortedComments.length > 0 ? (
          sortedComments.map((comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onReply={handleReply}
              level={0}
            />
          ))
        ) : (
          <div className="bg-gray-50 p-6 text-center rounded border border-gray-100">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  )
}