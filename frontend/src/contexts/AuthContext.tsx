import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { apiService } from '../services/apiService';
import { useWeb3 } from './Web3Context';

interface User {
  address: string;
  hasIdentity: boolean;
  identityId?: string;
  did?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { account, signer, isConnected } = useWeb3();

  useEffect(() => {
    // Load token from localStorage on mount
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      apiService.setAuthToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Auto-logout if wallet disconnected
    if (!isConnected && user) {
      logout();
    }
  }, [isConnected, user]);

  const generateAuthMessage = (address: string): string => {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(7);
    
    const message = {
      message: 'Sign this message to authenticate with Blockchain Identity Framework',
      address,
      timestamp,
      nonce,
      domain: window.location.hostname,
    };

    return JSON.stringify(message);
  };

  const login = async (): Promise<void> => {
    if (!account || !signer) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoading(true);

    try {
      // Generate message to sign
      const message = generateAuthMessage(account);
      
      // Request signature from user
      const signature = await signer.signMessage(message);

      // Authenticate with backend
      const response = await apiService.post('/identities/auth', {
        message,
        signature,
        address: account,
      });

      if (response.data.success) {
        const { token: authToken, user: userData } = response.data;
        
        setToken(authToken);
        setUser(userData);
        
        // Save token to localStorage
        localStorage.setItem('auth_token', authToken);
        apiService.setAuthToken(authToken);
        
        toast.success('Authentication successful!');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Authentication cancelled by user');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    apiService.setAuthToken(null);
    toast.info('Logged out successfully');
  };

  const refreshUser = async (): Promise<void> => {
    if (!token || !account) return;

    try {
      // Get updated user info (in a real app, you might have a /me endpoint)
      const message = generateAuthMessage(account);
      const signature = await signer?.signMessage(message);

      const response = await apiService.post('/identities/auth', {
        message,
        signature,
        address: account,
      });

      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout user
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};