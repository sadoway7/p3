import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getCurrentUserActivities, 
  getUserActivities, 
  getCommunityActivities,
  getPostActivities,
  formatActivity,
  ActivityQueryOptions,
  Activity
} from '../api/activities';

interface ActivityHistoryProps {
  userId?: string;
  communityId?: string;
  postId?: string;
  limit?: number;
  showFilters?: boolean;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  userId, 
  communityId, 
  postId, 
  limit = 20,
  showFilters = false
}) => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter states
  const [activityType, setActivityType] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('');
  
  useEffect(() => {
    fetchActivities();
  }, [userId, communityId, postId, offset, activityType, actionType, entityType]);
  
  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const options: ActivityQueryOptions = {
        limit,
        offset,
        activityType: activityType || undefined,
        actionType: actionType || undefined,
        entityType: entityType || undefined
      };
      
      let fetchedActivities: Activity[] = [];
      
      if (postId) {
        // Fetch activities for a specific post
        fetchedActivities = await getPostActivities(postId, options, token);
      } else if (communityId) {
        // Fetch activities for a specific community
        fetchedActivities = await getCommunityActivities(communityId, options, token);
      } else if (userId) {
        // Fetch activities for a specific user
        fetchedActivities = await getUserActivities(userId, options, token);
      } else {
        // Fetch activities for the current user
        fetchedActivities = await getCurrentUserActivities(options, token);
      }
      
      if (offset === 0) {
        setActivities(fetchedActivities);
      } else {
        setActivities(prev => [...prev, ...fetchedActivities]);
      }
      
      setHasMore(fetchedActivities.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    setOffset(prev => prev + limit);
  };
  
  const resetFilters = () => {
    setActivityType('');
    setActionType('');
    setEntityType('');
    setOffset(0);
  };
  
  const getActivityIcon = (activity: Activity) => {
    const { activity_type_name, action_name } = activity;
    
    // Default icon
    let icon = '📝';
    
    // Activity type icons
    if (activity_type_name === 'POST') {
      icon = '📄';
    } else if (activity_type_name === 'COMMENT') {
      icon = '💬';
    } else if (activity_type_name === 'VOTE') {
      icon = action_name === 'UPVOTE' ? '👍' : action_name === 'DOWNVOTE' ? '👎' : '🗳️';
    } else if (activity_type_name === 'COMMUNITY') {
      icon = '👥';
    } else if (activity_type_name === 'USER') {
      icon = '👤';
    } else if (activity_type_name === 'MODERATION') {
      icon = '🛡️';
    }
    
    return icon;
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Activity History</h2>
      
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm text-gray-600">Activity Type</label>
              <select
                className="w-full p-2 border rounded"
                value={activityType}
                onChange={(e) => {
                  setActivityType(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All</option>
                <option value="POST">Posts</option>
                <option value="COMMENT">Comments</option>
                <option value="VOTE">Votes</option>
                <option value="COMMUNITY">Communities</option>
                <option value="USER">Users</option>
                <option value="MODERATION">Moderation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600">Action Type</label>
              <select
                className="w-full p-2 border rounded"
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="UPVOTE">Upvote</option>
                <option value="DOWNVOTE">Downvote</option>
                <option value="JOIN">Join</option>
                <option value="LEAVE">Leave</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600">Entity Type</label>
              <select
                className="w-full p-2 border rounded"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All</option>
                <option value="post">Posts</option>
                <option value="comment">Comments</option>
                <option value="community">Communities</option>
                <option value="user">Users</option>
              </select>
            </div>
          </div>
          
          <button
            className="mt-2 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {loading && offset === 0 ? (
        <div className="text-center py-4">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No activities found</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="border-b pb-2">
              <div className="flex items-start">
                <div className="text-2xl mr-3">{getActivityIcon(activity)}</div>
                <div>
                  <div className="text-sm">
                    {formatActivity(activity)}
                  </div>
                  {activity.username && (
                    <div className="text-xs text-gray-500">
                      by {activity.username}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <div className="text-center pt-2">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
