import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  onClose: () => void;
}

export default function CommunitySettingsModal({ communityId, onClose }: Props) {
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Community Settings</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings || !community || !isModerator) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Community Settings</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="text-center py-4">
              You don't have permission to modify community settings.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pt-2">
          <h2 className="text-xl font-bold">Community Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-3">General Settings</h3>
            
            <div className="mb-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={community.privacy === 'public'}
                  onChange={handleTogglePrivacy}
                  disabled={saving}
                  className="mr-2 h-5 w-5"
                />
                <span>Public Community</span>
                <span className="ml-1 text-sm text-gray-500">
                  {community.privacy === 'public' 
                    ? '- Anyone can view' 
                    : '- Only members can view'}
                </span>
              </label>
            </div>
            
            <div className="mb-4">
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
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-3">Post Settings</h3>
            
            <div className="mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_post_images}
                  onChange={handleTogglePostImages}
                  disabled={saving}
                  className="mr-2 h-5 w-5"
                />
                <span>Allow Post Images</span>
              </label>
            </div>
            
            <div className="mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allow_post_links}
                  onChange={handleTogglePostLinks}
                  disabled={saving}
                  className="mr-2 h-5 w-5"
                />
                <span>Allow Post Links</span>
              </label>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-lg mb-3">Moderation</h3>
            <Link
              to={`/community/${communityId}/moderation`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Moderation Dashboard
            </Link>
          </div>
        </div>
        
        {saving && (
          <div className="mt-4 text-blue-600 italic text-center">
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}