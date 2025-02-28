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

  // Fetch comments when component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true)
        const data = await getPostComments(postId, true) // Get threaded comments
        setComments(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching comments:', err)
        setError('Failed to load comments')
      } finally {
        setLoading(false)
      }
    }

    fetchComments()
  }, [postId])

  // Handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commentText.trim() || !user) return
    
    try {
      setSubmitting(true)
      const newComment = await createComment(
        postId, 
        { content: commentText },
        token
      )
      
      // Add the new comment to the list
      setComments(prevComments => [...prevComments, {
        ...newComment,
        username: user.username,
        replies: []
      }])
      
      // Clear the input
      setCommentText('')
    } catch (err) {
      console.error('Error posting comment:', err)
      setError('Failed to post comment')
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
      
      // Update the comments state to include the new reply
      setComments(prevComments => {
        // Create a deep copy of the comments array
        const updatedComments = JSON.parse(JSON.stringify(prevComments))
        
        // Find the parent comment
        const findAndAddReply = (comments: any[]) => {
          for (let i = 0; i < comments.length; i++) {
            if (comments[i].id === parentId) {
              // Add the reply to this comment
              if (!comments[i].replies) {
                comments[i].replies = []
              }
              comments[i].replies.push({
                ...newReply,
                username: user.username,
                replies: []
              })
              return true
            }
            
            // Check in replies recursively
            if (comments[i].replies && comments[i].replies.length > 0) {
              if (findAndAddReply(comments[i].replies)) {
                return true
              }
            }
          }
          return false
        }
        
        findAndAddReply(updatedComments)
        return updatedComments
      })
      
      return true
    } catch (err) {
      console.error('Error posting reply:', err)
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
      <div className="bg-white p-6 shadow-md mb-6">
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

  return (
    <div className="bg-white p-6 shadow-md mb-6">
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
      
      {/* Comment form */}
      <div className="mb-6 border border-gray-200 rounded-md p-3">
        <h3 className="text-sm font-medium mb-2">Comment as {user ? user.username : 'guest'}</h3>
        <form onSubmit={handleSubmitComment}>
          <textarea
            className="w-full p-3 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            rows={4}
            placeholder={user ? "What are your thoughts?" : "Please sign in to comment"}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={!user || submitting}
          />
          <div className="flex justify-end mt-2">
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              disabled={!user || !commentText.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
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
          <div className="bg-gray-50 p-6 text-center rounded">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  )
}