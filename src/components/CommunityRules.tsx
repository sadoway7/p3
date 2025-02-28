import React, { useState, useEffect } from 'react';
import { getCommunityRules } from '../api/communities';

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
        setRules(fetchedRules);
      } catch (error: unknown) {
        console.error("Error fetching community rules:", error);
        // Do not show an error for missing rules - simply show no rules are set
        setRules([]);
        
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
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
      <div className="card p-4">
        <h2 className="font-medium mb-2">Community Rules</h2>
        <p className="text-sm text-gray-600">Loading rules...</p>
      </div>
    );
  }

  // Don't show error, just show "no rules" message
  if (rules.length === 0) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">Community Rules</h2>
        <p className="text-sm text-gray-600">No rules have been set for this community.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h2 className="font-medium mb-2">Community Rules</h2>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
        {rules.map((rule) => (
          <li key={rule.id}>
            <span className="font-medium">{rule.title}</span>
            {rule.description && (
              <p className="ml-5 text-xs">{rule.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
