import React from 'react'

interface Post {
  id: string;
  title?: string;
  content: string;
  timestamp?: string;
  likes?: number;
  comments?: number;
  userId?: string;
  username?: string;
  communityId?: string;
  community?: string;
  created_at?: string;
}

interface UserPostsProps {
  username: string;
  posts?: Post[];
}

export default function UserPosts({ username, posts = [] }: UserPostsProps) {
  return (
    <div className="space-y-6">
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-black text-white">
          <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
          <p className="mt-4 text-gray-300">No posts yet.</p>
        </div>
      ) : (
        posts.map((post, index) => (
          <div 
            key={post.id}
            className={`bg-white p-6 shadow-md transform relative ${index % 2 === 0 ? 'rotate-0.5' : '-rotate-0.5'}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${
              index % 3 === 0 ? 'bg-teal-400' : 
              index % 3 === 1 ? 'bg-pink-400' : 
              'bg-purple-400'
            }`}></div>
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl">{post.title || 'Untitled Post'}</h3>
                <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                  <span>Posted {post.timestamp || post.created_at || 'recently'}</span>
                  {post.community && (
                    <>
                      <span>•</span>
                      <span>in r/{post.community}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <p className="mt-4 text-gray-800">{post.content}</p>
            
            <div className="mt-4 flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-1">
                <span className="text-pink-500">♥</span>
                <span>{post.likes || 0} likes</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-teal-500">💬</span>
                <span>{post.comments || 0} comments</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
