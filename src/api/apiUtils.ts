// Use relative URLs for API calls to solve deployment issues
export function getApiBaseUrl() {
  return ''; // This will make all API calls relative to the current domain
}

// Function to build API paths
export function getApiPath(path: string) {
  // Ensure the path starts with /api
  if (!path.startsWith('/api')) {
    path = `/api${path}`;
  }
  return path;
}
