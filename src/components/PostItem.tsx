import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, MessageCircle, Share2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { voteOnPost } from '../api/votes'
import { formatDistanceToNow } from 'date-fns'

interface PostItemProps {
  post: {
    id: string;
    title: string;
    content: string;
    username: string;
    timestamp: string;
    comments: number;
    votes: number;
    community_id?: string;
    community_name?: string;
  };
  communityId?: string | null;
  compact?: boolean;
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, MessageCircle, Share2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { voteOnPost } from '../api/votes'
import { formatDistanceToNow } from 'date-fns'

interface PostItemProps {
  post: {
    id: string;
    title: string;
    content: string;
    username: string;
    timestamp: string;
    comments: number;
    votes: number;
    community_id?: string;
    community_name?: string;
  };
  communityId?: string | null;
  compact?: boolean;
}

export default function PostItem({ post, communityId, compact = false }: PostItemProps) {
  const { user, token } = useAuth();
  const [votes, setVotes] = useState(post.votes || 0);
  const [userVote, setUserVote] = useState(0); // 0 = no vote, 1 = upvote, -1 = downvote
  const [voteLoading, setVoteLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // State for expanding content

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formattedTime = post.timestamp
    ? formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })
    : 'unknown time';

  const handleVote = async (voteValue: number) => {
    if (!user || !token) {
      // Prompt to login if not authenticated
      alert('Please log in to vote');
      return;
    }
    
    if (voteLoading) return;
    
    try {
      setVoteLoading(true);
      
      // Determine the new vote value
      let newVoteValue = voteValue;
      
      // If user clicks the same vote button again, remove the vote
      if (userVote === voteValue) {
        newVoteValue = 0;
      }
      
      // Calculate the vote difference for optimistic UI update
      const voteDifference = newVoteValue - userVote;
      
      // Update UI optimistically
      setUserVote(newVoteValue);
      setVotes(prev => prev + voteDifference);
      
      // Make API call
      await voteOnPost(post.id, newVoteValue, token);
    } catch (err) {
      console.error('Error voting:', err);
      
      // Revert optimistic updates on failure
      setUserVote(userVote);
      setVotes(post.votes);
      
      // Show error message
      alert('Failed to vote. Please try again.');
    } finally {
      setVoteLoading(false);
    }
  };

  // Render a more compact version when compact prop is true
  if (compact) {
    return (
      <div className="bg-white p-2 shadow-sm rounded-sm border-l-2 border-purple-400 hover:border-l-4 transition-all">
        <Link
          to={`/post/${post.id}`}
          className="block hover:text-purple-600 transition-colors"
        >
          <h3 className="font-medium text-sm text-gray-900 truncate">{post.title}</h3>
        </Link>
        <div className="text-xs text-gray-500 flex items-center mt-1">
          <span>{votes} votes</span>
          <span className="mx-1">•</span>
          <span>{post.comments} comments</span>
        </div>
      </div>
    );
  }

  // Regular post card
  return (
    <div className="bg-white p-4 shadow-sm rounded-sm transform hover:scale-[1.01] transition-transform border-l-4 border-teal-400">
      <div className="flex items-start space-x-4">
        {/* Voting */}
        <div className="flex flex-col items-center">
          <button
            className={`p-1 rounded-sm transition-colors ${
              userVote === 1
                ? 'text-teal-600'
                : 'text-gray-400 hover:text-teal-600'
            }`}
            onClick={() => handleVote(1)}
            disabled={voteLoading}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <span className={`text-sm font-medium ${
            votes > 0 ? 'text-teal-600' : votes < 0 ? 'text-pink-600' : 'text-gray-600'
          }`}>
            {votes}
          </span>
          <button
            className={`p-1 rounded-sm transition-colors transform rotate-180 ${
              userVote === -1
                ? 'text-pink-600'
                : 'text-gray-400 hover:text-pink-600'
            }`}
            onClick={() => handleVote(-1)}
            disabled={voteLoading}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Community and metadata */}
          <div className="mb-1 text-xs text-gray-500 flex items-center">
            {post.community_name && !communityId && (
              <>
                <Link
                  to={`/community/${post.community_id}`}
                  className="font-medium text-teal-600 hover:underline"
                >
                  r/{post.community_name}
                </Link>
                <span className="mx-1">•</span>
              </>
            )}
            <span>Posted by {post.username}</span>
            <span className="mx-1">•</span>
            <span>{formattedTime}</span>
          </div>
          
          {/* Title and content */}
          <Link
            to={`/post/${post.id}`}
            className="block hover:text-teal-600 transition-colors"
          >
            <h3 className="font-bold text-gray-900">{post.title}</h3>
          </Link>
          <p className={`text-sm text-gray-600 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
            {post.content}
          </p>
          {/* Toggle for expanding content */}
          {post.content.length > 100 && ( // Only show toggle if content is long enough
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-teal-600 hover:underline mt-1"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
          
          {/* Actions */}
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <Link
              to={`/post/${post.id}`}
              className="flex items-center space-x-1 hover:text-teal-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments} comment{post.comments !== 1 ? 's' : ''}</span>
            </Link>
            
            <button className="flex items-center space-x-1 hover:text-pink-600 transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}