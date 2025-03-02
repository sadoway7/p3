import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  formatActivity,
  ActivityQueryOptions
} from '../api/activities';
import { getActivityHistory } from '../api/compatibility';

interface Activity {
  id: string;
  user_id: string;
  activity_type_id: string;
  action_id: string;
  entity_id?: string;
  entity_type?: string;
  metadata?: any;
  created_at: string;
  activity_type_name: string;
  action_name: string;
  username?: string;
  entity_details?: any;
}

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
      let result: Activity[] = [];
      
      // Use the compatibility layer to get activities
      if (communityId) {
        result = await getActivityHistory('community', communityId, token) as Activity[];
      } else if (userId) {
        result = await getActivityHistory('user', userId, token) as Activity[];
      } else if (postId) {
        result = await getActivityHistory('post', postId, token) as Activity[];
      }
      
      setActivities(result);
      setHasMore(result.length === limit);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMore = () => {
    setOffset(prev => prev + limit);
  };
  
  if (loading && activities.length === 0) {
    return <div className="text-center py-2">Loading activities...</div>;
  }
  
  if (error && activities.length === 0) {
    return (
      <div className="text-center text-red-500 py-2">
        Error loading activities: {error}
      </div>
    );
  }
  
  if (activities.length === 0) {
    return <div className="text-center py-2">No recent activity.</div>;
  }
  
  return (
    <div className="activity-history">
      {showFilters && (
        <div className="filters mb-4 flex gap-2 flex-wrap">
          <select 
            value={activityType} 
            onChange={e => setActivityType(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Activity Types</option>
            <option value="POST">Posts</option>
            <option value="COMMENT">Comments</option>
            <option value="VOTE">Votes</option>
            <option value="COMMUNITY">Communities</option>
          </select>
          
          <select 
            value={actionType} 
            onChange={e => setActionType(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="UPVOTE">Upvote</option>
            <option value="DOWNVOTE">Downvote</option>
            <option value="JOIN">Join</option>
            <option value="LEAVE">Leave</option>
          </select>
          
          <select 
            value={entityType} 
            onChange={e => setEntityType(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Entities</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
            <option value="community">Communities</option>
            <option value="user">Users</option>
          </select>
        </div>
      )}
      
      <ul className="divide-y">
        {activities.map(activity => (
          <li key={activity.id} className="py-2">
            <div className="flex justify-between">
              <div>
                <strong>{activity.username || 'User'}</strong> {' '}
                {formatActivity(activity)}
              </div>
              <div className="text-gray-500 text-sm">
                {new Date(activity.created_at).toLocaleString()}
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {hasMore && (
        <button 
          onClick={loadMore} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

export default ActivityHistory;