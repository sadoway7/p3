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
      <div className="w-full bg-black text-white py-8 px-4 mb-8 transform rotate-0.5 shadow-md">
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
      
      <div className="max-w-md mx-auto">
        {(formError || error) && (
          <div className="bg-black text-white p-4 mb-6 transform -rotate-0.5 shadow-md">
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
              placeholder="Choose a username"
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
          </div>
          
          <div className="bg-black text-white p-6 transform rotate-0.5 shadow-md">
            <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider text-pink-400 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-pink-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
          </div>
          
          <div className="bg-black text-white p-6 transform -rotate-0.5 shadow-md">
            <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider text-purple-400 mb-2">
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
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-purple-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
            {passwordStrength && (
              <div className="mt-3">
                <div className="flex items-center">
                  <div className="text-sm mr-2 text-gray-300">Strength:</div>
                  <div className={`h-2 w-full ${
                    passwordStrength === 'weak' ? 'bg-red-500' : 
                    passwordStrength === 'medium' ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}></div>
                </div>
                <p className="text-xs mt-2 text-gray-400">
                  Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-black text-white p-6 transform rotate-0.5 shadow-md">
            <label htmlFor="confirmPassword" className="block text-sm font-bold uppercase tracking-wider text-teal-400 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full p-3 bg-gray-900 text-white border-l-2 border-teal-400 focus:outline-none placeholder-gray-500"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="w-full px-6 py-4 bg-black text-white uppercase tracking-wider transform hover:translate-x-1 transition-transform shadow-md relative overflow-hidden group"
            disabled={loading}
          >
            <span className="relative z-10 font-bold">{loading ? 'REGISTERING...' : 'REGISTER'}</span>
            <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-pink-400 via-teal-400 to-purple-500 group-hover:w-full transition-all duration-300"></span>
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-gray-700">
            Already have an account?{' '}
            <Link to="/login" className="text-pink-600 hover:text-pink-800 font-bold uppercase">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
