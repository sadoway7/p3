import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
      <nav className="bg-black text-white font-mono relative z-10 mb-0">                         │ │
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">   
        <div className="flex items-center space-x-8">
          <Link 
            to="/" 
            className="text-3xl font-bold tracking-tighter text-white relative group"
          >
            <span className="relative z-10">RUMFOR</span>
            <span className="absolute -bottom-1 left-0 w-full h-2 bg-teal-400 transform -skew-x-12 group-hover:skew-x-12 transition-transform"></span>
          </Link>
          <div className="flex space-x-6">
            <Link 
              to="/communities" 
              className="text-white uppercase tracking-wide hover:text-teal-300 transition-colors"
            >
              Communities
            </Link>
            {isAuthenticated && (
              <Link 
                to="/profile"
                className="text-white uppercase tracking-wide hover:text-pink-300 transition-colors"
              >
                Profile
              </Link>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-white bg-gray-800 px-4 py-2 uppercase tracking-wide"
              >
                <span>{user?.username}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 shadow-lg py-2 z-10">
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-sm text-white hover:bg-gray-700 uppercase"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Your Profile
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-4 py-3 text-sm text-white hover:bg-gray-700 uppercase"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 text-sm text-white hover:bg-gray-700 uppercase"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-white uppercase tracking-wide hover:text-teal-300 transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="px-4 py-2 bg-gray-800 text-white uppercase tracking-wide hover:bg-gray-700 transition-colors relative group"
              >
                <span className="relative z-10">Sign Up</span>
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-pink-400 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></div>
    </nav>
  );
}
