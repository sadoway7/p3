# Community API Module

This directory contains the refactored Community API module, which has been split into smaller, more maintainable files.

## Module Structure

- `index.js` - Main entry point that re-exports all functions
- `community-core.js` - Basic CRUD operations for communities
- `community-rules.js` - Community rule management
- `community-settings.js` - Community settings operations
- `community-members.js` - Community member management
- `community-requests.js` - Join request handling
- `community-search.js` - Search and discovery functions

## Usage

### Importing the entire module

```javascript
const communityApi = require('./community');

// Use any function from the module
const communities = await communityApi.getCommunities();
const community = await communityApi.getCommunity(communityId);
```

### Importing specific functions

```javascript
const { getCommunity, createCommunity } = require('./community');

// Use the imported functions
const community = await getCommunity(communityId);
const newCommunity = await createCommunity(communityData);
```

### Importing from specific submodules

```javascript
// Import only the search functions
const communitySearch = require('./community/community-search');

// Use the search functions
const results = await communitySearch.searchCommunities('gaming');
const trending = await communitySearch.getTrendingCommunities();
```

## Database Schema

This module interacts with the following tables:

- `community` - Core community data
- `community_setting` - Community settings
- `community_rule` - Community rules
- `community_member` - Community membership
- `community_join_request` - Join requests
- `activity` - Activity logging
- `activity_type` - Activity type definitions
- `action` - Action type definitions

## Activity Logging

All operations that modify data include activity logging. The activity logs include:

- User who performed the action
- Type of activity (COMMUNITY, COMMUNITY_RULE, etc.)
- Action performed (CREATE, UPDATE, DELETE, etc.)
- Entity affected
- Timestamp
- Additional metadata where relevant

## Error Handling

All functions include proper error handling and will throw descriptive error messages if operations fail. Transactions are used to ensure data consistency, with automatic rollback on failure.
