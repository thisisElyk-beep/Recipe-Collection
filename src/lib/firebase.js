import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Hardcoded config — no setup needed on any device
const DEFAULT_CONFIG = {
 apiKey: "AIzaSyBF79_eKfQIDbPycAxnoBwEzi2di3OkmoM"
authDomain: "recipe-collection-6bf47.firebaseapp.com"
projectId: "recipe-collection-6bf47"
storageBucket: "recipe-collection-6bf47.firebasestorage.app"
messagingSenderId: "135923494567"
appId: "1:135923494567:web:55127ee163999ee4f87582"
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
