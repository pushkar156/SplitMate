import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';
import { DEMO_USERS } from '../services/mockData';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLiveSupabase: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchDemoUser: (userId: string) => void;
  availableDemoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isLiveSupabase = isSupabaseConfigured();

  const fetchSupabaseProfile = async (sessionUser: SupabaseUser) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (!error && data) {
        setUser({
          id: data.id,
          fullName: data.full_name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'User',
          avatarUrl: data.avatar_url || sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
          email: sessionUser.email,
        });
      } else {
        // Fallback for new Google OAuth user before/during trigger sync
        setUser({
          id: sessionUser.id,
          fullName:
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email?.split('@')[0] ||
            'User',
          avatarUrl:
            sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
          email: sessionUser.email,
        });

        // Ensure profile row exists in case trigger hasn't fired yet
        await supabase.from('profiles').upsert({
          id: sessionUser.id,
          full_name:
            sessionUser.user_metadata?.full_name ||
            sessionUser.user_metadata?.name ||
            sessionUser.email?.split('@')[0] ||
            'User',
          avatar_url:
            sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      // Fallback
      setUser({
        id: sessionUser.id,
        fullName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
        avatarUrl: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
        email: sessionUser.email,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLiveSupabase && supabase) {
      // Real Supabase session initialization
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchSupabaseProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchSupabaseProfile(session.user);
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

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    if (isLiveSupabase && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    }

    // If Supabase credentials are not in .env yet, simulate login as Google user in demo mode
    const demoGoogleUser: UserProfile = {
      id: `u-google-${Date.now()}`,
      fullName: 'Google User',
      email: 'user@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop',
    };
    dataService.setCurrentUser(demoGoogleUser);
    setUser(demoGoogleUser);
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
        signInWithGoogle,
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
