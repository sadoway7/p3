import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiPath } from '../api/apiUtils';

// Define the User type
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  post_count?: number;
  comment_count?: number;
  upvotes_received?: number;
  downvotes_received?: number;
  upvotes_given?: number;
  downvotes_given?: number;
  communities_joined?: number;
  last_active?: string;
}

// Define the AuthContext type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

// Create the AuthContext
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: false,
  error: null
});

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const response = await fetch(getApiPath('/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token is invalid or expired
          localStorage.removeItem('token');
          setToken(null);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setInitializing(false);
      }
    };

    loadUser();
  }, [token]);

  // Login function
  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiPath('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Update state
      setToken(data.token);
      setUser(data.user);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiPath('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      // After registration, automatically log in
      await login(username, password);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Create the context value
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    loading,
    error
  };

  // Render the provider
  return (
    <AuthContext.Provider value={contextValue}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);
