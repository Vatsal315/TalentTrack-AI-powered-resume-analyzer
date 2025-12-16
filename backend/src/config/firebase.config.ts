import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Ensure env vars are loaded before reading them
dotenv.config();

// Firebase Admin import can differ between ESM/CJS runtimes (e.g. Jest).
// Normalize so `apps`, `initializeApp`, etc. are always present.
const adminSdk: typeof admin = ((admin as any)?.default ?? admin) as any;

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
    return adminSdk.credential.cert(serviceAccount);
  } catch (error) {
    console.error(`[firebase-config]: Failed to load service account JSON from file: ${filePath}`, error);
    return null;
  }
}

function loadServiceAccountFromKeysDir(): admin.credential.Credential | null {
  try {
    const keysDir = path.resolve(__dirname, '../../keys');
    if (!fs.existsSync(keysDir)) return null;

    const jsonFiles = fs
      .readdirSync(keysDir)
      .filter((name) => name.toLowerCase().endsWith('.json'))
      .sort();

    if (jsonFiles.length === 0) return null;

    // Prefer a stable conventional name, then common Firebase admin key naming, then the first file.
    const preferred =
      jsonFiles.find((f) => f === 'serviceAccount.json') ||
      jsonFiles.find((f) => f.includes('firebase-adminsdk')) ||
      jsonFiles[0];

    return loadServiceAccountFromFile(path.join(keysDir, preferred));
  } catch (error) {
    console.error('[firebase-config]: Failed to scan backend/keys for service account JSON.', error);
    return null;
  }
}

if (serviceAccountBase64) {
  try {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    credential = adminSdk.credential.cert(JSON.parse(json));
  } catch (error) {
    console.error('[firebase-config]: Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64.', error);
    credential = null;
  }
} else if (serviceAccountPath) {
  credential = loadServiceAccountFromFile(serviceAccountPath);
}

// Local dev fallback: if no env var provided (or it points to a missing file), try backend/keys/.
// This folder is gitignored so secrets aren't committed.
if (!credential) credential = loadServiceAccountFromKeysDir();

if (!credential) {
  // Don't crash the entire server if Firebase Admin isn't configured.
  // Endpoints that require auth/db should return a clear error instead.
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[firebase-config]: Firebase Admin is not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH ' +
        '(or place a service account JSON in backend/keys/ for local dev).'
    );
  }
}

// Initialize once (important for hot reload/tests)
if (credential) {
  const apps = (adminSdk as any).apps || [];
  if (apps.length === 0) {
    adminSdk.initializeApp({ credential });
    console.log('[firebase-config]: Firebase Admin SDK initialized successfully.');
  } else {
    console.log('[firebase-config]: Firebase Admin SDK already initialized.');
  }
}

// Export initialized services
const apps = (adminSdk as any).apps || [];
const isTest = process.env.NODE_ENV === 'test';
// In tests, firebase-admin is usually mocked and doesn't need real initialization.
export const db = apps.length ? adminSdk.firestore() : isTest ? adminSdk.firestore() : null;
export const auth = apps.length ? adminSdk.auth() : isTest ? adminSdk.auth() : null;