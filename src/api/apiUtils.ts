// Get the base URL for API requests
export function getApiBaseUrl() {
  // Use environment variable if available, otherwise default to origin
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
}

// Function to build API paths, ensuring they are relative
export function getApiPath(path: string) {
  // Ensure the path starts with /api
  let apiPath = path;
  if (!apiPath.startsWith('/api')) {
    apiPath = `/api${apiPath}`;
  }
  
  // Ensure no double slashes
  apiPath = apiPath.replace(/\/\//g, '/');
  
  return apiPath;
}
