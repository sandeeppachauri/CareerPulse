// routes/portals.js — Portal connection management
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../config/database');

const ALL_PORTALS = [
  { slug: 'linkedin',  name: 'LinkedIn',  icon: '💼', color: '#0077b5', description: 'World\'s largest professional network' },
  { slug: 'naukri',    name: 'Naukri',    icon: '🔵', color: '#4f46e5', description: 'India\'s #1 job portal' },
  { slug: 'indeed',    name: 'Indeed',    icon: '🟠', color: '#ea580c', description: 'Global job search engine' },
  { slug: 'glassdoor', name: 'Glassdoor', icon: '🟣', color: '#16a34a', description: 'Jobs with salary & review insights' },
  { slug: 'instahyre', name: 'Instahyre', icon: '🔶', color: '#d97706', description: 'AI-based job matching for India' },
  { slug: 'angellist', name: 'AngelList', icon: '🟢', color: '#374151', description: 'Startup jobs & equity roles' },
  { slug: 'adzuna',    name: 'Adzuna',    icon: '🔷', color: '#1d4ed8', description: 'Aggregated job listings' },
];

// ── GET /api/portals — Get all portals with connection status ─────────────
router.get('/', auth, (req, res) => {
  const db = getDb();
  const connected = db.prepare('SELECT * FROM portal_connections WHERE user_id = ?').all(req.user.id);
  const connMap = {};
  connected.forEach(p => connMap[p.portal_slug] = p);

  const portals = ALL_PORTALS.map(p => ({
    ...p,
    is_connected: !!connMap[p.slug] && connMap[p.slug].is_active,
    last_synced: connMap[p.slug]?.last_synced,
    jobs_fetched: connMap[p.slug]?.jobs_fetched || 0,
    connected_at: connMap[p.slug]?.connected_at,
  }));

  res.json({ portals });
});

// ── POST /api/portals/:slug/connect ──────────────────────────────────────
router.post('/:slug/connect', auth, (req, res) => {
  const db = getDb();
  const portal = ALL_PORTALS.find(p => p.slug === req.params.slug);
  if (!portal) return res.status(404).json({ error: 'Portal not found' });

  db.prepare(`
    INSERT INTO portal_connections (user_id, portal_slug, portal_name, is_active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, portal_slug) DO UPDATE SET is_active = 1
  `).run(req.user.id, portal.slug, portal.name);

  // Create welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, 'portal', ?, ?)
  `).run(req.user.id, `${portal.name} Connected!`, `Jobs from ${portal.name} will now appear in your feed.`);

  res.json({ message: `${portal.name} connected successfully!` });
});

// ── POST /api/portals/:slug/disconnect ───────────────────────────────────
router.post('/:slug/disconnect', auth, (req, res) => {
  const db = getDb();
  db.prepare(`
    UPDATE portal_connections SET is_active = 0 WHERE user_id = ? AND portal_slug = ?
  `).run(req.user.id, req.params.slug);
  res.json({ message: 'Portal disconnected' });
});

module.exports = router;
