import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>('');
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isLongEnough = password.length >= 8;

    const strength = [hasUppercase, hasLowercase, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;

    if (strength < 2) {
      setPasswordStrength('weak');
    } else if (strength < 4) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset form error
    setFormError(null);
    
    // Validate form
    if (!username.trim()) {
      setFormError('Username is required');
      return;
    }
    
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // Check password strength
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    const isLongEnough = password.length >= 8;
    
    if (!isLongEnough || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setFormError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return;
    }
    
    try {
      console.debug("Register form data:", { username, email, password, confirmPassword });
      await register(username, email, password);
      // Redirect to home page after successful registration
      navigate('/');
    } catch (error) {
      // Error is handled by the AuthContext
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="w-full font-mono">
      <div className="w-full bg-black text-white py-6 px-4 mb-6 transform rotate-0.5 shadow-md flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight relative inline-block">
            <span className="text-pink-400">REG</span>
            <span>IS</span>
            <span className="text-teal-400">TER</span>
            <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-teal-400 to-purple-500"></span>
          </h1>
          <p className="text-gray-300 mt-2 ml-6 border-l-2 border-teal-400 pl-4">
            Create a new account to join the community
          </p>
        </div>
        <div className="hidden md:block relative w-20 h-20">
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-pink-400 rounded-full opacity-40"></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 bg-teal-400 rounded-full opacity-50"></div>
        </div>
      </div>
      
      <div className="max-w-sm mx-auto">
        {(formError || error) && (
          <div className="bg-black text-white p-3 mb-4 transform -rotate-0.5 shadow-md">
            <span className="text-pink-400 font-bold uppercase">ERROR:</span> {formError || error}
          </div>
        )}
        
        <div className="bg-black text-white p-6 shadow-lg rounded-sm border-t-2 border-pink-400">
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
                placeholder="Choose a username"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
            </div>
            
            <div className="mt-2">
              <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider text-pink-400 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
            </div>
            
            <div className="mt-2">
              <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider text-purple-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                placeholder="Create a password"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="text-xs mr-2 text-gray-300">Strength:</div>
                    <div className="h-1.5 flex-grow rounded-sm overflow-hidden">
                      <div className={`h-full ${
                        passwordStrength === 'weak' ? 'w-1/3 bg-red-500' : 
                        passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' : 
                        'w-full bg-green-500'
                      } transition-all duration-300`}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-2">
              <label htmlFor="confirmPassword" className="block text-sm font-bold uppercase tracking-wider text-teal-400 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder-gray-500 transition-all"
                disabled={loading}
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-500 text-white uppercase tracking-wider transform hover:translate-y-[-2px] transition-all shadow-md relative overflow-hidden font-bold"
                disabled={loading}
              >
                {loading ? 'REGISTERING...' : 'REGISTER'}
              </button>
            </div>
          </form>
          
          <div className="mt-5 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-pink-400 hover:text-pink-300 font-bold uppercase inline-flex items-center group">
                Login here
                <span className="ml-1 transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </p>
          </div>
        </div>
        
        <div className="mt-4 px-4">
          <p className="text-xs text-gray-500 bg-gray-100 p-3 rounded-sm">
            <span className="text-pink-500 font-bold">Note:</span> Password must be at least 8 characters and include 
            uppercase, lowercase, number, and special character for security.
          </p>
        </div>
      </div>
    </div>
  );
}
