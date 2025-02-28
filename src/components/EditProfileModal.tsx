import React, { useState } from 'react'
import { updateUserProfile } from '../api/users'
import { useAuth } from '../context/AuthContext'

interface EditProfileModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({ onClose, onSuccess }: EditProfileModalProps) {
  const { user, token } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('Username is required')
      return
    }
    
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      await updateUserProfile(
        {
          username,
          email,
          bio: bio.trim() || undefined
        },
        token
      )
      
      onSuccess()
    } catch (err) {
      console.error('Failed to update profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md transform rotate-0.5 shadow-lg">
        <div className="bg-black text-white p-4">
          <h2 className="text-xl font-bold uppercase tracking-tight relative inline-block">
            <span className="text-teal-400">EDIT</span> PROFILE
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></span>
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-black text-white p-3 transform -rotate-0.5 shadow-md">
              <span className="text-pink-400 font-bold uppercase">ERROR:</span> {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" className="block text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-100 border-l-2 border-teal-400 focus:outline-none"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-100 border-l-2 border-pink-400 focus:outline-none"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-bold uppercase tracking-wider text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 bg-gray-100 border-l-2 border-purple-400 focus:outline-none"
              rows={4}
              placeholder="Tell us about yourself..."
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 uppercase tracking-wider hover:bg-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white uppercase tracking-wider hover:bg-gray-800 relative overflow-hidden group"
              disabled={loading}
            >
              <span className="relative z-10">{loading ? 'Saving...' : 'Save'}</span>
              <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
