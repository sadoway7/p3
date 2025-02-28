import React from 'react'
import { useAuth } from '../context/AuthContext'

interface ProfileActionsProps {
  onEditProfile: () => void;
}

export default function ProfileActions({ onEditProfile }: ProfileActionsProps) {
  const { logout } = useAuth()
  
  const handleLogout = () => {
    logout()
    // Redirect to login page happens automatically via AuthContext
  }
  
  return (
    <div className="bg-black text-white p-6 transform -rotate-0.5 shadow-md">
      <div className="space-y-4">
        <button 
          className="w-full px-4 py-3 bg-gray-900 text-white uppercase tracking-wider hover:bg-gray-800 transition-transform transform hover:translate-x-1 border-l-2 border-teal-400 shadow-md relative overflow-hidden group"
          onClick={onEditProfile}
        >
          <span className="relative z-10">Edit Profile</span>
          <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
        </button>
        
        <button className="w-full px-4 py-3 bg-gray-900 text-white uppercase tracking-wider hover:bg-gray-800 transition-transform transform hover:translate-x-1 border-l-2 border-pink-400 shadow-md relative overflow-hidden group">
          <span className="relative z-10">Settings</span>
          <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
        </button>
        
        <button 
          className="w-full px-4 py-3 bg-gray-900 text-white uppercase tracking-wider hover:bg-gray-800 transition-transform transform hover:translate-x-1 border-l-2 border-purple-400 shadow-md relative overflow-hidden group"
          onClick={handleLogout}
        >
          <span className="relative z-10">Logout</span>
          <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
        </button>
      </div>
    </div>
  )
}
