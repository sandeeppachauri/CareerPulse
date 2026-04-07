// server.js — CareerPulse Backend Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Run database migrations on startup ────────────────────────────────────
try {
  require('./database/migrate');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}

// ── Middleware ────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '200'),
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/jobs',         require('./routes/jobs'));
app.use('/api/profile',      require('./routes/profile'));
app.use('/api/alerts',       require('./routes/alerts'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/portals',      require('./routes/portals'));

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CareerPulse API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ── Serve Frontend (if built) ─────────────────────────────────────────────
const frontendPath = path.join(__dirname, '../frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// ── Error Handler ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CareerPulse API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);

  // Start background scheduler
  if (process.env.NODE_ENV !== 'test') {
    const { startScheduler } = require('./services/scheduler');
    startScheduler();

    // Seed initial jobs on first run
    setTimeout(async () => {
      const { getDb } = require('./config/database');
      const db = getDb();
      const jobCount = db.prepare('SELECT COUNT(*) as cnt FROM jobs').get();
      if (jobCount.cnt === 0) {
        console.log('🌱 Seeding initial jobs...');
        const { syncJobs } = require('./services/jobService');
        await syncJobs([], 'integration engineer', 'India');
      }
    }, 2000);
  }
});

module.exports = app;
