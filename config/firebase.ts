import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAaCp7uWE5mZ1Ytl9lwTEI5A1_Ca97LywQ",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "loopify-5e958.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "loopify-5e958",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "loopify-5e958.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "895079140430",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:895079140430:web:e390f1912869accc0cc71f",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-9C8FRHN2VW",
};

// Firebase is configured

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence for React Native
  // Note: getReactNativePersistence may not be in TypeScript definitions for Firebase v11
  // but it exists at runtime. We'll use a type assertion to access it.
  try {
    // Use type assertion to access getReactNativePersistence
    const authModule = require('firebase/auth') as any;
    if (authModule.getReactNativePersistence) {
      auth = initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage)
      });
    } else {
      // Fallback if function doesn't exist
      auth = getAuth(app);
    }
  } catch (authError: any) {
    // If auth is already initialized, get the existing instance
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      // Fallback to regular auth if persistence setup fails
      auth = getAuth(app);
    }
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'us-central1');
} catch (error: any) {
  console.error('Firebase initialization error:', error);
  // App will still work, but Firebase features won't be available
}

export { auth, db, storage, functions };
export default app;

