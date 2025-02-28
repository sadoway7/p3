import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setFormError(null);
    
    // Validate form
    if (!username.trim()) {
      setFormError('Username is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    try {
      await login(username, password);
      // Redirect to home page after successful login
      navigate('/');
    } catch (error) {
      // Error is handled by the AuthContext
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="w-full font-mono">
      <div className="w-full bg-black text-white py-6 px-4 mb-6 transform -rotate-0.5 shadow-md flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight relative inline-block">
            <span className="text-teal-400">LOG</span>
            <span>IN</span>
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></span>
          </h1>
          <p className="text-gray-300 mt-2 ml-6 border-l-2 border-pink-400 pl-4">
            Enter your credentials to access your account
          </p>
        </div>
        <div className="hidden md:block relative w-20 h-20">
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-teal-400 rounded-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-pink-400 rounded-full opacity-40"></div>
        </div>
      </div>
      
      <div className="max-w-sm mx-auto">
        {(formError || error) && (
          <div className="bg-black text-white p-3 mb-4 transform rotate-0.5 shadow-md">
            <span className="text-pink-400 font-bold uppercase">ERROR:</span> {formError || error}
          </div>
        )}
        
        <div className="bg-black text-white p-6 shadow-lg rounded-sm border-t-2 border-teal-400">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-bold uppercase tracking-wider text-teal-400 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
            </div>
            
            <div className="mt-2">
              <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider text-pink-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white uppercase tracking-wider transform hover:translate-y-[-2px] transition-all shadow-md relative overflow-hidden group font-bold"
                disabled={loading}
              >
                {loading ? 'LOGGING IN...' : 'LOGIN'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-teal-400 hover:text-teal-300 font-bold uppercase inline-flex items-center group">
                Register here
                <span className="ml-1 transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-4 bg-gray-900 p-3 border-l-4 border-pink-400 text-white text-xs text-center transform rotate-0.5">
          <span className="uppercase font-bold text-pink-400">TIP:</span>{' '}
          <span className="text-gray-300">Need an account to get started? Register to join our community!</span>
        </div>
      </div>
    </div>
  );
}
