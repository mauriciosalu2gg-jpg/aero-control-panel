import admin from 'firebase-admin';
import { getFirebaseCredential } from './config.js';

let appInitialized = false;

function ensureInitialized() {
  if (!appInitialized) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: getFirebaseCredential()
      });
    }
    appInitialized = true;
  }
}

export const db = new Proxy({}, {
  get(target, prop) {
    ensureInitialized();
    const firestore = admin.firestore();
    const value = firestore[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  }
});

export const adminAuth = new Proxy({}, {
  get(target, prop) {
    ensureInitialized();
    const auth = admin.auth();
    const value = auth[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  }
});

export default db;
