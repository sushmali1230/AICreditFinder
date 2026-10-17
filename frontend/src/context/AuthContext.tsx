import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  activeRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsPredefined: (role: UserRole) => Promise<void>;
  logout: () => void;
}

const PREDEFINED_CREDENTIALS: Record<UserRole, { email: string; name: string }> = {
  ANALYST: { email: 'analyst@apexbank.com', name: 'Vikram Mehta (Analyst)' },
  APPROVER: { email: 'approver@apexbank.com', name: 'Ananya Deshmukh (Approver / CUO)' },
  ADMIN: { email: 'admin@apexbank.com', name: 'Suresh Nambiar (Admin)' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loginAsPredefined = async (role: UserRole) => {
    try {
      setIsLoading(true);
      const creds = PREDEFINED_CREDENTIALS[role];
      const data = await api.auth.login(creds.email, 'password123');
      setCurrentUser(data.user);
    } catch (error) {
      console.error('Failed to login as predefined role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setCurrentUser(null);
  };

  useEffect(() => {
    // Check if token exists, or auto-login as Analyst initially
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('apex_auth_token');
        if (token) {
          const res = await api.auth.getMe();
          setCurrentUser(res.user);
        } else {
          // Default start as Analyst
          await loginAsPredefined('ANALYST');
        }
      } catch (err) {
        console.warn('Initial session restore failed, defaulting to Analyst:', err);
        await loginAsPredefined('ANALYST');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const activeRole: UserRole = currentUser?.role || 'ANALYST';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole,
        isAuthenticated: !!currentUser,
        isLoading,
        loginAsPredefined,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
