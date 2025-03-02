// Use relative URLs for API calls to solve deployment issues
export function getApiBaseUrl() {
  // When deployed, we can use relative URLs which will automatically
  // use the current domain and work in any environment
  return '';  // Empty string means use relative URLs
}

// Function to build API paths
export function getApiPath(path: string) {
  // Ensure the path starts with /api
  if (!path.startsWith('/api')) {
    path = `/api${path}`;
  }
  return path;
}