import { Router } from 'express';
import { requireAuth, isFirebaseAdminInitialized } from '../services/firebaseAdmin.js';
const router = Router();
// Endpoint to check Firebase Admin status
router.get('/status', (req, res) => {
    res.json({
        initialized: isFirebaseAdminInitialized,
        projectId: process.env.FIREBASE_PROJECT_ID || 'voiceflow-f53b8',
        serviceAccountConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
    });
});
// Protected endpoint to verify client token and return decoded profile
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'User token not verified' });
        }
        return res.json({
            success: true,
            user: {
                uid: user.uid,
                email: user.email,
                emailVerified: user.email_verified,
                authTime: user.auth_time,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to retrieve profile' });
    }
});
export default router;
