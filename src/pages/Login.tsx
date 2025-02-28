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
      <div className="w-full bg-black text-white py-8 px-4 mb-8 transform -rotate-0.5 shadow-md">
        <h1 className="text-4xl font-bold uppercase tracking-tight relative inline-block">
          <span className="text-teal-400">LOG</span>
          <span>IN</span>
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500"></span>
        </h1>
        <p className="text-gray-300 mt-2 ml-6 border-l-2 border-pink-400 pl-4">
          Enter your credentials to access your account
        </p>
      </div>
      
      <div className="max-w-md mx-auto">
        {(formError || error) && (
          <div className="bg-black text-white p-4 mb-6 transform rotate-0.5 shadow-md">
            <span className="text-pink-400 font-bold uppercase">ERROR:</span> {formError || error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="bg-black text-white p-6 transform -rotate-0.5 shadow-md">
            <label htmlFor="username" className="block text-sm font-bold uppercase tracking-wider text-teal-400 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
          </div>
          
          <div className="bg-black text-white p-6 transform rotate-0.5 shadow-md">
            <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider text-pink-400 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-pink-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="w-full px-6 py-4 bg-black text-white uppercase tracking-wider transform hover:translate-x-1 transition-transform shadow-md relative overflow-hidden group"
            disabled={loading}
          >
            <span className="relative z-10 font-bold">{loading ? 'LOGGING IN...' : 'LOGIN'}</span>
            <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-teal-400 via-pink-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-gray-700">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-800 font-bold uppercase">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
