// routes/auth.js — Authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const emailService = require('../services/emailService');

// ── Helper: generate JWT ──────────────────────────────────────────────────
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').optional().isMobilePhone().withMessage('Valid mobile number required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, mobile, current_role, years_exp, linkedin_url } = req.body;
  const db = getDb();

  try {
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR (mobile IS NOT NULL AND mobile = ?)').get(email, mobile || '');
    if (existing) {
      return res.status(409).json({ error: 'An account with this email or mobile already exists' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const avatar_initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const otp = generateOTP();
    const otp_expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (uuid, name, email, mobile, password_hash, linkedin_url, current_role, 
                         years_exp, avatar_initials, otp_code, otp_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(uuid, name, email, mobile || null, password_hash,
      linkedin_url || null, current_role || null, years_exp || 0, avatar_initials, otp, otp_expires);

    const userId = result.lastInsertRowid;

    // Send verification email
    try {
      await emailService.sendOTP(email, name, otp);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    // Add default portals
    const defaultPortals = [
      { slug: 'linkedin', name: 'LinkedIn' },
      { slug: 'naukri', name: 'Naukri' },
      { slug: 'indeed', name: 'Indeed' },
    ];
    const portalStmt = db.prepare('INSERT OR IGNORE INTO portal_connections (user_id, portal_slug, portal_name) VALUES (?, ?, ?)');
    defaultPortals.forEach(p => portalStmt.run(userId, p.slug, p.name));

    // Create default alert
    db.prepare(`
      INSERT INTO alerts (user_id, name, keywords, is_active)
      VALUES (?, ?, ?, 1)
    `).run(userId, 'My First Alert', JSON.stringify(current_role ? [current_role] : ['software engineer']));

    const token = generateToken(userId);
    res.status(201).json({
      message: 'Account created! Please verify your email.',
      token,
      user: { id: userId, uuid, name, email, mobile, avatar_initials, current_role, profile_score: 0 },
      requiresVerification: true
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or mobile required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { identifier, password } = req.body;
  const db = getDb();

  try {
    // Find by email OR mobile
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR mobile = ?
    `).get(identifier, identifier);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id, uuid: user.uuid, name: user.name, email: user.email,
        mobile: user.mobile, avatar_initials: user.avatar_initials,
        current_role: user.current_role, profile_score: user.profile_score,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
  if (new Date(user.otp_expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });

  db.prepare('UPDATE users SET is_verified = 1, otp_code = NULL WHERE id = ?').run(user.id);
  res.json({ message: 'Email verified successfully!' });
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = generateOTP();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?').run(otp, expires, user.id);

  try {
    await emailService.sendOTP(email, user.name, otp);
    res.json({ message: 'OTP resent to your email' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth'), (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, uuid, name, email, mobile, linkedin_url, current_role, years_exp,
           location, skills, profile_score, avatar_initials, is_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  res.json({ user });
});

module.exports = router;
