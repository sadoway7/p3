# API Path Fixes Required

## Components to Fix

### Immediate Fixes (Hardcoded URLs)
1. Profile Page
```typescript
// Add imports:
import { getUserByUsername, getAllUsers } from '../api/users';
import { getApiPath } from '../api/apiUtils';

// Replace direct fetch call:
// Change from:
const response = await fetch('http://localhost:3001/api/users')
const users = await response.json()
const matchedUser = users.find((user: any) => user.username === username)

// To:
const matchedUser = await getUserByUsername(username);

// Remove console.error statements:
- console.error('Failed to fetch user data:', err)
- console.error('Failed to fetch posts:', err)

// Improve error handling:
catch (err) {
  setError(typeof err === 'string' ? err : 'Failed to load user profile');
  setLoading(false);
}

// Add proper TypeScript types:
interface UserData {
  id: string;
  username: string;
  email?: string;
  bio?: string;
  role: string;
  created_at: string;
  // ... other user fields
}

// Update state definition:
const [userData, setUserData] = useState<UserData | null>(null);
```

2. CommunityModeration
```typescript
// Change from:
fetch(`http://localhost:3001/api/communities/${communityId}/members/${user.id}`)
// To:
import { isUserModerator } from '../api/moderation';
```

3. CommunityList
```typescript
// Change from:
fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/communities/${community.id}/members/current`)
// To:
import { getCommunityMember } from '../api/communities';
```

4. AuthContext
```typescript
// Remove API base URL definition:
- const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Add import:
+ import { getApiPath } from '../api/apiUtils';

// Change fetch calls:
// From:
fetch(`${API_BASE_URL}/api/auth/me`...)
fetch(`${API_BASE_URL}/api/auth/login`...)
fetch(`${API_BASE_URL}/api/auth/register`...)

// To:
fetch(getApiPath('/auth/me')...)
fetch(getApiPath('/auth/login')...)
fetch(getApiPath('/auth/register')...)
```

### API Version Standardization
1. Replace communities-fix.ts usage:
- JoinCommunityButton
- CommunityAbout
- CommunityHeader

2. Replace compatibility layer usage:
- ActivityHistory
- CommunityRules
- PostList

3. Replace posts-fix.ts usage:
- PostList
- PostCreationForm

4. Update CommunityCreatePostModal:
```typescript
// Remove console.log statements:
- console.log('Creating post with data:', postData);
- console.log('New post created:', newPost);
- console.error('Failed to fetch community details:', error);

// Move UUID generation to API layer:
// Change from:
id: crypto.randomUUID(),
// To:
// Let the API handle ID generation

// Update imports:
- import { createPost } from '../api/posts-fix';
+ import { createPost } from '../api/posts';
```

5. Update CommunityModeration:
```typescript
// Import new utilities:
import { getApiPath } from '../api/apiUtils';
import { getMemberRole, getCommunityMember } from '../api/communities';

// Replace direct fetch with API call:
// Change from:
const result = await fetch(`http://localhost:3001/api/communities/${communityId}/members/${user.id}`...)
// To:
const member = await getCommunityMember(communityId, user.id, token);

// Remove all console statements:
- console.error('Error checking moderator status:', err);
- console.error('Error loading community:', err);
- console.error('Error loading join requests:', error);
- console.error('Error approving join request:', error);
- console.error('Error rejecting join request:', error);

// Improve error handling:
// Change from:
alert('Failed to approve join request');
alert('Failed to reject join request');
// To:
setError('Failed to approve join request. Please try again.');
setError('Failed to reject join request. Please try again.');

// Add error display component for better user feedback:
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    {error}
  </div>
)}
```

## Implementation Steps

1. Update apiUtils.ts to ensure consistent path handling:
```typescript
export const getApiPath = (path: string) => {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (!path.startsWith('/api/')) {
    path = `/api/${path}`;
  }
  return `${base}${path}`;
};
```

2. Update direct fetch calls to use apiUtils:
```typescript
import { getApiPath } from '../api/apiUtils';
// Use getApiPath for any remaining fetch calls
```

3. Replace -fix and compatibility versions:
```typescript
// Instead of:
import { getCommunityPosts } from '../api/compatibility';
// Use:
import { getPosts } from '../api/posts';
```

6. Update Communities Page:
```typescript
// Remove console.error statements:
- console.error(`Error fetching posts for community ${communityId}:`, error);
- console.error('Failed to fetch communities:', err);
- console.error('Failed to fetch user communities:', error);

// Replace alert with proper UI feedback:
// Change from:
onClick={() => alert('This will show all your communities')}
// To:
onClick={() => navigate('/communities/user')} // Or show a modal with the list

// Add proper type definitions:
interface CommunityError {
  [communityId: string]: string | null;
}

interface LoadingState {
  [communityId: string]: boolean;
}

interface Community {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
  member_count?: number;
  post_count?: number;
}

// Improve error handling:
setError(typeof err === 'string' ? err : 'Failed to load communities. Please try again.');

// Add loading states with better feedback:
{loadingPosts[communityId] && (
  <div className="text-center py-4">
    <LoadingSpinner message="Loading community posts..." />
  </div>
)}
```

## Priority Order
1. Fix hardcoded URLs first (most critical)
2. Standardize on single API version for each feature
3. Ensure all fetch calls use apiUtils

## Testing
1. Test each fixed component with:
   - Development environment
   - Production environment
   - Different API base URLs
