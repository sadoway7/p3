# Frontend API Endpoints Documentation

## Base URL Configuration
- The application uses relative URLs for API calls with `/api` prefix
- Development base URL: `http://localhost:3001`

## Activity Endpoints

### Activity Types
- `GET /api/activity/types`
  - Description: Get all activity types
  - Auth Required: Optional
  - Response: Array of ActivityType objects

### Action Types
- `GET /api/activity/actions`
  - Description: Get all action types
  - Auth Required: Optional
  - Response: Array of ActionType objects

### User Activities
- `GET /api/activity/me`
  - Description: Get activities for the current user
  - Auth Required: Optional
  - Query Parameters:
    - limit: number
    - offset: number
    - activityType: string
    - actionType: string
    - entityType: string
    - startDate: string
    - endDate: string

- `GET /api/activity/user/{userId}`
  - Description: Get activities for a specific user (admin only or self)
  - Auth Required: Optional
  - Same query parameters as above

### Community Activities
- `GET /api/activity/community/{communityId}`
  - Description: Get activities for a specific community
  - Auth Required: Optional
  - Same query parameters as above

### Post Activities
- `GET /api/activity/post/{postId}`
  - Description: Get activities for a specific post
  - Auth Required: Optional
  - Query Parameters:
    - limit: number
    - offset: number

### Activity Logging
- `POST /api/activity/log`
  - Description: Log a new activity (admin only)
  - Auth Required: Optional
  - Body: Activity data object

## Comments Endpoints

### Post Comments
- `GET /api/posts/{postId}/comments`
  - Description: Get all comments for a post
  - Auth Required: No
  - Query Parameters:
    - threaded: boolean

- `POST /api/posts/{postId}/comments`
  - Description: Create a new comment
  - Auth Required: Yes
  - Body: Comment data object

### Comment Operations
- `GET /api/comments/{commentId}`
  - Description: Get a specific comment
  - Auth Required: No

- `PUT /api/comments/{commentId}`
  - Description: Update a comment
  - Auth Required: Yes
  - Body: Updated comment content

- `DELETE /api/comments/{commentId}`
  - Description: Delete a comment
  - Auth Required: Yes

- `GET /api/comments/{commentId}/replies`
  - Description: Get replies to a comment
  - Auth Required: No

- `GET /api/posts/{postId}/comments/count`
  - Description: Get comment count for a post
  - Auth Required: No

## Communities Endpoints

### Community CRUD
- `GET /api/communities`
  - Description: Get all communities
  - Auth Required: No
  - Query Parameters:
    - search: string

- `POST /api/communities`
  - Description: Create a new community
  - Auth Required: Yes
  - Body: Community creation data

- `GET /api/communities/{communityId}`
  - Description: Get a specific community
  - Auth Required: No

- `PUT /api/communities/{communityId}`
  - Description: Update a community
  - Auth Required: Yes
  - Body: Updated community data

- `DELETE /api/communities/{communityId}`
  - Description: Delete a community
  - Auth Required: Yes

### Community Rules
- `GET /api/communities/{communityId}/rules`
  - Description: Get community rules
  - Auth Required: Optional

- `POST /api/communities/{communityId}/rules`
  - Description: Add a community rule
  - Auth Required: Yes
  - Body: Rule data

- `PUT /api/communities/{communityId}/rules/{ruleId}`
  - Description: Update a community rule
  - Auth Required: Yes
  - Body: Updated rule data

- `DELETE /api/communities/{communityId}/rules/{ruleId}`
  - Description: Delete a community rule
  - Auth Required: Yes

### Community Settings
- `GET /api/communities/{communityId}/settings`
  - Description: Get community settings
  - Auth Required: Yes

- `PUT /api/communities/{communityId}/settings`
  - Description: Update community settings
  - Auth Required: Yes
  - Body: Updated settings data

### Community Members
- `GET /api/communities/{communityId}/members`
  - Description: Get community members
  - Auth Required: Optional

- `POST /api/communities/{communityId}/members`
  - Description: Join a community
  - Auth Required: Yes

- `PUT /api/communities/{communityId}/members/{userId}`
  - Description: Update member role
  - Auth Required: Yes
  - Body: Role data

- `DELETE /api/communities/{communityId}/members`
  - Description: Leave community (self)
  - Auth Required: Yes

- `DELETE /api/communities/{communityId}/members/{userId}`
  - Description: Remove member from community
  - Auth Required: Yes

### Join Requests
- `GET /api/communities/{communityId}/join-requests`
  - Description: Get pending join requests
  - Auth Required: Yes

- `POST /api/communities/{communityId}/join-requests/{requestId}/approve`
  - Description: Approve a join request
  - Auth Required: Yes

- `POST /api/communities/{communityId}/join-requests/{requestId}/reject`
  - Description: Reject a join request
  - Auth Required: Yes

## Posts Endpoints

### Post Operations
- `GET /api/posts`
  - Description: Get all posts
  - Auth Required: Optional
  - Query Parameters:
    - communityId: string

- `POST /api/posts`
  - Description: Create a new post
  - Auth Required: Yes
  - Body: Post creation data

- `GET /api/posts/{postId}`
  - Description: Get a specific post
  - Auth Required: Optional

- `PUT /api/posts/{postId}`
  - Description: Update a post
  - Auth Required: Yes
  - Body: Updated post data

- `DELETE /api/posts/{postId}`
  - Description: Delete a post
  - Auth Required: Yes

## Users Endpoints

### User Operations
- `GET /api/auth/me`
  - Description: Get current user
  - Auth Required: Yes

- `GET /api/users/{userId}`
  - Description: Get user by ID
  - Auth Required: No

- `GET /api/users/lookup/{username}`
  - Description: Lookup user by username
  - Auth Required: No

- `GET /api/users`
  - Description: Get all users
  - Auth Required: No

- `PUT /api/users/profile`
  - Description: Update user profile
  - Auth Required: Yes
  - Body: Updated profile data

## Authentication Notes
- Most authenticated endpoints expect a Bearer token in the Authorization header
- Token is optional for some endpoints but may provide additional data/permissions when present
- Some endpoints have different behavior based on user role (admin/moderator/user)