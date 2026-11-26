import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || 'voiceflow-f53b8';
const serviceAccountPathOrJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let isFirebaseAdminInitialized = false;

// Initialize Firebase Admin SDK
try {
  if (admin.apps.length === 0) {
    if (serviceAccountPathOrJson) {
      let serviceAccount: any;
      if (serviceAccountPathOrJson.trim().startsWith('{')) {
        // Direct JSON string
        serviceAccount = JSON.parse(serviceAccountPathOrJson);
      } else {
        // Path to JSON file
        const resolvedPath = path.resolve(serviceAccountPathOrJson);
        if (fs.existsSync(resolvedPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
        isFirebaseAdminInitialized = true;
        console.log(`🔥 Firebase Admin initialized with Service Account for project: ${projectId}`);
      }
    }

    if (!isFirebaseAdminInitialized) {
      // Initialize with Project ID only (supports Application Default Credentials or limited admin actions)
      admin.initializeApp({
        projectId,
      });
      isFirebaseAdminInitialized = true;
      console.log(`🔥 Firebase Admin initialized with Project ID: ${projectId}`);
    }
  } else {
    isFirebaseAdminInitialized = true;
  }
} catch (error) {
  console.error('⚠️ Firebase Admin SDK initialization error:', error);
}

export { admin, isFirebaseAdminInitialized };

// Extend Express Request type to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Express middleware to authenticate requests via Firebase ID Token
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <token>',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error.message);
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired Firebase ID token.',
      code: error.code || 'auth/invalid-token',
    });
  }
}

/**
 * Optional authentication: Attaches user if valid token exists, but doesn't block if missing
 */
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch {
      // Ignore token verification errors for optional auth
    }
  }

  return next();
}
