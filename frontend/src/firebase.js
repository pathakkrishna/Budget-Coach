import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "firebase/auth";

// Web app's Firebase configuration
const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDgGskW-hH-FB45ID3cckwKXfG_JQTJ_cE",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "budget-coach-a930c.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "budget-coach-a930c",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "budget-coach-a930c.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "787729899245",
  appId: env.VITE_FIREBASE_APP_ID || "1:787729899245:web:1895e05ff6c17b2a79f6e4",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-W68694ZSZ8"
};

export const isConfigured = true;

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize analytics safely in browser environment
let analyticsInstance = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {});
}
export const analytics = analyticsInstance;

export { onAuthStateChanged, updateProfile, sendPasswordResetEmail };

// Local storage session key
const LOCAL_USER_KEY = 'fintech_auth_active_user';

export const getStoredLocalUser = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredLocalUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
  } catch (err) {
    console.error("Local user storage error:", err);
  }
};

/**
 * Universal Sign-in with Email and Password
 * Authenticates against your Firebase Project (budget-coach-a930c)
 */
export async function logInWithEmail(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const userObj = {
    uid: userCred.user.uid,
    email: userCred.user.email,
    displayName: userCred.user.displayName || cleanEmail.split('@')[0],
    photoURL: userCred.user.photoURL,
    isFirebase: true
  };
  setStoredLocalUser(userObj);
  return { success: true, user: userObj, mode: 'firebase' };
}

/**
 * Universal Sign-up with Email, Password & Display Name
 * Creates a brand new account in Firebase with isolated SQLite memory
 */
export async function signUpWithEmail(email, password, displayName) {
  const cleanEmail = email.trim().toLowerCase();
  const name = displayName?.trim() || cleanEmail.split('@')[0];

  const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  if (name && userCred.user) {
    await updateProfile(userCred.user, { displayName: name });
  }

  const userObj = {
    uid: userCred.user.uid,
    email: userCred.user.email,
    displayName: name,
    photoURL: userCred.user.photoURL,
    isFirebase: true
  };

  setStoredLocalUser(userObj);
  return { success: true, user: userObj, mode: 'firebase' };
}

/**
 * Google Sign-in with Firebase
 * Opens real Google account chooser for your Firebase project
 */
export async function logInWithGoogle() {
  const userCred = await signInWithPopup(auth, googleProvider);
  const userObj = {
    uid: userCred.user.uid,
    email: userCred.user.email,
    displayName: userCred.user.displayName || userCred.user.email?.split('@')[0],
    photoURL: userCred.user.photoURL,
    isFirebase: true
  };

  setStoredLocalUser(userObj);
  return { success: true, user: userObj, mode: 'firebase' };
}

/**
 * Sign Out
 */
export async function logOutUser() {
  setStoredLocalUser(null);
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Sign out warning:", err);
    }
  }
  return { success: true };
}

/**
 * Save custom Firebase Config from UI
 */
export function saveCustomFirebaseConfig(config) {
  try {
    localStorage.setItem('fintech_firebase_config', JSON.stringify(config));
    window.location.reload();
  } catch (err) {
    console.error("Failed to save Firebase config:", err);
  }
}
