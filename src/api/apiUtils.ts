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