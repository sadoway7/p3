// Use relative URLs for API calls to solve deployment issues
export function getApiBaseUrl() {
  // Use VITE_API_BASE_URL environment variable if available, otherwise default to relative URLs
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  return apiUrl || ''; // Use VITE_API_BASE_URL or relative URLs if not set
}

// Function to build API paths
export function getApiPath(path: string) {
  // Ensure the path starts with /api
  if (!path.startsWith('/api')) {
    path = `/api${path}`;
  }
  return path;
}