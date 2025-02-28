import React, { useEffect, useState } from 'react';
import { getCommunityMembers } from '../api/communities';

interface Props {
  communityId: string;
}

/**
 * This is a debug component that we can place in the UI to see what's 
 * happening with the moderator data
 */
export default function ModeratorDebug({ communityId }: Props) {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get raw members data to see what's in it
        const members = await getCommunityMembers(communityId);
        setRawData(members);
        
        // Look specifically at members with role = 'moderator' or 'admin'
        const mods = members.filter((member: any) => 
          member.role === 'moderator' || member.role === 'admin'
        );
        
        console.log('Raw members data:', members);
        console.log('Moderator data:', mods);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [communityId]);
  
  return (
    <div className="bg-black text-white p-4 max-w-lg rounded-lg">
      <h3 className="text-xl font-bold mb-2">Moderator Debug</h3>
      
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {rawData && (
        <div>
          <h4 className="text-lg font-semibold mt-2">Raw Member Data Structure</h4>
          <pre className="text-xs bg-gray-900 p-2 rounded overflow-auto max-h-40 mt-1">
            {JSON.stringify(rawData[0] || {}, null, 2)}
          </pre>
          
          <h4 className="text-lg font-semibold mt-4">Moderators</h4>
          <ul className="mt-1">
            {rawData
              .filter((m: any) => m.role === 'moderator' || m.role === 'admin')
              .map((mod: any, i: number) => (
                <li key={i} className="border-b border-gray-700 py-1">
                  <span className="text-blue-400">ID:</span> {mod.user_id}<br/>
                  <span className="text-blue-400">Username:</span> {mod.username || 'Not available'}<br/>
                  <span className="text-blue-400">Role:</span> {mod.role}
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </div>
  );
}