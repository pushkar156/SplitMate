import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { isFirebaseConfigured, auth, db, googleProvider } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { dataService } from '../services/dataService';
import { DEMO_USERS } from '../services/mockData';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLiveFirebase: boolean;
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
  const isLiveFirebase = isFirebaseConfigured();

  const syncFirestoreUserProfile = async (fbUser: FirebaseUser) => {
    const profile: UserProfile = {
      id: fbUser.uid,
      fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      email: fbUser.email || undefined,
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'User')}`,
    };

    if (db) {
      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            fullName: profile.fullName,
            email: profile.email || '',
            avatarUrl: profile.avatarUrl || null,
            createdAt: new Date().toISOString(),
          });
        } else {
          const data = userDoc.data();
          profile.fullName = data.fullName || profile.fullName;
          profile.avatarUrl = data.avatarUrl || profile.avatarUrl;
        }
      } catch (err) {
        console.warn('Firestore profile sync error (using local profile):', err);
      }
    }

    dataService.setCurrentUser(profile);
    setUser(profile);
    setLoading(false);
  };

  useEffect(() => {
    if (isLiveFirebase && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          await syncFirestoreUserProfile(fbUser);
        } else {
          setUser(null);
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } else {
      // If Firebase keys are not loaded yet, allow manual demo switching
      setUser(dataService.getCurrentUser());
      setLoading(false);
    }
  }, [isLiveFirebase]);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (isLiveFirebase && auth) {
      try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        await syncFirestoreUserProfile(res.user);
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    }

    // Demo mode fallback
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
    if (isLiveFirebase && auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: fullName });
        await syncFirestoreUserProfile(res.user);
        return { error: null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
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
    if (!isLiveFirebase || !auth) {
      return {
        error: new Error(
          'Firebase is not active. If you just added keys to .env, please restart your Vite dev server (press Ctrl+C in terminal and run npm run dev).'
        ),
      };
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncFirestoreUserProfile(res.user);
      return { error: null };
    } catch (err: any) {
      console.error('Firebase Google popup error:', err);
      let userFriendlyMsg = err.message || 'Google authentication failed';

      if (err.code === 'auth/popup-closed-by-user') {
        userFriendlyMsg = 'Google Sign-In popup was closed before completion.';
      } else if (err.code === 'auth/popup-blocked') {
        userFriendlyMsg = 'Sign-in popup was blocked by your browser. Please allow popups for localhost.';
      } else if (err.code === 'auth/operation-not-allowed') {
        userFriendlyMsg = 'Google Sign-In is not enabled yet in your Firebase Console. Go to Authentication -> Sign-in method -> Google and toggle Enable.';
      } else if (err.code === 'auth/unauthorized-domain') {
        userFriendlyMsg = 'This domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.';
      }

      return { error: new Error(userFriendlyMsg) };
    }
  };

  const signOut = async () => {
    if (isLiveFirebase && auth) {
      await firebaseSignOut(auth);
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
        isLiveFirebase,
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
