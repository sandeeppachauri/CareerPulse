// routes/profile.js — LinkedIn profile analysis & user profile management
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../config/database');
const profileAnalyzer = require('../services/profileAnalyzer');

// ── GET /api/profile — Get full profile ──────────────────────────────────
router.get('/', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, uuid, name, email, mobile, linkedin_url, current_role, years_exp,
           location, skills, profile_score, avatar_initials, is_verified, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  const latestAnalysis = db.prepare(`
    SELECT * FROM profile_analyses WHERE user_id = ? ORDER BY analyzed_at DESC LIMIT 1
  `).get(req.user.id);

  const portals = db.prepare(`
    SELECT * FROM portal_connections WHERE user_id = ?
  `).all(req.user.id);

  res.json({
    user: { ...user, skills: JSON.parse(user.skills || '[]') },
    analysis: latestAnalysis ? {
      ...latestAnalysis,
      section_scores: JSON.parse(latestAnalysis.section_scores || '{}'),
      suggestions: JSON.parse(latestAnalysis.suggestions || '[]'),
      keywords_missing: JSON.parse(latestAnalysis.keywords_missing || '[]')
    } : null,
    portals
  });
});

// ── PUT /api/profile — Update profile ────────────────────────────────────
router.put('/', auth, (req, res) => {
  const db = getDb();
  const { name, linkedin_url, current_role, years_exp, location, skills } = req.body;

  const skillsJson = Array.isArray(skills) ? JSON.stringify(skills) : (skills || '[]');
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : req.user.avatar_initials;

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      linkedin_url = COALESCE(?, linkedin_url),
      current_role = COALESCE(?, current_role),
      years_exp = COALESCE(?, years_exp),
      location = COALESCE(?, location),
      skills = ?,
      avatar_initials = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, linkedin_url, current_role, years_exp, location, skillsJson, initials, req.user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: { ...updated, skills: JSON.parse(updated.skills || '[]') }, message: 'Profile updated!' });
});

// ── POST /api/profile/analyze — Run AI profile analysis ──────────────────
router.post('/analyze', auth, async (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  try {
    const analysis = await profileAnalyzer.analyze(user);

    // Save analysis
    db.prepare(`
      INSERT INTO profile_analyses (user_id, overall_score, section_scores, suggestions, keywords_missing, ai_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      analysis.overall_score,
      JSON.stringify(analysis.section_scores),
      JSON.stringify(analysis.suggestions),
      JSON.stringify(analysis.keywords_missing),
      analysis.ai_summary
    );

    // Update user's profile score
    db.prepare('UPDATE users SET profile_score = ? WHERE id = ?').run(analysis.overall_score, user.id);

    // Create notification
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES (?, 'profile', ?, ?)
    `).run(user.id, 'Profile Analysis Complete', `Your profile scored ${analysis.overall_score}/100. ${analysis.suggestions.length} suggestions available.`);

    res.json({ analysis, message: 'Analysis complete!' });
  } catch (err) {
    console.error('Analysis error:', err.message);
    // Return rule-based analysis as fallback
    const fallback = profileAnalyzer.ruleBasedAnalysis(user);
    res.json({ analysis: fallback, message: 'Analysis complete (basic mode)', fallback: true });
  }
});

// ── GET /api/profile/score-history — Score history ───────────────────────
router.get('/score-history', auth, (req, res) => {
  const db = getDb();
  const history = db.prepare(`
    SELECT overall_score, analyzed_at FROM profile_analyses
    WHERE user_id = ? ORDER BY analyzed_at DESC LIMIT 10
  `).all(req.user.id);
  res.json({ history });
});

module.exports = router;
