# API Development Plan

This document outlines the plan for developing the API for the application.

## 1. Directory Structure

We will create an `api` directory within the `src` directory to house all API-related code. This will keep the API logic separate from the UI components.

```
src/
  api/
    posts.ts
    communities.ts
    users.ts
    ...
```

## 2. API Endpoints

Based on the existing TODO comments in the application, we can identify the following potential API endpoints:

- **Posts:**
    - `/api/posts`: Get all posts (or a list of posts based on certain criteria, including visibility).
    - `/api/posts/:postId`: Get a specific post by ID.
    - `/api/posts`: Create a new post (including a `privacy` field: "public" or "private").
    - `/api/posts/:postId`: Update an existing post (including the `privacy` field).
    - `/api/posts/:postId`: Delete a post.
    - `/api/posts/:postId/comments`: Get comments for a specific post.
    - `/api/posts/:postId/comments`: Create a comment for a post.

- **Communities:**
    - `/api/communities`: Get all communities.
    - `/api/communities/:communityId`: Get a specific community by ID.
    - `/api/communities`: Create a new community.
    - `/api/communities/:communityId`: Update an existing community.
    - `/api/communities/:communityId`: Delete a community.
    - `/api/communities/:communityId/rules`: Get rules for a community.
    - `/api/communities/:communityId/settings`: Get settings for a community.
    - `/api/communities/:communityId/about`: Get "about" information for a community.
    - `/api/user/communities`: Get communities for the logged-in user.

- **Users:**
    - `/api/users/:userId/posts`: Get posts for a specific user.

## 3. API Structure

We will create separate files for each resource within the `api` directory (e.g., `posts.ts`, `communities.ts`, `users.ts`). Each file will contain functions for interacting with that resource's API endpoints.

## 4. Technology

- **Frontend:** We will use the standard `fetch` API for making requests from the React components.
- **Backend:** We will create a separate repository for the backend and use Express.js to build the API server. This allows for independent scaling and deployment of the API. The user has also mentioned having a MariaDB setup, which we can use.

## 5. Initial API Functions (Example - posts.ts)

```typescript
// src/api/posts.ts

export async function getPosts(visibility?: 'public' | 'private') {
  // Fetch posts from the API.  If visibility is specified, filter accordingly.
  // If no visibility is specified, the backend might default to public posts,
  // or return both public and private posts depending on user authentication/authorization.
}

export async function getPost(postId: string) {
  // Fetch a specific post by ID
}

export async function createPost(postData: { title: string, content: string, privacy: 'public' | 'private' }) {
  // Create a new post, including privacy setting
}

export async function updatePost(postId: string, postData: { title?: string, content?: string, privacy?: 'public' | 'private' }) {
  // Update an existing post, including privacy setting
}

export async function deletePost(postId: string) {
  // Delete a post
}

export async function getComments(postId: string){
    // Fetch comments for a specific post
}
```

Similar functions would be created for other resources (communities, users).

## 6. Missing Features and Considerations

The current plan covers basic CRUD operations for posts, communities, and users. However, a fully featured social website typically includes many other features, such as:

-   **User Authentication/Authorization:** Login, registration, profile management, password reset, etc.
-   **Friend/Follower System:**  The ability for users to connect with each other.
-   **Real-time Features:** Notifications, chat, live updates.
-   **Liking/Voting:**  Upvoting/downvoting or liking posts and comments.
-   **Searching:**  Ability to search for users, communities, and posts.
-   **Content Moderation:**  Reporting and blocking users/content.
-   **User Roles/Permissions:**  Different levels of access (e.g., admin, moderator, regular user).
-   **Media Uploads:**  Support for image and video uploads.
-   **Groups/Sub-communities:**  Nested communities within communities.
-   **Recommendations:**  Suggested communities, users, or content.
-   **Profiles:** User profiles with customizable information.

## 7. Iterative Approach

Building a social website is a complex undertaking. It's best to adopt an iterative approach:

1.  **Start with Core Functionality:** Implement the basic features outlined in sections 2 and 5 above. This provides a foundation to build upon.
2.  **Prioritize Additional Features:**  Based on user feedback and project goals, prioritize the additional features listed in section 6.
3.  **Iterate and Expand:**  Add features incrementally, testing and refining as you go.

What features do you consider the highest priority for the initial version of the API?

## 8. Next Steps
- User approval of this plan.
- Switch to "Code" mode to implement.
- Create a new directory `src/api`.
- Create the files `posts.ts`, `communities.ts`, and `users.ts` inside `src/api`.
- Implement the basic API functions using `fetch`.
- Set up a separate backend repository with Express.js.