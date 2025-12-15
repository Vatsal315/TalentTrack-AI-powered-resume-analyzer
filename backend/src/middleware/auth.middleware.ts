import { Request as ExpressRequest, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { auth as firebaseAuth } from '../config/firebase.config';

// Extend Express Request interface to include 'user' property
interface CustomRequest extends ExpressRequest {
    user?: admin.auth.DecodedIdToken;
}

function decodeJwtPayload(token: string): any | null {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payloadB64Url = parts[1];
        const payloadB64 = payloadB64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payloadB64Url.length / 4) * 4, '=');
        const json = Buffer.from(payloadB64, 'base64').toString('utf-8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export const authenticateToken = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        res.status(401).json({ message: 'Unauthorized: No token provided' });
        return;
    }

    try {
        if (firebaseAuth) {
            const decodedToken = await firebaseAuth.verifyIdToken(token);
            req.user = decodedToken; // Attach decoded user info to the request object
            console.log(`[auth]: User authenticated: ${decodedToken.uid}`);
            next(); // Proceed to the next middleware or route handler
            return;
        }

        // Dev fallback: allow local development to proceed even if Firebase Admin isn't configured.
        // This DOES NOT verify the token signature; don't rely on this in production.
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
            const payload = decodeJwtPayload(token);
            const uid = payload?.user_id || payload?.sub;
            if (!uid) {
                res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
                return;
            }
            req.user = { uid, ...payload } as any;
            console.warn('[auth]: Firebase Admin not configured; using unverified token payload (dev-only).');
            next();
            return;
        }

        res.status(500).json({
            message:
                'Firebase Admin is not configured on the backend. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH.',
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("[auth]: Token verification failed:", error.message);
            const err = error as { code?: string; message: string };
            if (err.code === 'auth/id-token-expired') {
                res.status(401).json({ message: 'Unauthorized: Token expired' });
            } else {
                res.status(401).json({ message: 'Unauthorized: Token verification failed', error: err.message });
            }
        }
    }
}; 

// Export authenticateToken as requireAuth for consistency across the codebase
export const requireAuth = authenticateToken;

// Optional authentication - sets req.user if token exists, but doesn't fail if missing
export const optionalAuth = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // If Firebase isn't configured, continue as anonymous.
    if (!firebaseAuth) {
        // If a token exists, attach an unverified payload in dev mode (same caveats as authenticateToken).
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev && token) {
            const payload = decodeJwtPayload(token);
            const uid = payload?.user_id || payload?.sub;
            if (uid) {
                req.user = { uid, ...payload } as any;
            }
        }
        next();
        return;
    }

    if (!token) {
        // No token provided - continue as anonymous
        next();
        return;
    }

    try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        req.user = decodedToken;
        console.log(`[auth]: User authenticated: ${decodedToken.uid}`);

        next();
    } catch (error: unknown) {
        // Token invalid - continue as anonymous but log the error
        if (error instanceof Error) {
            console.warn("[auth]: Optional auth failed, continuing as anonymous:", error.message);
        }

        next();
    }
}; 