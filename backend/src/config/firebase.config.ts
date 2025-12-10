import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded before reading them
dotenv.config();

// Allow either base64 content or file path for the service account
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let credential: admin.credential.Credential;

if (serviceAccountBase64) {
  try {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    credential = admin.credential.cert(JSON.parse(json));
  } catch (error) {
    console.error('[firebase-config]: Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64.', error);
    throw error;
  }
} else if (serviceAccountPath) {
  credential = admin.credential.cert(path.resolve(serviceAccountPath));
} else {
  throw new Error(
    'No Firebase service account provided. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
}

// Initialize once (important for hot reload/tests)
    if (admin.apps.length === 0) {
  admin.initializeApp({ credential });
        console.log('[firebase-config]: Firebase Admin SDK initialized successfully.');
    } else {
        console.log('[firebase-config]: Firebase Admin SDK already initialized.');
    }

// Export initialized services
export const db = admin.firestore();
export const auth = admin.auth();