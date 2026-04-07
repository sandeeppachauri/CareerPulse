// routes/applications.js — Application tracker
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../config/database');

// ── GET /api/applications ─────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const db = getDb();
  const apps = db.prepare(`
    SELECT a.*, j.title as job_title, j.company as job_company, j.location as job_location
    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);

  const stats = db.prepare(`
    SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status
  `).all(req.user.id);

  res.json({ applications: apps, stats });
});

// ── POST /api/applications — Add application ──────────────────────────────
router.post('/', auth, (req, res) => {
  const db = getDb();
  const { job_id, company, role, portal, status, applied_date, notes } = req.body;

  const result = db.prepare(`
    INSERT INTO applications (user_id, job_id, company, role, portal, status, applied_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, job_id || null, company, role, portal || null, status || 'applied', applied_date || new Date().toISOString().split('T')[0], notes || null);

  if (job_id) {
    db.prepare(`
      INSERT INTO user_jobs (user_id, job_id, status, applied_at)
      VALUES (?, ?, 'applied', CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, job_id) DO UPDATE SET status = 'applied', applied_at = CURRENT_TIMESTAMP
    `).run(req.user.id, job_id);
  }

  res.status(201).json({ id: result.lastInsertRowid, message: 'Application tracked!' });
});

// ── PUT /api/applications/:id — Update status ────────────────────────────
router.put('/:id', auth, (req, res) => {
  const db = getDb();
  const { status, notes, interview_date, offer_amount } = req.body;

  db.prepare(`
    UPDATE applications SET
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      interview_date = COALESCE(?, interview_date),
      offer_amount = COALESCE(?, offer_amount),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(status, notes, interview_date, offer_amount, req.params.id, req.user.id);

  res.json({ message: 'Application updated!' });
});

// ── DELETE /api/applications/:id ──────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Application removed' });
});

module.exports = router;
