import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCommunitySettings, updateCommunitySettings, updateCommunity } from '../api/communities';
import { getCommunity, getCommunityMember } from '../api/communities-fix';
import { useAuth } from '../context/AuthContext';

interface CommunitySettings {
  community_id: string;
  allow_post_images: boolean;
  allow_post_links: boolean;
  join_method: 'auto_approve' | 'requires_approval' | 'invite_only';
  require_post_approval: boolean;
  restricted_words: string | null;
  custom_theme_color: string | null;
  custom_banner_url: string | null;
  minimum_account_age_days: number;
  minimum_karma_required: number;
  updated_at: Date;
}

interface Community {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
}

interface Props {
  communityId: string;
}

export default function CommunitySettings({ communityId }: Props) {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [settingsData, communityData] = await Promise.all([
          getCommunitySettings(communityId),
          getCommunity(communityId)
        ]);
        setSettings(settingsData);
        setCommunity(communityData);
        
        // Check if user is a moderator or platform admin
        if (user && token && user.id) {
          // Platform admins always have moderator access to all communities
          if (user.role === 'admin') {
            setIsModerator(true);
            console.log(`User is a platform admin with moderator access to community ${communityId}`);
          } else {
            try {
              const member = await getCommunityMember(communityId, token, user.id);
              
              if (member) {
                // If we got a result, check if they're a moderator or admin
                setIsModerator(member.role === 'moderator' || member.role === 'admin');
                console.log(`User is ${member.role} of community ${communityId}`);
              } else {
                console.log(`User is not a member of community ${communityId}`);
                setIsModerator(false);
              }
            } catch (err) {
              console.error("Error checking moderator status:", err);
            }
          }
        }
      } catch (error: unknown) {
        console.error("Error fetching community settings:", error);
        
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
      fetchData();
    }
  }, [communityId, user, token]);

  // Create default data when only partial data is available
  useEffect(() => {
    if (!settings && community) {
      // Create default settings to display
      setSettings({
        community_id: community.id,
        allow_post_images: true,
        allow_post_links: true,
        join_method: 'auto_approve',
        require_post_approval: false,
        restricted_words: null,
        custom_theme_color: null,
        custom_banner_url: null,
        minimum_account_age_days: 0,
        minimum_karma_required: 0,
        updated_at: new Date()
      });
    }
    
    // If we have settings but no community data
    if (settings && !community) {
      // Create basic community info
      setCommunity({
        id: communityId,
        name: 'Community',
        description: 'No description available',
        privacy: 'public'
      });
    }
  }, [settings, community, communityId]);

  const handleTogglePrivacy = async () => {
    if (!community) return;
    
    try {
      setSaving(true);
      const newPrivacy = community.privacy === 'public' ? 'private' : 'public';
      const updatedCommunity = await updateCommunity(communityId, { privacy: newPrivacy });
      setCommunity(updatedCommunity);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update privacy setting');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePostImages = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const updatedSettings = await updateCommunitySettings(communityId, {
        allow_post_images: !settings.allow_post_images
      });
      setSettings(updatedSettings);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePostLinks = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const updatedSettings = await updateCommunitySettings(communityId, {
        allow_post_links: !settings.allow_post_links
      });
      setSettings(updatedSettings);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update settings');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">Community Settings</h2>
        <p className="text-sm text-gray-600">Loading settings...</p>
      </div>
    );
  }

  // Don't show error, show appropriate message
  if (!settings && !community) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">Community Settings</h2>
        <p className="text-sm text-gray-600">Settings not available</p>
      </div>
    );
  }

  const handleJoinMethodChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!settings) return;
    
    const newJoinMethod = e.target.value as 'auto_approve' | 'requires_approval' | 'invite_only';
    
    try {
      setSaving(true);
      const updatedSettings = await updateCommunitySettings(communityId, {
        join_method: newJoinMethod
      }, token);
      setSettings(updatedSettings);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update join method');
      }
    } finally {
      setSaving(false);
    }
  };

  // We need both settings and community to render the form
  if (!settings || !community) {
    return (
      <div className="card p-4">
        <h2 className="font-medium mb-2">Community Settings</h2>
        <p className="text-sm text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm text-gray-600 space-y-3">
        {!isModerator ? (
          <div>
            <p>
              {community.privacy === 'public' ? 'Public community' : 'Private community'}
              {settings.join_method === 'auto_approve' && ' • Auto-approve joins'}
              {settings.join_method === 'requires_approval' && ' • Approval required to join'}
              {settings.join_method === 'invite_only' && ' • Invite only'}
            </p>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={community.privacy === 'public'}
                  onChange={handleTogglePrivacy}
                  disabled={saving}
                  className="mr-2"
                />
                Public Community
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allow_post_images}
                  onChange={handleTogglePostImages}
                  disabled={saving}
                  className="mr-2"
                />
                Allow Post Images
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allow_post_links}
                  onChange={handleTogglePostLinks}
                  disabled={saving}
                  className="mr-2"
                />
                Allow Post Links
              </label>
            </div>
            
            <div className="mt-4">
              <label className="block mb-2 font-medium">Join Method:</label>
              <select
                value={settings.join_method}
                onChange={handleJoinMethodChange}
                disabled={saving}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="auto_approve">Auto Approve (anyone can join)</option>
                <option value="requires_approval">Requires Approval (moderator must approve joins)</option>
                <option value="invite_only">Invite Only (no join requests)</option>
              </select>
            </div>
            
            {saving && (
              <p className="text-blue-600 italic">Saving changes...</p>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Moderator Controls</h3>
              <Link
                to={`/community/${communityId}/moderation`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Moderation Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
