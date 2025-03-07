import React, { useState, useEffect } from 'react';
import { getCommunityRules } from '../api/compatibility';

interface CommunityRule {
  id: string;
  title: string;
  description: string;
}

interface Props {
  communityId: string;
}

export default function CommunityRules({ communityId }: Props) {
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRules() {
      try {
        setLoading(true);
        const fetchedRules = await getCommunityRules(communityId);
        setRules(fetchedRules || []);
      } catch (error: unknown) {
        console.error("Error fetching community rules:", error);
        // Do not show an error for missing rules - simply show no rules are set
        setRules([]);
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Unknown error');
        }
      } finally {
        setLoading(false);
      }
    }

    if (communityId) {
      fetchRules();
    }
  }, [communityId]);

  if (loading) {
    return (
      <div className="bg-white rounded-md shadow p-4 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/6"></div>
        </div>
      </div>
    );
  }

  // Display nothing or a minimal message if no rules
  if (rules.length === 0) {
    return (
      <div className="bg-white rounded-md shadow p-4">
        <p className="text-gray-500">No rules have been set for this community yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <ol className="space-y-3 list-decimal list-inside">
        {rules.map((rule) => (
          <li key={rule.id} className="text-gray-700">
            <span className="font-medium">{rule.title}</span>
            {rule.description && (
              <p className="text-gray-600 ml-6 mt-1 text-sm">{rule.description}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}