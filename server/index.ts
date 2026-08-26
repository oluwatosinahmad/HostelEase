import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import db from './db';
import { runMigrations } from './migrate';
import authRoutes from './routes/authRoutes';
import propertyRoutes from './routes/propertyRoutes';
import savedRoutes from './routes/savedRoutes';
import inspectionRoutes from './routes/inspectionRoutes';
import reportRoutes from './routes/reportRoutes';
import providerRoutes from './routes/providerRoutes';
import adminRoutes from './routes/adminRoutes';
import areaRoutes from './routes/areaRoutes';
import uploadRoutes from './routes/uploadRoutes';
import notificationRoutes from './routes/notificationRoutes';
import verificationRoutes from './routes/verificationRoutes';
import publicProviderRoutes from './routes/publicProviderRoutes';
import discoveryRoutes from './routes/discoveryRoutes';
import messageRoutes from './routes/messageRoutes';
import bookingRoutes from './routes/bookingRoutes';
import paymentRoutes from './routes/paymentRoutes';
import studentDashboardRoutes from './routes/studentDashboardRoutes';
import aiAssistantRoutes from './routes/aiAssistantRoutes';
import disputeRoutes from './routes/disputeRoutes';
import moveInRoutes from './routes/moveInRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import communityRoutes from './routes/communityRoutes';
import roommateRoutes from './routes/roommateRoutes';
import operationsRoutes from './routes/operationsRoutes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure migrations run automatically on startup
runMigrations();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_START_TIME = new Date();

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists and serve uploaded accommodation media statically
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// Health check endpoint (for load balancers, uptime monitors, and Kubernetes/PM2)
app.get('/api/health', (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  try {
    db.prepare('SELECT 1').get();
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME.getTime()) / 1000);

  res.status(dbStatus === 'healthy' ? 200 : 503).json({
    status: dbStatus === 'healthy' ? 'ok' : 'degraded',
    platform: 'Hostel Ease',
    tagline: 'Find your hostel. Stress less.',
    university: 'LAUTECH, Ogbomoso, Oyo State, Nigeria',
    environment: NODE_ENV,
    database: dbStatus,
    uptimeSeconds,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/saved-properties', savedRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/operations', operationsRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/public/providers', publicProviderRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/student', studentDashboardRoutes);
app.use('/api/ai', aiAssistantRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/move-in', moveInRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/roommates', roommateRoutes);

// Production Static Serving: Unified React SPA delivery
const DIST_PATH = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_PATH)) {
  // Serve static assets with caching headers
  app.use(express.static(DIST_PATH, {
    maxAge: '1d',
    index: false
  }));

  // Wildcard fallback for React Router SPA (non-API / non-upload routes)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'SERVER_ERROR'
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Hostel Ease Production Server running on port ${PORT} [${NODE_ENV}]`);
  console.log(`📍 Market: LAUTECH students | Ogbomoso, Oyo State, Nigeria`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown for Process Managers (PM2, Docker, systemd)
function handleGracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('🔒 HTTP server closed.');
    try {
      db.close();
      console.log('💾 SQLite database connection closed cleanly.');
    } catch (e: any) {
      console.error('Error closing SQLite database:', e.message);
    }
    process.exit(0);
  });

  // Force exit if hanging after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default app;
