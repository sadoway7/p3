import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getEnhancedCommunitySettings,
  updateEnhancedCommunitySettings,
  CommunitySettings,
  getModerationLogs,
  ModerationLog,
  getBannedUsers,
  BannedUser,
  getPendingModQueue,
  PendingPost,
  moderatePost,
  banUser,
  unbanUser
} from '../api/moderation';
import { getCommunityMembers, updateMemberRole } from '../api/communities';

interface ModeratorDashboardProps {
  communityId: string;
}

const ModeratorDashboard: React.FC<ModeratorDashboardProps> = ({ communityId }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'queue' | 'logs' | 'banned'>('settings');
  const [settings, setSettings] = useState<CommunitySettings | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // For editing settings
  const [editedSettings, setEditedSettings] = useState<Partial<CommunitySettings>>({});
  
  // For ban form
  const [showBanForm, setShowBanForm] = useState<boolean>(false);
  const [banUserId, setBanUserId] = useState<string>('');
  const [banReason, setBanReason] = useState<string>('');
  const [banDuration, setBanDuration] = useState<string>('permanent');
  
  // For rejection reason
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectingPostId, setRejectingPostId] = useState<string | null>(null);
  
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [communityId, activeTab, token]);
  
  const loadData = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load data based on active tab
      if (activeTab === 'settings') {
        const communitySettings = await getEnhancedCommunitySettings(communityId, token);
        setSettings(communitySettings);
        setEditedSettings({});
      } else if (activeTab === 'members') {
        const communityMembers = await getCommunityMembers(communityId, token);
        setMembers(communityMembers);
      } else if (activeTab === 'queue') {
        const queue = await getPendingModQueue(communityId, token);
        setPendingPosts(queue);
      } else if (activeTab === 'logs') {
        const moderationLogs = await getModerationLogs(communityId, 100, 0, token);
        setLogs(moderationLogs);
      } else if (activeTab === 'banned') {
        const banned = await getBannedUsers(communityId, token);
        setBannedUsers(banned);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle different input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditedSettings(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'minimum_account_age_days' || name === 'minimum_karma_required') {
      setEditedSettings(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setEditedSettings(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const saveSettings = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const updatedSettings = await updateEnhancedCommunitySettings(communityId, editedSettings, token);
      setSettings(updatedSettings);
      setEditedSettings({});
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoleChange = async (userId: string, newRole: 'member' | 'moderator' | 'admin') => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateMemberRole(communityId, userId, newRole, token);
      // Refresh members list
      const updatedMembers = await getCommunityMembers(communityId, token);
      setMembers(updatedMembers);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const approvePost = async (postId: string) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await moderatePost(postId, 'approve', undefined, token);
      // Remove post from queue
      setPendingPosts(prev => prev.filter(post => post.id !== postId));
    } catch (err) {
      console.error('Error approving post:', err);
      setError('Failed to approve post. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const showRejectForm = (postId: string) => {
    setRejectingPostId(postId);
  };
  
  const rejectPost = async () => {
    if (!token || !rejectingPostId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await moderatePost(rejectingPostId, 'reject', rejectReason, token);
      // Remove post from queue
      setPendingPosts(prev => prev.filter(post => post.id !== rejectingPostId));
      setRejectReason('');
      setRejectingPostId(null);
    } catch (err) {
      console.error('Error rejecting post:', err);
      setError('Failed to reject post. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const showBanUserForm = (userId: string) => {
    setBanUserId(userId);
    setShowBanForm(true);
  };
  
  const submitBan = async () => {
    if (!token || !banUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const duration = banDuration === 'permanent' ? undefined : parseInt(banDuration, 10);
      await banUser(communityId, banUserId, banReason, duration, token);
      // Refresh banned users
      const banned = await getBannedUsers(communityId, token);
      setBannedUsers(banned);
      setShowBanForm(false);
      setBanUserId('');
      setBanReason('');
      setBanDuration('permanent');
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const unbanUserAction = async (userId: string) => {
    if (!token) return;
    
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await unbanUser(communityId, userId, undefined, token);
      // Refresh banned users
      const banned = await getBannedUsers(communityId, token);
      setBannedUsers(banned);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to unban user. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Moderator Dashboard</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex mb-4 border-b">
        <button 
          className={`px-4 py-2 ${activeTab === 'settings' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('queue')}
        >
          Post Queue
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'banned' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('banned')}
        >
          Banned Users
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="mt-4">
          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Community Settings</h3>
              
              <div className="grid grid-cols-1 gap-4 max-w-2xl">
                <div className="mb-4">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="allow_post_images" 
                      checked={editedSettings.allow_post_images !== undefined ? editedSettings.allow_post_images : settings.allow_post_images} 
                      onChange={handleSettingsChange}
                      className="mr-2"
                    />
                    <span>Allow images in posts</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="allow_post_links" 
                      checked={editedSettings.allow_post_links !== undefined ? editedSettings.allow_post_links : settings.allow_post_links} 
                      onChange={handleSettingsChange}
                      className="mr-2"
                    />
                    <span>Allow links in posts</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="require_post_approval" 
                      checked={editedSettings.require_post_approval !== undefined ? editedSettings.require_post_approval : settings.require_post_approval} 
                      onChange={handleSettingsChange}
                      className="mr-2"
                    />
                    <span>Require moderator approval for posts</span>
                  </label>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1">Restricted words (comma separated)</label>
                  <textarea 
                    name="restricted_words" 
                    value={editedSettings.restricted_words !== undefined ? editedSettings.restricted_words || '' : settings.restricted_words || ''} 
                    onChange={handleSettingsChange}
                    className="w-full p-2 border rounded"
                    rows={3}
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1">Custom theme color</label>
                  <input 
                    type="text" 
                    name="custom_theme_color" 
                    value={editedSettings.custom_theme_color !== undefined ? editedSettings.custom_theme_color || '' : settings.custom_theme_color || ''}
                    onChange={handleSettingsChange}
                    placeholder="#FF0000" 
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1">Custom banner URL</label>
                  <input 
                    type="text" 
                    name="custom_banner_url" 
                    value={editedSettings.custom_banner_url !== undefined ? editedSettings.custom_banner_url || '' : settings.custom_banner_url || ''}
                    onChange={handleSettingsChange}
                    placeholder="https://example.com/banner.jpg" 
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1">Minimum account age (days)</label>
                  <input 
                    type="number" 
                    name="minimum_account_age_days" 
                    value={editedSettings.minimum_account_age_days !== undefined ? editedSettings.minimum_account_age_days : settings.minimum_account_age_days}
                    onChange={handleSettingsChange}
                    min="0" 
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-1">Minimum karma required</label>
                  <input 
                    type="number" 
                    name="minimum_karma_required" 
                    value={editedSettings.minimum_karma_required !== undefined ? editedSettings.minimum_karma_required : settings.minimum_karma_required}
                    onChange={handleSettingsChange}
                    min="0" 
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="flex justify-end">
                  <button 
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={saveSettings}
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Community Members</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Username</th>
                      <th className="py-2 px-4 border-b text-left">Role</th>
                      <th className="py-2 px-4 border-b text-left">Joined</th>
                      <th className="py-2 px-4 border-b text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id}>
                        <td className="py-2 px-4 border-b">{member.username}</td>
                        <td className="py-2 px-4 border-b">
                          <select 
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.user_id, e.target.value as 'member' | 'moderator' | 'admin')}
                            className="p-1 border rounded"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-2 px-4 border-b">{formatDate(member.joined_at)}</td>
                        <td className="py-2 px-4 border-b">
                          <button 
                            className="text-red-500 hover:text-red-700"
                            onClick={() => showBanUserForm(member.user_id)}
                          >
                            Ban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Post Queue Tab */}
          {activeTab === 'queue' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Post Approval Queue</h3>
              
              {pendingPosts.length === 0 ? (
                <p>No posts awaiting approval.</p>
              ) : (
                <div className="space-y-4">
                  {pendingPosts.map((post) => (
                    <div key={post.id} className="border rounded p-4">
                      <h4 className="text-lg font-medium">{post.title}</h4>
                      <p className="text-sm text-gray-500">By {post.author_username} • {formatDate(post.created_at)}</p>
                      <div className="my-2 p-2 bg-gray-50 rounded">{post.content}</div>
                      
                      <div className="flex mt-2 space-x-2">
                        <button 
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                          onClick={() => approvePost(post.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                          onClick={() => showRejectForm(post.id)}
                        >
                          Reject
                        </button>
                      </div>
                      
                      {rejectingPostId === post.id && (
                        <div className="mt-3 p-3 border rounded">
                          <label className="block mb-1">Rejection reason (optional)</label>
                          <textarea 
                            value={rejectReason} 
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full p-2 border rounded mb-2"
                            rows={2}
                          ></textarea>
                          <div className="flex space-x-2">
                            <button 
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                              onClick={rejectPost}
                            >
                              Confirm Rejection
                            </button>
                            <button 
                              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded"
                              onClick={() => setRejectingPostId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Moderation Logs</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Action</th>
                      <th className="py-2 px-4 border-b text-left">Moderator</th>
                      <th className="py-2 px-4 border-b text-left">Target</th>
                      <th className="py-2 px-4 border-b text-left">Reason</th>
                      <th className="py-2 px-4 border-b text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2 px-4 border-b">
                          {log.action_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2 px-4 border-b">{log.moderator_username}</td>
                        <td className="py-2 px-4 border-b">
                          {log.target_type} {log.target_id ? `#${log.target_id.substring(0, 8)}` : ''}
                        </td>
                        <td className="py-2 px-4 border-b">{log.reason || '-'}</td>
                        <td className="py-2 px-4 border-b">{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Banned Users Tab */}
          {activeTab === 'banned' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Banned Users</h3>
              
              {bannedUsers.length === 0 ? (
                <p>No banned users.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b text-left">Username</th>
                        <th className="py-2 px-4 border-b text-left">Banned By</th>
                        <th className="py-2 px-4 border-b text-left">Reason</th>
                        <th className="py-2 px-4 border-b text-left">Expires</th>
                        <th className="py-2 px-4 border-b text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bannedUsers.map((ban) => (
                        <tr key={ban.user_id}>
                          <td className="py-2 px-4 border-b">{ban.banned_username}</td>
                          <td className="py-2 px-4 border-b">{ban.moderator_username}</td>
                          <td className="py-2 px-4 border-b">{ban.reason || '-'}</td>
                          <td className="py-2 px-4 border-b">
                            {ban.ban_expires_at ? formatDate(ban.ban_expires_at) : 'Permanent'}
                          </td>
                          <td className="py-2 px-4 border-b">
                            <button 
                              className="text-blue-500 hover:text-blue-700"
                              onClick={() => unbanUserAction(ban.user_id)}
                            >
                              Unban
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Ban User Modal */}
      {showBanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Ban User</h3>
            
            <div className="mb-4">
              <label className="block mb-1">Ban reason (optional)</label>
              <textarea 
                value={banReason} 
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
              ></textarea>
            </div>
            
            <div className="mb-4">
              <label className="block mb-1">Ban duration</label>
              <select 
                value={banDuration} 
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="permanent">Permanent</option>
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button 
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded"
                onClick={() => setShowBanForm(false)}
              >
                Cancel
              </button>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                onClick={submitBan}
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModeratorDashboard;