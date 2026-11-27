import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory and current directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import { isFirebaseAdminInitialized } from './services/firebaseAdmin.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

// Configurable CORS origins for frontend client deployments
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.CLIENT_ORIGIN,
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server health checks)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isVercelDomain = /\.vercel\.app$/.test(new URL(origin).hostname);
    const isNetlifyDomain = /\.netlify\.app$/.test(new URL(origin).hostname);
    const isRenderDomain = /\.onrender\.com$/.test(new URL(origin).hostname);
    const isDevMode = process.env.NODE_ENV !== 'production';

    if (isExplicitlyAllowed || isVercelDomain || isNetlifyDomain || isRenderDomain || isDevMode) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
  },
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VoiceFlow Backend',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'voiceflow-f53b8',
    firebaseAdminInitialized: isFirebaseAdminInitialized,
  });
});

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);

// In production or single-service deployment, serve Vite client build if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const altClientDistPath = path.resolve(process.cwd(), 'client/dist');
const activeDistPath = fs.existsSync(clientDistPath)
  ? clientDistPath
  : fs.existsSync(altClientDistPath)
  ? altClientDistPath
  : null;

if (activeDistPath) {
  app.use(express.static(activeDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(activeDistPath, 'index.html'));
  });
}

export { app };

// Start server on Render or local execution
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VoiceFlow Backend listening on 0.0.0.0:${PORT}`);
    console.log(`🩺 Gemini Status: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing GEMINI_API_KEY in server/.env'}`);
    console.log(`🔥 Firebase Admin Project: ${process.env.FIREBASE_PROJECT_ID || 'voiceflow-f53b8'}`);
  });
}
