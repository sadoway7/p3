import React, { useState, useEffect, useContext } from 'react'
import { ArrowUp, Reply, Edit, Trash2 } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { updateComment, deleteComment } from '../api/comments'
import { voteOnComment, getUserCommentVote } from '../api/votes'

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    username: string;
    timestamp: string;
    votes?: number;
    user_id?: string;
    replies?: any[];
  };
  onReply: (parentId: string, content: string) => Promise<boolean | undefined>;
  level: number;
}

export default function CommentItem({ comment, onReply, level = 0 }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [isDeleting, setIsDeleting] = useState(false)
  const [userVote, setUserVote] = useState<number>(0)
  const [voteLoading, setVoteLoading] = useState<boolean>(false)
  const [voteCount, setVoteCount] = useState<number>(comment.votes || 0)
  
  const auth = useContext(AuthContext)
  const user = auth?.user
  const token = auth?.token
  
  const isAuthor = user && user.id === comment.user_id
  const maxLevel = 6 // Maximum nesting level for replies
  
  // Fetch user's vote when component mounts
  useEffect(() => {
    const fetchUserVote = async () => {
      if (!user || !token || !comment.id) return
      
      try {
        const response = await getUserCommentVote(comment.id, token)
        setUserVote(response.value)
      } catch (err) {
        console.error('Error fetching user vote:', err)
      }
    }
    
    fetchUserVote()
  }, [comment.id, user, token])
  
  // Handle vote
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
      setVoteCount(prev => prev + voteDifference)
      
      // Make API call
      await voteOnComment(comment.id, newVoteValue, token)
    } catch (err) {
      console.error('Error voting:', err)
      
      // Revert optimistic updates on failure
      setUserVote(userVote)
      setVoteCount(comment.votes || 0)
      
      // Show error message
      alert('Failed to vote. Please try again.')
    } finally {
      setVoteLoading(false)
    }
  }
  
  // Handle reply submission
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!replyText.trim() || !user) return
    
    const success = await onReply(comment.id, replyText)
    
    if (success) {
      setReplyText('')
      setIsReplying(false)
    }
  }
  
  // Handle comment editing
  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editText.trim() || !isAuthor) return
    
    try {
      await updateComment(comment.id, editText, token)
      comment.content = editText
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating comment:', err)
    }
  }
  
  // Handle comment deletion
  const handleDeleteComment = async () => {
    if (!isAuthor) return
    
    try {
      setIsDeleting(true)
      await deleteComment(comment.id, token)
      // We would ideally remove this comment from the parent component's state
      // For now, we'll just hide it
      comment.content = '[deleted]'
      setIsDeleting(false)
    } catch (err) {
      console.error('Error deleting comment:', err)
      setIsDeleting(false)
    }
  }
  
  // Get indentation class based on nesting level
  const getIndentClass = () => {
    if (level === 0) return '';
    const indentLevel = Math.min(level, 6); // Cap at 6 levels
    return `ml-${indentLevel * 4}`;
  };
  
  // Determine color accent based on nesting level
  const colorAccents = ['teal', 'pink', 'purple', 'teal', 'pink', 'purple'];
  const colorAccent = colorAccents[level % colorAccents.length];
  
  return (
    <>
      <div className={`bg-white p-4 rounded-sm shadow-sm border-l-2 border-${colorAccent}-400 ${getIndentClass()} mb-3 hover:shadow-md transition-shadow`}>        
        <div className="flex items-start gap-2">
          {/* Voting */}
          <div className="flex flex-col items-center mr-2">
            <button
              className={`p-1 transition-colors ${
                userVote === 1 
                  ? `text-${colorAccent}-600`
                  : `text-gray-400 hover:text-${colorAccent}-600`
              }`}
              onClick={() => handleVote(1)}
              disabled={voteLoading}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className={`text-xs font-medium ${
              voteCount > 0 ? `text-${colorAccent}-600` : voteCount < 0 ? 'text-pink-600' : 'text-gray-700'
            }`}>
              {voteCount}
            </span>
            <button
              className={`p-1 transition-colors transform rotate-180 ${
                userVote === -1 
                  ? 'text-pink-600'
                  : 'text-gray-400 hover:text-pink-600'
              }`}
              onClick={() => handleVote(-1)}
              disabled={voteLoading}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <form onSubmit={handleEditComment} className="w-full">
                <textarea
                  className={`w-full p-2 border border-gray-200 rounded focus:border-${colorAccent}-400 focus:outline-none transition-colors`}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button 
                    type="submit"
                    className={`px-3 py-1 text-sm bg-${colorAccent}-600 text-white rounded hover:bg-${colorAccent}-700 transition-colors`}
                  >
                    Save
                  </button>
                  <button 
                    type="button"
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium text-${colorAccent}-600`}>{comment.username}</span>
                  <span className="text-xs text-gray-500">{comment.timestamp}</span>
                </div>
                
                <p className="text-gray-800 break-words">{comment.content}</p>
                
                {/* Action buttons */}
                <div className="flex gap-4 mt-2 text-xs">
                  {user && level < maxLevel && (
                    <button 
                      className={`flex items-center text-gray-500 hover:text-${colorAccent}-600 transition-colors`}
                      onClick={() => setIsReplying(!isReplying)}
                    >
                      <Reply className="w-3 h-3 mr-1" />
                      Reply
                    </button>
                  )}
                  
                  {isAuthor && (
                    <>
                      <button 
                        className="flex items-center text-gray-500 hover:text-teal-600 transition-colors"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      
                      <button 
                        className="flex items-center text-gray-500 hover:text-pink-600 transition-colors"
                        onClick={handleDeleteComment}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
            
            {/* Reply form */}
            {isReplying && (
              <form onSubmit={handleSubmitReply} className="mt-3">
                <textarea
                  className={`w-full p-2 border border-gray-200 rounded focus:border-${colorAccent}-400 focus:outline-none transition-colors`}
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button 
                    type="submit"
                    className={`px-3 py-1 text-sm bg-${colorAccent}-600 text-white rounded hover:bg-${colorAccent}-700 transition-colors`}
                    disabled={!replyText.trim()}
                  >
                    Reply
                  </button>
                  <button 
                    type="button"
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    onClick={() => {
                      setIsReplying(false)
                      setReplyText('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={`ml-4 pl-2 ${level < 1 ? 'border-l border-gray-200' : ''}`}>
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}