import { useState } from 'react';
import { getApiBaseUrl } from '../api/apiUtils';

interface TestResult {
  name: string;
  url: string;
  status: 'success' | 'error';
  data?: Record<string, unknown>;
  error?: string;
}

export default function ApiConnectionTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = getApiBaseUrl();
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'Not defined';

  // Different API URL strategies to try
  const apiUrls = [
    // Strategy 1: Use getApiBaseUrl() from apiUtils.ts
    { name: 'apiUtils.getApiBaseUrl()', url: `${apiBaseUrl}/api/test` },
    
    // Strategy 2: Use VITE_API_BASE_URL from environment
    { name: 'VITE_API_BASE_URL', url: `${viteApiBaseUrl}/test` },
    
    // Strategy 3: Relative URL with /api prefix
    { name: 'Relative URL (/api/test)', url: '/api/test' },
    
    // Strategy 4: Absolute URL without port
    { name: 'Same origin without port', url: `${window.location.protocol}//${window.location.hostname}/api/test` },
    
    // Strategy 5: Absolute URL with port 3001
    { name: 'Direct to port 3001', url: `${window.location.protocol}//${window.location.hostname}:3001/api/test` },
    
    // Strategy 6: localhost:3001 (only works if backend running locally)
    { name: 'localhost:3001', url: 'http://localhost:3001/api/test' },
  ];

  async function testAllConnections() {
    setLoading(true);
    setError(null);
    const newResults: TestResult[] = [];

    for (const api of apiUrls) {
      try {
        const result = await testConnection(api.url);
        newResults.push({
          name: api.name,
          url: api.url,
          status: 'success',
          data: result as Record<string, unknown>
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        newResults.push({
          name: api.name,
          url: api.url,
          status: 'error',
          error: errorMessage
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  }

  async function testConnection(url: string) {
    console.log(`Testing connection to: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Error testing ${url}:`, err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Connection Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Environment Information</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="font-medium">Window Location:</div>
          <div>{window.location.href}</div>
          
          <div className="font-medium">apiUtils.getApiBaseUrl():</div>
          <div>{apiBaseUrl}</div>
          
          <div className="font-medium">VITE_API_BASE_URL:</div>
          <div>{viteApiBaseUrl}</div>
          
          <div className="font-medium">Hostname:</div>
          <div>{window.location.hostname}</div>
        </div>
      </div>

      <button
        onClick={testAllConnections}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test All API Connections'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 rounded ${
                  result.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                <div className="font-medium">{result.name}</div>
                <div className="text-sm text-gray-600 mb-2">{result.url}</div>
                
                {result.status === 'success' ? (
                  <div>
                    <div className="text-green-700">✓ Success</div>
                    <pre className="mt-2 p-2 bg-gray-800 text-green-400 rounded text-sm overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-red-700">✗ Error: {result.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}