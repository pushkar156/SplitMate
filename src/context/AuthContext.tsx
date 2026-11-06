import React, { createContext, useContext, useEffect, useState } from 'react';
import { OotyMember, OOTY_MEMBERS, OOTY_PASSWORD } from '../types/ooty';
import { isFirebaseConfigured } from '../lib/firebase';
import { ensureFirebaseAuth } from '../services/ootyDataService';

interface AuthContextType {
  user: OotyMember | null;
  loading: boolean;
  login: (memberId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLiveFirebase: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_STORAGE_KEY = 'splitmate_ooty_logged_in_member_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<OotyMember | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isLive = isFirebaseConfigured();

  // Restore session on mount (persists across refreshes and restarts until Logout is clicked)
  useEffect(() => {
    try {
      const storedMemberId = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
      if (storedMemberId) {
        const found = OOTY_MEMBERS.find((m) => m.id === storedMemberId.toLowerCase());
        if (found) {
          setUser(found);
          ensureFirebaseAuth();
        }
      }
    } catch (err) {
      console.error('Failed to load user from localStorage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (
    memberId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedId = memberId.trim().toLowerCase();
    const found = OOTY_MEMBERS.find((m) => m.id === trimmedId);

    if (!found) {
      return { success: false, error: 'Please select a valid member from the dropdown.' };
    }

    if (password !== OOTY_PASSWORD) {
      return { success: false, error: 'Incorrect password! The trip password is 1234567890.' };
    }

    // Persist login to device
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, found.id);
    setUser(found);

    // Background Firebase auth
    ensureFirebaseAuth();

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isLiveFirebase: isLive,
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
