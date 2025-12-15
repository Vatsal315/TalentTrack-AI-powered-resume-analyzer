import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Ensure env vars are loaded before reading them
dotenv.config();

// Allow either base64 content or file path for the service account
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let credential: admin.credential.Credential | null = null;

function loadServiceAccountFromFile(filePath: string): admin.credential.Credential | null {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return null;
    const jsonString = fs.readFileSync(resolved, 'utf-8');
    const serviceAccount = JSON.parse(jsonString);
    return admin.credential.cert(serviceAccount);
  } catch (error) {
    console.error(`[firebase-config]: Failed to load service account JSON from file: ${filePath}`, error);
    return null;
  }
}

if (serviceAccountBase64) {
  try {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    credential = admin.credential.cert(JSON.parse(json));
  } catch (error) {
    console.error('[firebase-config]: Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64.', error);
    credential = null;
  }
} else if (serviceAccountPath) {
  credential = loadServiceAccountFromFile(serviceAccountPath);
}

// Dev fallback: if no env var provided (or it points to a missing file), try a local ignored key file.
// Put your service account at backend/keys/serviceAccount.json (it's gitignored).
if (!credential) {
  const localFallbackPath = path.resolve(__dirname, '../../keys/serviceAccount.json');
  credential = loadServiceAccountFromFile(localFallbackPath);
}

if (!credential) {
  // Don't crash the entire server if Firebase Admin isn't configured.
  // Endpoints that require auth/db should return a clear error instead.
  console.warn(
    '[firebase-config]: Firebase Admin is not configured. ' +
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH ' +
      '(or create backend/keys/serviceAccount.json for local dev).'
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