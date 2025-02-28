/**
 * Community API Module
 * 
 * This module exports all community-related functions from the individual modules.
 * It serves as the main entry point for the community API.
 */

// Import all community modules
const communityCore = require('./community-core');
const communityRules = require('./community-rules');
const communitySettings = require('./community-settings');
const communityMembers = require('./community-members');
const communityRequests = require('./community-requests');
const communitySearch = require('./community-search');

// Re-export all functions
module.exports = {
  // Core operations
  getCommunities: communityCore.getCommunities,
  getCommunity: communityCore.getCommunity,
  createCommunity: communityCore.createCommunity,
  updateCommunity: communityCore.updateCommunity,
  deleteCommunity: communityCore.deleteCommunity,
  
  // Rules operations
  getCommunityRules: communityRules.getCommunityRules,
  addCommunityRule: communityRules.addCommunityRule,
  updateCommunityRule: communityRules.updateCommunityRule,
  deleteCommunityRule: communityRules.deleteCommunityRule,
  
  // Settings operations
  getCommunitySettings: communitySettings.getCommunitySettings,
  updateCommunitySettings: communitySettings.updateCommunitySettings,
  
  // Members operations
  getCommunityMembers: communityMembers.getCommunityMembers,
  getCommunityMember: communityMembers.getCommunityMember,
  addCommunityMember: communityMembers.addCommunityMember,
  updateCommunityMemberRole: communityMembers.updateCommunityMemberRole,
  removeCommunityMember: communityMembers.removeCommunityMember,
  
  // Join request operations
  getJoinRequests: communityRequests.getJoinRequests,
  getJoinRequest: communityRequests.getJoinRequest,
  createJoinRequest: communityRequests.createJoinRequest,
  updateJoinRequestStatus: communityRequests.updateJoinRequestStatus,
  
  // Search operations
  searchCommunities: communitySearch.searchCommunities,
  getDiscoverableCommunities: communitySearch.getDiscoverableCommunities,
  getTrendingCommunities: communitySearch.getTrendingCommunities,
  getRecommendedCommunities: communitySearch.getRecommendedCommunities
};
