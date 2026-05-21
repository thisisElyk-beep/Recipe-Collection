import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let dbInstance = null;

export function getFirebaseDb() {
  if (dbInstance) return dbInstance;

  const raw = localStorage.getItem('firebase_config');
  if (!raw) return null;

  try {
    const config = JSON.parse(raw);
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
