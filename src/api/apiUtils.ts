// Determine the API base URL dynamically based on the current hostname
// This solves the issue of mobile devices trying to use localhost
export function getApiBaseUrl() {
  // If we're in a browser environment
  if (typeof window !== 'undefined') {
    // Use the current origin (hostname) for the API
    // This will work for both desktop and mobile devices
    return window.location.origin; 
  }
  
  // Fallback for non-browser environments (SSR)
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
}