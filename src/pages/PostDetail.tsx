import React from 'react'
import { useParams } from 'react-router-dom'
import Post from '../components/Post'
import CommentSection from '../components/CommentSection'
import ActivityHistory from '../components/ActivityHistory'

export default function PostDetail() {
  const { postId } = useParams()

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Post postId={postId || ''} />
          <CommentSection postId={postId || ''} />
        </div>
        <div className="hidden lg:block">
          <div className="bg-white p-4 shadow-md mb-4">
            <h3 className="font-bold text-lg mb-2">About This Community</h3>
            <p className="text-sm text-gray-600">
              This is where you can find information about the community this post belongs to.
            </p>
          </div>
          <div className="bg-white p-4 shadow-md mb-4">
            <h3 className="font-bold text-lg mb-2">Community Rules</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600">
              <li className="mb-1">Be respectful to others</li>
              <li className="mb-1">No spam or self-promotion</li>
              <li className="mb-1">Stay on topic</li>
            </ol>
          </div>
          <div className="bg-white p-4 shadow-md">
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
