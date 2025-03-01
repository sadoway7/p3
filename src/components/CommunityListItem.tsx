import React from 'react';
import { Link } from 'react-router-dom';
import JoinCommunityButton from './JoinCommunityButton';
import { Post } from '../types'; // Import Post interface

interface CommunityListItemProps {
  community: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    privacy?: 'public' | 'private';
  };
  index: number;
  isExpanded: boolean;
  communityColor: string;
  communitySearchTerm: string;
  toggleCommunityExpansion: (communityId: string) => void;
  updateCommunitySearchTerm: (communityId: string, term: string) => void;
  viewMode: 'list' | 'compact';
  communityPosts: Post[];
  loadingPosts: boolean;
  postErrors: string | null;
  fetchCommunityPosts: (communityId: string) => void
}

const CommunityListItem: React.FC<CommunityListItemProps> = ({
  community,
  index,
  isExpanded,
  communityColor,
  communitySearchTerm,
  toggleCommunityExpansion,
  updateCommunitySearchTerm,
  viewMode,
  communityPosts,
  loadingPosts,
  postErrors,
  fetchCommunityPosts
}) => {
  return (
    <div>
      {viewMode === 'compact' ? (
        // Compact View
        <>
          <div
            className="w-full bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 rounded-sm overflow-hidden flex flex-col"
            style={{ borderLeftColor: communityColor }}
          >
            <div className="flex items-center">
              <Link
                to={`/community/${community.id}`}
                className="flex-grow flex items-center"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white ml-2"
                  style={{ backgroundColor: communityColor }}
                >
                  <span className="text-xs font-bold">{community.name.substring(0, 2).toUpperCase()}</span>
                </div>

                <div className="flex-grow p-2 pl-3">
                  <div className="flex items-center">
                    <span className="font-bold text-sm hover:text-teal-600 transition-colors">
                      {community.name}
                    </span>

                    {community.privacy === 'private' && (
                      <span className="ml-2 text-xs bg-gray-100 px-1 py-0.5 text-pink-600 font-medium rounded-full">
                        P
                      </span>
                    )}

                    <span className="mx-2 text-gray-400">•</span>

                    <span className="text-xs text-gray-500">
                      <span className="font-medium">{index * 42 + 12}</span> members
                    </span>
                  </div>
                </div>
              </Link>


              <div className="flex items-center space-x-2 pr-2" >
                <JoinCommunityButton
                  communityId={community.id}
                  variant="compact"
                  className="px-2 py-0.5 text-white text-xs uppercase tracking-wider rounded-sm bg-black hover:bg-gray-800 transition-colors"
                  onJoin={() => {}} // onJoin is handled in Communities.tsx
                />
              </div>
            </div>
            {/* Expansion bar - bottom of compact view */}
            <button
              className="w-full h-1 bg-gray-300 hover:bg-gray-400 cursor-pointer"
              onClick={() => toggleCommunityExpansion(community.id)}
            ></button>
          </div>

            {/* Expanded Content for Compact View */}
            {isExpanded && (
            <div className="mt-1 mb-1 ml-10 mr-2 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">{community.description}</p>

              {/* Community-specific search bar */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search in ${community.name}...`}
                    value={communitySearchTerm}
                    onChange={(e) => updateCommunitySearchTerm(community.id, e.target.value)}
                    className="w-full p-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:border-teal-400"
                  />
                  <button
                    className="absolute right-0 top-0 h-full px-3 text-gray-600 hover:text-teal-600"
                  >
                    ⌕
                  </button>
                </div>

                {/* Search results - only show when search term exists */}
                {communitySearchTerm.trim().length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded">
                    <div className="p-2 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-medium">Search Results</span>
                      <span className="text-xs text-gray-500">Max 10 results</span>
                    </div>

                    {/* Placeholder results */}
                    {Array.from({ length: Math.min(communitySearchTerm.length + 1, 10) }).map((_, resultIndex) => (
                      <div key={resultIndex} className="py-2 px-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-start">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0"
                            style={{ backgroundColor: communityColor }}
                          ></div>
                          <div>
                            <h5 className="text-sm font-medium">
                              {communitySearchTerm} result #{resultIndex + 1}
                            </h5>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Posted by User{resultIndex + 100} • {resultIndex + 1} days ago
                            </p>
                            <p className="text-xs mt-1 text-gray-700">
                              Post containing search term "{communitySearchTerm}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty state when no results */}
                    {communitySearchTerm.length > 0 && communitySearchTerm.length < 1 && (
                      <div className="p-3 text-center text-xs text-gray-500">
                        No results found for "{communitySearchTerm}"
                      </div>
                    )}

                    {/* Link to view all results */}
                    <div className="p-2 bg-gray-50 text-center">
                      <Link to={`/community/${community.id}?search=${encodeURIComponent(communitySearchTerm)}`} className="text-xs text-teal-600 hover:underline">
                        View all results →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-3 text-xs mb-2">
                <span className="text-gray-500">
                  <span className="font-medium">{index * 17 + 8}</span> posts
                </span>
                <span className="text-gray-500">
                  Created: <span className="font-medium">{community.created_at ? new Date(community.created_at).toLocaleDateString() : 'recently'}</span>
                </span>
              </div>

              <Link
                to={`/community/${community.id}`}
                className="text-xs text-teal-600 hover:underline"
              >
                View full community →
              </Link>
            </div>
          )}
        </>
      ) : (
        // Standard List View
        <div
          className="w-full bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 rounded-sm overflow-hidden flex flex-col"
          style={{ borderLeftColor: communityColor }}
        >
          <div className="p-3">
            {/* Community Header with Join Button */}
            <div className="flex items-center justify-between">
              <Link to={`/community/${community.id}`} className="flex items-center flex-grow">
                {/* Community Icon/Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-3"
                  style={{ backgroundColor: communityColor }}
                >
                  <span className="text-sm font-bold">{community.name.substring(0, 2).toUpperCase()}</span>
                </div>

                <div>
                  <div className="flex items-center">
                    <span className="font-bold text-base hover:text-teal-600 transition-colors">
                      {community.name}
                    </span>

                    {/* Privacy tag */}
                    {community.privacy === 'private' && (
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 text-pink-600 font-medium rounded-full">
                        PRIVATE
                      </span>
                    )}

                  </div>

                  {/* Community Description */}
                  <p className="text-sm text-gray-700 line-clamp-2 mt-1">{community.description}</p>

                  {/* Community Stats Row */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-gray-500">
                      <span className="font-medium">{index * 42 + 12}</span> members
                    </span>
                    <span className="text-gray-500">
                      <span className="font-medium">{index * 17 + 8}</span> posts
                    </span>
                    <span className="text-gray-500">
                      Created: <span className="font-medium">{community.created_at ? new Date(community.created_at).toLocaleDateString() : 'recently'}</span>
                    </span>
                  </div>
                </div>
              </Link>

              <div>
                <JoinCommunityButton
                  communityId={community.id}
                  variant="compact"
                  className="bg-black hover:bg-gray-800 text-white text-xs uppercase tracking-wider rounded-sm"
                  onJoin={() => {}} // onJoin is handled in Communities.tsx
                />
              </div>
            </div>
          </div>

          {/* Expansion bar - bottom of standard view */}
          <button
            className="w-full h-6 bg-gray-100 hover:bg-gray-100 cursor-pointer"
            onClick={() => toggleCommunityExpansion(community.id)}
            >
             <span className="text-xxs text-gray-400">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>


            {/* Expanded Community Content */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {/* Community-specific search bar */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search in ${community.name}...`}
                      value={communitySearchTerm}
                      onChange={(e) => updateCommunitySearchTerm(community.id, e.target.value)}
                      className="w-full p-2 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-teal-400"
                    />
                    <button
                      className="absolute right-0 top-0 h-full px-3 text-gray-600 hover:text-teal-600"
                    >
                      ⌕
                    </button>
                  </div>

                  {/* Search results - only show when search term exists */}
                  {communitySearchTerm.trim().length > 0 && (
                    <div className="mt-2 bg-white border border-gray-200 rounded">
                      <div className="p-2 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-medium">Search Results</span>
                        <span className="text-xs text-gray-500">Max 10 results</span>
                      </div>

                      {/* Placeholder results */}
                      {Array.from({ length: Math.min(communitySearchTerm.length + 1, 10) }).map((_, resultIndex) => (
                        <div key={resultIndex} className="py-2 px-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-start">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0"
                              style={{ backgroundColor: communityColor }}
                            ></div>
                            <div>
                              <h5 className="text-sm font-medium">
                                {communitySearchTerm} result #{resultIndex + 1}
                              </h5>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Posted by User{resultIndex + 100} • {resultIndex + 1} days ago
                              </p>
                              <p className="text-xs mt-1 text-gray-700">
                                Post containing search term "{communitySearchTerm}"
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Empty state when no results */}
                      {communitySearchTerm.length > 0 && communitySearchTerm.length < 1 && (
                        <div className="p-3 text-center text-xs text-gray-500">
                          No results found for "{communitySearchTerm}"
                        </div>
                      )}

                      {/* Link to view all results */}
                      <div className="p-2 bg-gray-50 text-center">
                        <Link to={`/community/${community.id}?search=${encodeURIComponent(communitySearchTerm)}`} className="text-xs text-teal-600 hover:underline">
                          View all results →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real community posts */}
                <div className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Recent Posts</h4>
                    <Link to={`/community/${community.id}`} className="text-xs text-teal-600 hover:underline">
                      View All
                    </Link>
                  </div>

                  {/* Loading state */}
                  {loadingPosts && (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <span className="ml-2 text-xs text-gray-500">Loading posts...</span>
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {postErrors && (
                    <div className="text-center py-3">
                      <p className="text-xs text-red-500">{postErrors}</p>
                      <button
                        onClick={() => fetchCommunityPosts(community.id)}
                        className="text-xs text-teal-600 mt-1 hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {/* Real posts */}
                  {!loadingPosts && communityPosts && communityPosts.length > 0 && (
                    communityPosts.slice(0, 3).map((post) => (
                      <div key={post.id} className="py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-start">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 mr-2 flex-shrink-0"
                            style={{ backgroundColor: communityColor }}
                          ></div>
                          <div>
                            <Link to={`/post/${post.id}`}>
                              <h5 className="text-sm font-medium hover:text-teal-600">{post.title}</h5>
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Posted by {post.username || 'User'} · {new Date(post.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs mt-1 line-clamp-2">
                              {post.content.substring(0, 100)}{post.content.length > 100 ? '...' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Empty state */}
                  {!loadingPosts &&
                    (!communityPosts || communityPosts.length === 0) &&
                    !postErrors && (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500">No posts in this community yet.</p>
                      <Link
                        to={`/community/${community.id}`}
                        className="text-xs text-teal-600 mt-1 hover:underline block"
                      >
                        Be the first to post
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CommunityListItem;