// routes/jobs.js — Jobs aggregation & management
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../config/database');
const jobService = require('../services/jobService');
const matchService = require('../services/matchService');

// ── GET /api/jobs — Get all jobs with match scores ────────────────────────
router.get('/', auth, async (req, res) => {
  const db = getDb();
  const { search, tag, type, source, page = 1, limit = 20, sort = 'match' } = req.query;
  const offset = (page - 1) * limit;

  // Get user profile for match scoring
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  let whereClause = 'WHERE j.is_active = 1';
  const params = [];

  if (search) {
    whereClause += ' AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ? OR j.skills_required LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (source) {
    whereClause += ' AND j.source = ?';
    params.push(source);
  }
  if (type) {
    whereClause += ' AND j.work_mode = ?';
    params.push(type);
  }

  const jobs = db.prepare(`
    SELECT j.*,
           uj.status as user_status,
           uj.match_score as cached_match,
           uj.saved_at,
           uj.applied_at
    FROM jobs j
    LEFT JOIN user_jobs uj ON j.id = uj.job_id AND uj.user_id = ?
    ${whereClause}
    ORDER BY j.posted_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, ...params, parseInt(limit), parseInt(offset));

  // Compute match scores for jobs that don't have them yet
  const userSkills = JSON.parse(user.skills || '[]');
  const userRole = user.current_role || '';

  const jobsWithScores = jobs.map(job => {
    const score = job.cached_match || matchService.computeMatchScore(job, userRole, userSkills);

    // Cache the match score
    if (!job.cached_match) {
      db.prepare(`
        INSERT INTO user_jobs (user_id, job_id, match_score)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, job_id) DO UPDATE SET match_score = ?
      `).run(req.user.id, job.id, score, score);
    }

    return {
      ...job,
      match_score: score,
      skills_required: JSON.parse(job.skills_required || '[]'),
      is_saved: job.user_status === 'saved' || job.user_status === 'applied',
      is_applied: job.user_status === 'applied',
    };
  });

  // Sort by match score or date
  if (sort === 'match') {
    jobsWithScores.sort((a, b) => b.match_score - a.match_score);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM jobs j ${whereClause}`).get(...params);

  res.json({
    jobs: jobsWithScores,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total.cnt,
      pages: Math.ceil(total.cnt / limit)
    }
  });
});

// ── GET /api/jobs/stats — Job stats for dashboard ────────────────────────
router.get('/stats', auth, (req, res) => {
  const db = getDb();
  const uid = req.user.id;

  const newToday = db.prepare(`
    SELECT COUNT(*) as cnt FROM jobs WHERE DATE(fetched_at) = DATE('now') AND is_active = 1
  `).get();

  const saved = db.prepare(`SELECT COUNT(*) as cnt FROM user_jobs WHERE user_id = ? AND status = 'saved'`).get(uid);
  const applied = db.prepare(`SELECT COUNT(*) as cnt FROM applications WHERE user_id = ?`).get(uid);
  const totalJobs = db.prepare(`SELECT COUNT(*) as cnt FROM jobs WHERE is_active = 1`).get();

  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count FROM jobs WHERE is_active = 1 GROUP BY source
  `).all();

  res.json({
    new_today: newToday.cnt,
    saved: saved.cnt,
    applied: applied.cnt,
    total: totalJobs.cnt,
    by_source: bySource
  });
});

// ── POST /api/jobs/:id/save — Save/unsave a job ───────────────────────────
router.post('/:id/save', auth, (req, res) => {
  const db = getDb();
  const jobId = parseInt(req.params.id);

  const existing = db.prepare('SELECT * FROM user_jobs WHERE user_id = ? AND job_id = ?').get(req.user.id, jobId);

  if (existing && existing.status === 'saved') {
    // Unsave
    db.prepare('UPDATE user_jobs SET status = ?, saved_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND job_id = ?')
      .run('new', req.user.id, jobId);
    return res.json({ saved: false, message: 'Job removed from saved' });
  }

  db.prepare(`
    INSERT INTO user_jobs (user_id, job_id, status, saved_at, match_score)
    VALUES (?, ?, 'saved', CURRENT_TIMESTAMP, ?)
    ON CONFLICT(user_id, job_id) DO UPDATE SET status = 'saved', saved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, jobId, req.body.match_score || 0);

  res.json({ saved: true, message: 'Job saved!' });
});

// ── GET /api/jobs/saved — Get saved jobs ─────────────────────────────────
router.get('/saved', auth, (req, res) => {
  const db = getDb();
  const jobs = db.prepare(`
    SELECT j.*, uj.match_score, uj.saved_at, uj.status as user_status
    FROM jobs j
    JOIN user_jobs uj ON j.id = uj.job_id
    WHERE uj.user_id = ? AND uj.status IN ('saved', 'applied')
    ORDER BY uj.saved_at DESC
  `).all(req.user.id);

  res.json({ jobs: jobs.map(j => ({ ...j, skills_required: JSON.parse(j.skills_required || '[]') })) });
});

// ── POST /api/jobs/sync — Trigger job sync from portals ──────────────────
router.post('/sync', auth, async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // Get active portals for this user
  const portals = db.prepare(`
    SELECT portal_slug FROM portal_connections WHERE user_id = ? AND is_active = 1
  `).all(req.user.id).map(p => p.portal_slug);

  res.json({ message: 'Job sync started', portals });

  // Run sync in background
  try {
    const count = await jobService.syncJobs(portals, user.current_role, user.location);
    console.log(`Synced ${count} jobs for user ${req.user.id}`);
  } catch (err) {
    console.error('Job sync error:', err.message);
  }
});

module.exports = router;
