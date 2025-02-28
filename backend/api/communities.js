/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please import from the community module directly:
 * const communityApi = require('./community');
 */

// Import all functions from the community module
const communityApi = require('./community');

// Re-export all functions for backward compatibility
module.exports = communityApi;

// Log a deprecation warning when this file is imported
console.warn(
  'Warning: backend/api/communities.js is deprecated and will be removed in a future version. ' +
  'Please import from the community module directly: const communityApi = require(\'./community\');'
);
