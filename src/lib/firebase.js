import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Hardcoded config — no setup needed on any device
const DEFAULT_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

let dbInstance = null;

export function getFirebaseDb() {
  if (dbInstance) return dbInstance;
  try {
    // Use localStorage override if present, otherwise use hardcoded config
    const raw = localStorage.getItem('firebase_config');
    const config = raw ? JSON.parse(raw) : DEFAULT_CONFIG;
    const app = getApps().length ? getApp() : initializeApp(config);
    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return null;
  }
}

export function resetFirebaseDb() {
  dbInstance = null;
}
