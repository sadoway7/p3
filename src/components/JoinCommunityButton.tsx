import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { joinCommunity, leaveCommunity, getCommunityMember } from '../api/communities-fix';

interface JoinCommunityButtonProps {
  communityId: string;
  className?: string;
  variant?: 'primary' | 'sidebar' | 'compact'; // Different visual styles
  onJoin?: () => void;
  onLeave?: () => void;
  showLeaveButton?: boolean; // Whether to show leave option (default true)
}

const JoinCommunityButton: React.FC<JoinCommunityButtonProps> = ({
  communityId,
  className = '',
  variant = 'primary',
  onJoin,
  onLeave,
  showLeaveButton = true,
}) => {
  const { token, isAuthenticated, user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check membership status on load
  useEffect(() => {
    if (isAuthenticated && token && user) {
      checkMembershipStatus();
    } else {
      setIsMember(false);
      setInitialCheckComplete(true);
    }
  }, [communityId, isAuthenticated, token, user]);
  
  // If the component doesn't unmount but props change, we should recheck
  useEffect(() => {
    if (isAuthenticated && token && user && initialCheckComplete) {
      checkMembershipStatus();
    }
  }, [communityId, isAuthenticated, token, user]);

  // Check if user is a member of this community
  const checkMembershipStatus = async () => {
    if (!isAuthenticated || !token || !user) {
      setIsMember(false);
      setInitialCheckComplete(true);
      return;
    }

    setError(null);
    try {
      // Try to get membership status from our communities-fix API with user ID
      console.log(`Checking membership for user ${user.id} in community ${communityId}`);
      const member = await getCommunityMember(communityId, token, user.id);
      console.log('Membership check returned:', member);
      
      // If we got a member object back, they are a member
      setIsMember(!!member);
    } catch (error) {
      console.error('Error checking membership:', error);
      // Don't show an error to the user, just assume they're not a member
      setIsMember(false);
    }
    setInitialCheckComplete(true);
  };

  // Join community handler
  const handleJoin = async () => {
    if (!isAuthenticated || !token) {
      alert('Please log in to join communities');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Set member immediately for better UX (optimistic update)
    setIsMember(true);
    
    try {
      // Make the API call to join
      await joinCommunity(communityId, token);
      
      // If we got here, it was successful!
      console.log('Successfully joined community');
      
      // Verify membership status to be sure
      await checkMembershipStatus();
      
      // Trigger any parent component callback
      if (onJoin) onJoin();
    } catch (error: unknown) {
      console.error('Failed to join community:', error);
      
      // Get the error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to join community. Please try again.';
      
      // Verify our membership status - maybe it succeeded despite the error
      await checkMembershipStatus();
      
      // If we're still not a member after the check, the join actually failed
      if (!isMember) {
        setError(errorMessage);
        // Reset the optimistic update
        setIsMember(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Leave community handler - simplified to match the join handler structure
  const handleLeave = async () => {
    if (!isAuthenticated || !token) return;
    
    if (!confirm('Are you sure you want to leave this community?')) {
      return;
    }

    setLoading(true);
    setError(null);
    
    // Set member immediately for better UX (optimistic update)
    setIsMember(false);
    
    try {
      // Make the API call to leave
      await leaveCommunity(communityId, undefined, token);
      
      // If we got here, it was successful!
      console.log('Successfully left community');
      
      // Verify membership status to be sure
      await checkMembershipStatus();
      
      // Trigger any parent component callback
      if (onLeave) onLeave();
    } catch (error: unknown) {
      console.error('Failed to leave community:', error);
      
      // Get the error message
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to leave community. Please try again.';
      
      // Verify our membership status - maybe it succeeded despite the error
      await checkMembershipStatus();
      
      // If we're still a member after the check, the leave actually failed
      if (isMember) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Button styles based on variant
  const getButtonStyles = () => {
    const baseStyles = 'transition-all duration-200 font-bold flex items-center justify-center';
    
    if (!initialCheckComplete) {
      return `${baseStyles} bg-gray-300 text-gray-600 cursor-wait opacity-70 py-1 px-3 rounded`;
    }
    
    if (!isAuthenticated) {
      if (variant === 'compact') {
        return `${baseStyles} bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-2 text-xs rounded`;
      }
      return `${baseStyles} bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded`;
    }
    
    if (isMember && showLeaveButton) {
      // Normal leave button styles
      if (variant === 'compact') {
        return `${baseStyles} bg-red-500 hover:bg-red-600 text-white py-1 px-2 text-xs rounded`;
      } else if (variant === 'sidebar') {
        return `${baseStyles} w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`;
      }
      return `${baseStyles} bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded`;
    }
    
    if (variant === 'compact') {
      return `${baseStyles} bg-teal-500 hover:bg-teal-600 text-white py-1 px-2 text-xs rounded`;
    } else if (variant === 'sidebar') {
      return `${baseStyles} w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2 px-4 rounded focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50`;
    }
    return `${baseStyles} bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded`;
  };

  // Button label
  const getButtonLabel = () => {
    if (!initialCheckComplete) return 'Loading...';
    if (!isAuthenticated) return 'Join';
    if (loading) return isMember ? 'Leaving...' : 'Joining...';
    if (isMember && showLeaveButton) {
      return 'Leave';
    }
    return 'Join';
  };

  // Click handler
  const handleClick = () => {
    if (!initialCheckComplete || loading) return;
    if (!isAuthenticated) {
      alert('Please log in to join communities');
      return;
    }
    
    if (isMember && showLeaveButton) {
      handleLeave();
    } else if (!isMember) {
      handleJoin();
    }
  };

  return (
    <div className="inline-block">
      <button
        className={`${getButtonStyles()} ${className}`}
        onClick={handleClick}
        disabled={loading || !initialCheckComplete}
        title={error || ''}
      >
        {getButtonLabel()}
      </button>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default JoinCommunityButton;