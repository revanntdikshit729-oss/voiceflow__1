import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Client Firebase configuration from Vite environment variables (with project defaults)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAx6dItN165Y5bxj_1A0fkY4ruZw4rRW90',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'voiceflow-f53b8.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'voiceflow-f53b8',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'voiceflow-f53b8.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '829541214232',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:829541214232:web:9c872b071268f7826bfb6d',
};

export const getMissingFirebaseKeys = (): string[] => {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.messagingSenderId) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
};

export const isStorageConfigured = (): boolean => {
  return Boolean(
    isFirebaseConfigured() &&
    firebaseConfig.storageBucket &&
    storage !== null
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('🔥 Firebase client initialized successfully for project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('Error initializing Firebase client SDK:', error);
  }
} else {
  const missing = getMissingFirebaseKeys();
  console.warn(
    `⚠️ Firebase project '${firebaseConfig.projectId}' detected, but missing configuration keys: ${missing.join(', ')}. Set them in client/.env.`
  );
}

export { app, auth, db, storage };
