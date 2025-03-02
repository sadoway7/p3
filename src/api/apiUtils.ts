// Use relative URLs for API calls to solve deployment issues
export function getApiBaseUrl() {
  // Dynamically connect to backend using the window's hostname
  // This works both locally and when deployed
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001'; // Fallback for SSR or non-browser environments
}

// Function to build API paths
export function getApiPath(path: string) {
  // Ensure the path starts with /api
  if (!path.startsWith('/api')) {
    path = `/api${path}`;
  }
  return path;
}