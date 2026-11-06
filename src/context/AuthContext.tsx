import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';
import { DEMO_USERS } from '../services/mockData';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLiveSupabase: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchDemoUser: (userId: string) => void;
  availableDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLiveSupabase = isSupabaseConfigured();

  useEffect(() => {
    if (isLiveSupabase && supabase) {
      // Real Supabase session initialization
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchSupabaseProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchSupabaseProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Local demo mode: initialize from dataService
      setUser(dataService.getCurrentUser());
      setLoading(false);
    }
  }, [isLiveSupabase]);

  const fetchSupabaseProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUser({
          id: data.id,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          email: data.email,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (isLiveSupabase && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    }

    // In demo mode: find user with matching email or log in as first user
    const found = DEMO_USERS.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || DEMO_USERS[0];
    dataService.setCurrentUser(found);
    setUser(found);
    return { error: null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: Error | null }> => {
    if (isLiveSupabase && supabase) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      return { error: error ? new Error(error.message) : null };
    }

    const newUser: UserProfile = {
      id: `u-${Date.now()}`,
      fullName,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    };
    dataService.setCurrentUser(newUser);
    setUser(newUser);
    return { error: null };
  };

  const signOut = async () => {
    if (isLiveSupabase && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const switchDemoUser = (userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (found) {
      dataService.setCurrentUser(found);
      setUser(found);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLiveSupabase,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        switchDemoUser,
        availableDemoUsers: DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

