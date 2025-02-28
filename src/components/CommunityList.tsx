import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinCommunity } from '../api/communities';

interface Community {
  id: string;
  name: string;
  description: string;
  members?: number;
  isPublic?: boolean;
  created_at?: string;
  updated_at?: string;
  privacy?: 'public' | 'private';
}

interface CommunityListProps {
  communities: Community[];
}

export default function CommunityList({ communities }: CommunityListProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [joiningMap, setJoiningMap] = React.useState<Record<string, boolean>>({});
  
  // Function to get a color based on index
  const getColorClass = (index: number) => {
    const colors = [
      'border-teal-400',
      'border-pink-400',
      'border-purple-400'
    ];
    return colors[index % colors.length];
  };

  const handleJoin = async (e: React.MouseEvent, communityId: string) => {
    e.preventDefault(); // Prevent navigating to community page
    
    if (!isAuthenticated) {
      alert('Please log in to join this community');
      return;
    }
    
    try {
      // Set this community as joining
      setJoiningMap(prev => ({ ...prev, [communityId]: true }));
      console.log(`Attempting to join community ${communityId} from CommunityList`);
      
      const result = await joinCommunity(communityId, token);
      console.log('Join result:', result);
      
      // Check response message to show appropriate alert
      if (result.message && result.message.includes('approval')) {
        alert('Join request submitted for approval');
      } else {
        alert('Successfully joined community!');
      }
      
      // Force-refresh the page to update membership state everywhere
      window.location.reload();
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('invite-only')) {
          alert('This community is invite-only');
        } else if (error.message.includes('approval')) {
          alert('Join request submitted for approval');
        } else {
          alert(`Error: ${error.message}`);
        }
      } else {
        alert('An error occurred');
      }
      console.error('Join error:', error);
    } finally {
      // Clear the joining state
      setJoiningMap(prev => ({ ...prev, [communityId]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 font-mono">
      {communities.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-black text-white shadow-lg">
          <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
          <p className="mt-4 text-gray-300">No communities found. Create one to get started!</p>
        </div>
      ) : (
        communities.map((community, index) => (
          <div
            key={community.id}
            className="bg-white shadow-md rounded-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col md:flex-row">
              {/* Left color strip */}
              <div className={`w-1 md:w-2 flex-shrink-0 ${getColorClass(index)}`}></div>
              
              <div className="flex-grow p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center mb-1">
                      <Link
                        to={`/community/${community.id}`}
                        className="font-bold text-lg hover:text-teal-600 transition-colors"
                      >
                        {community.name}
                      </Link>
                      
                      {/* Privacy tag */}
                      {(community.isPublic === false || community.privacy === 'private') && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 text-pink-600 font-medium rounded-full">
                          PRIVATE
                        </span>
                      )}
                    </div>
                    
                    {/* Community stats in a horizontal row */}
                    <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
                      {community.members !== undefined && (
                        <div>
                          <span className="font-medium text-gray-700">{community.members}</span> members
                        </div>
                      )}
                      
                      {community.created_at && (
                        <div>
                          Created <span className="text-gray-700">{new Date(community.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3 md:mb-0 md:pr-8 line-clamp-2">{community.description}</p>
                  </div>
                  
                  <div className="flex-shrink-0 mt-2 md:mt-0">
                    <button 
                      className={`px-4 py-1 text-white text-xs uppercase tracking-wider rounded-sm relative overflow-hidden
                        ${joiningMap[community.id] ? 'bg-gray-400 cursor-wait' : 'bg-black hover:bg-gray-800 transition-colors'}`}
                      onClick={(e) => handleJoin(e, community.id)}
                      disabled={joiningMap[community.id]}
                    >
                      {joiningMap[community.id] ? 'Joining...' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
