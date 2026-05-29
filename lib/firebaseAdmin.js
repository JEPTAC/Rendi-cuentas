import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function normalizePrivateKey(key) {
  return String(key || '').replace(/\\n/g, '\n');
}

function initAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rendi-cuentas';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en las variables de entorno de Vercel.');
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  });
}

initAdmin();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const serverTimestamp = FieldValue.serverTimestamp;
export const increment = FieldValue.increment;
