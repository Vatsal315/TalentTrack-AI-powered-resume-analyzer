import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are loaded before reading them
dotenv.config();

// Allow either base64 content or file path for the service account
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let credential: admin.credential.Credential | null = null;

if (serviceAccountBase64) {
  try {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    credential = admin.credential.cert(JSON.parse(json));
  } catch (error) {
    console.error('[firebase-config]: Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64.', error);
    credential = null;
  }
} else if (serviceAccountPath) {
  try {
    credential = admin.credential.cert(path.resolve(serviceAccountPath));
  } catch (error) {
    console.error(
      `[firebase-config]: Failed to load service account JSON from path: ${serviceAccountPath}`,
      error
    );
    credential = null;
  }
} else {
  // Don't crash the entire server if Firebase Admin isn't configured.
  // Endpoints that require auth/db should return a clear error instead.
  console.warn(
    '[firebase-config]: No Firebase service account provided. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH to enable Firebase Admin.'
  );
}

// Initialize once (important for hot reload/tests)
if (credential) {
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential });
    console.log('[firebase-config]: Firebase Admin SDK initialized successfully.');
  } else {
    console.log('[firebase-config]: Firebase Admin SDK already initialized.');
  }
}

// Export initialized services
export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;