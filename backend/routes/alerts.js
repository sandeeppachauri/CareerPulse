// routes/alerts.js — Job alerts & notifications
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../config/database');

// ── GET /api/alerts — Get user alerts ────────────────────────────────────
router.get('/', auth, (req, res) => {
  const db = getDb();
  const alerts = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ alerts: alerts.map(a => ({ ...a, keywords: JSON.parse(a.keywords || '[]'), portals: JSON.parse(a.portals || '[]') })) });
});

// ── POST /api/alerts — Create alert ──────────────────────────────────────
router.post('/', auth, (req, res) => {
  const db = getDb();
  const { name, keywords, location, job_type, salary_min, portals, notify_email, notify_sms } = req.body;

  const result = db.prepare(`
    INSERT INTO alerts (user_id, name, keywords, location, job_type, salary_min, portals, notify_email, notify_sms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, name,
    JSON.stringify(keywords || []),
    location || null, job_type || null,
    salary_min || null,
    JSON.stringify(portals || []),
    notify_email ? 1 : 0,
    notify_sms ? 1 : 0
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Alert created!' });
});

// ── PUT /api/alerts/:id — Update alert ───────────────────────────────────
router.put('/:id', auth, (req, res) => {
  const db = getDb();
  const { name, keywords, location, is_active, notify_email, notify_sms } = req.body;

  db.prepare(`
    UPDATE alerts SET
      name = COALESCE(?, name),
      keywords = COALESCE(?, keywords),
      location = COALESCE(?, location),
      is_active = COALESCE(?, is_active),
      notify_email = COALESCE(?, notify_email),
      notify_sms = COALESCE(?, notify_sms)
    WHERE id = ? AND user_id = ?
  `).run(name, keywords ? JSON.stringify(keywords) : null, location, is_active, notify_email, notify_sms, req.params.id, req.user.id);

  res.json({ message: 'Alert updated!' });
});

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Alert deleted' });
});

// ── GET /api/alerts/notifications — Get user notifications ───────────────
router.get('/notifications', auth, (req, res) => {
  const db = getDb();
  const { unread_only } = req.query;

  let q = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unread_only === 'true') q += ' AND is_read = 0';
  q += ' ORDER BY created_at DESC LIMIT 50';

  const notifs = db.prepare(q).all(req.user.id);
  const unreadCount = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);

  res.json({ notifications: notifs.map(n => ({ ...n, data: JSON.parse(n.data || '{}') })), unread_count: unreadCount.cnt });
});

// ── POST /api/alerts/notifications/read-all ───────────────────────────────
router.post('/notifications/read-all', auth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
