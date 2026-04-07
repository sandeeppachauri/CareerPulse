// services/scheduler.js — Background cron jobs
const cron = require('node-cron');
const { getDb } = require('../config/database');
const jobService = require('./jobService');
const emailService = require('./emailService');

function startScheduler() {
  console.log('⏰ Starting job scheduler...');

  // ── Sync jobs every 6 hours ──────────────────────────────────────────────
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running scheduled job sync...');
    try {
      const db = getDb();

      // Get distinct roles from active users
      const userRoles = db.prepare(`
        SELECT DISTINCT current_role FROM users
        WHERE current_role IS NOT NULL AND last_login_at > datetime('now', '-7 days')
        LIMIT 10
      `).all();

      for (const { current_role } of userRoles) {
        await jobService.syncJobs(['linkedin', 'naukri', 'indeed'], current_role, 'India');
        await new Promise(r => setTimeout(r, 2000)); // Rate limit between syncs
      }

      // Fallback: sync generic tech jobs
      if (userRoles.length === 0) {
        await jobService.syncJobs([], 'software engineer', 'India');
      }

      console.log('✅ Scheduled job sync complete');
    } catch (err) {
      console.error('❌ Scheduled sync failed:', err.message);
    }
  });

  // ── Check alerts and send notifications every 2 hours ─────────────────
  cron.schedule('0 */2 * * *', async () => {
    console.log('🔔 Checking job alerts...');
    try {
      const db = getDb();

      const activeAlerts = db.prepare(`
        SELECT a.*, u.email, u.name, u.current_role
        FROM alerts a
        JOIN users u ON a.user_id = u.id
        WHERE a.is_active = 1
        AND (a.last_run IS NULL OR a.last_run < datetime('now', '-2 hours'))
      `).all();

      for (const alert of activeAlerts) {
        try {
          const keywords = JSON.parse(alert.keywords || '[]');
          if (!keywords.length && !alert.current_role) continue;

          const searchTerm = keywords[0] || alert.current_role;

          // Find matching jobs posted since last run
          const since = alert.last_run || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const matchingJobs = db.prepare(`
            SELECT * FROM jobs
            WHERE is_active = 1
            AND posted_at > ?
            AND (title LIKE ? OR description LIKE ?)
            ORDER BY posted_at DESC
            LIMIT 10
          `).all(since, `%${searchTerm}%`, `%${searchTerm}%`);

          if (matchingJobs.length > 0) {
            // Create in-app notification
            db.prepare(`
              INSERT INTO notifications (user_id, type, title, message, data)
              VALUES (?, 'alert', ?, ?, ?)
            `).run(
              alert.user_id,
              `${matchingJobs.length} new jobs for "${alert.name}"`,
              `Matching: ${matchingJobs.map(j => j.title).slice(0, 2).join(', ')}...`,
              JSON.stringify({ job_ids: matchingJobs.map(j => j.id), alert_id: alert.id })
            );

            // Send email if enabled
            if (alert.notify_email && alert.email) {
              try {
                await emailService.sendJobAlert(alert.email, alert.name, alert.name, matchingJobs);
              } catch (emailErr) {
                console.error('Alert email failed:', emailErr.message);
              }
            }
          }

          // Update last_run
          db.prepare('UPDATE alerts SET last_run = CURRENT_TIMESTAMP WHERE id = ?').run(alert.id);
        } catch (err) {
          console.error(`Alert ${alert.id} processing failed:`, err.message);
        }
      }

      console.log(`✅ Processed ${activeAlerts.length} alerts`);
    } catch (err) {
      console.error('❌ Alert check failed:', err.message);
    }
  });

  // ── Clean up old notifications every day at 3 AM ──────────────────────
  cron.schedule('0 3 * * *', () => {
    try {
      const db = getDb();
      const result = db.prepare(`
        DELETE FROM notifications WHERE created_at < datetime('now', '-30 days') AND is_read = 1
      `).run();
      console.log(`🧹 Cleaned up ${result.changes} old notifications`);
    } catch (err) {
      console.error('Cleanup failed:', err.message);
    }
  });

  console.log('✅ Scheduler started (job sync every 6h, alerts every 2h)');
}

module.exports = { startScheduler };
