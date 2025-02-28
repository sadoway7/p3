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
    <div className="grid grid-cols-1 gap-6 font-mono">
      {communities.length === 0 ? (
        <div className="col-span-full text-center py-12 bg-black text-white shadow-lg">
          <span className="text-2xl uppercase font-bold tracking-wider">EMPTY</span>
          <p className="mt-4 text-gray-300">No communities found. Create one to get started!</p>
        </div>
      ) : (
        communities.map((community, index) => (
          <div
            key={community.id}
            className={`bg-white p-6 shadow-lg transform hover:translate-x-1 hover:-translate-y-1 transition-transform relative ${index % 2 === 0 ? 'rotate-0.5' : '-rotate-0.5'}`}
          >
            <div className={`absolute top-0 left-0 w-2 h-full ${getColorClass(index)}`}></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex-grow">
                <Link
                  to={`/community/${community.id}`}
                  className="font-bold text-xl hover:text-teal-600 transition-colors inline-block relative"
                >
                  r/{community.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <p className="text-base mt-3 mb-4 md:mb-0 md:pr-8">{community.description}</p>
              </div>
              <div className="flex-shrink-0">
                <button 
                  className={`px-6 py-3 text-white text-sm uppercase tracking-wider shadow-md relative overflow-hidden group 
                    ${joiningMap[community.id] ? 'bg-gray-500 cursor-wait' : 'bg-black hover:bg-gray-800 transition-colors'}`}
                  onClick={(e) => handleJoin(e, community.id)}
                  disabled={joiningMap[community.id]}
                >
                  <span className="relative z-10">{joiningMap[community.id] ? 'Joining...' : 'Join'}</span>
                  <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                </button>
              </div>
            </div>
            
            <div className="mt-5 flex flex-wrap items-center text-sm space-x-6 border-t border-gray-100 pt-4">
              {community.members !== undefined && (
                <div className="bg-gray-100 px-3 py-1 shadow-sm">
                  <span className="font-bold text-teal-600">{community.members}</span> members
                </div>
              )}
              
              {(community.isPublic === false || community.privacy === 'private') && (
                <div className="bg-gray-100 px-3 py-1 shadow-sm">
                  <span className="text-pink-600 font-bold">PRIVATE</span>
                </div>
              )}
              
              {community.created_at && (
                <div className="text-gray-500">
                  Created <span className="text-purple-600">{new Date(community.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
