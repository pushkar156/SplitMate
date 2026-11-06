import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAh6Y6XzO_-Gjx41BcG5hg7cRJruxXLXUo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'splitmate156.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'splitmate156',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'splitmate156.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '753335314957',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:753335314957:web:7710cb9f318abdb9e7c344',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your-firebase-api-key' &&
    firebaseConfig.apiKey.length > 10
  );
};

const app = isFirebaseConfigured()
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

