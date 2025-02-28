import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, MessageCircle } from 'lucide-react'

export default function PostItem({ post }) {
  return (
    <div className="wireframe-border wireframe-shadow p-4">
      <div className="flex items-start space-x-4">
        {/* Voting */}
        <div className="flex flex-col items-center">
          <button className="p-1">
            <ArrowUp className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-sm font-medium text-gray-600">
            {post.votes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Link 
            to={`/post/${post.id}`} 
            className="wireframe-link"
          >
            <h3 className="font-medium text-gray-900">{post.title}</h3>
          </Link>
          <p className="text-sm text-gray-600 mt-1">{post.content}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <span>Posted by {post.username}</span>
            <span>•</span>
            <span>{post.timestamp}</span>
          </div>
        </div>

        {/* Comments */}
        <Link
          to={`/post/${post.id}`}
          className="flex items-center space-x-1 text-gray-600 wireframe-link"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments}</span>
        </Link>
      </div>
    </div>
  )
}
