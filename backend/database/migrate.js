// database/migrate.js — Creates all CareerPulse tables
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/careerpulse.db';
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.resolve(DB_PATH));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🗄️  Running CareerPulse migrations...\n');

const migrations = [

// ── 1. USERS ──────────────────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  mobile          TEXT UNIQUE,
  password_hash   TEXT NOT NULL,
  linkedin_url    TEXT,
  current_role    TEXT,
  years_exp       INTEGER DEFAULT 0,
  location        TEXT,
  skills          TEXT DEFAULT '[]',
  profile_score   INTEGER DEFAULT 0,
  avatar_initials TEXT,
  is_verified     BOOLEAN DEFAULT 0,
  otp_code        TEXT,
  otp_expires_at  DATETIME,
  last_login_at   DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
)`,

// ── 2. PORTAL CONNECTIONS ────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS portal_connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portal_slug  TEXT NOT NULL,
  portal_name  TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT 1,
  last_synced  DATETIME,
  jobs_fetched INTEGER DEFAULT 0,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, portal_slug)
)`,

// ── 3. JOBS ──────────────────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS jobs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id   TEXT,
  source        TEXT NOT NULL,
  title         TEXT NOT NULL,
  company       TEXT NOT NULL,
  company_logo  TEXT,
  location      TEXT,
  job_type      TEXT DEFAULT 'full-time',
  work_mode     TEXT DEFAULT 'on-site',
  salary_min    INTEGER,
  salary_max    INTEGER,
  salary_currency TEXT DEFAULT 'INR',
  description   TEXT,
  requirements  TEXT,
  skills_required TEXT DEFAULT '[]',
  url           TEXT,
  is_active     BOOLEAN DEFAULT 1,
  posted_at     DATETIME,
  fetched_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(external_id, source)
)`,

// ── 4. USER JOBS ─────────────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS user_jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_score INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'new',
  notes       TEXT,
  applied_at  DATETIME,
  saved_at    DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
)`,

// ── 5. ALERTS ────────────────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  keywords    TEXT DEFAULT '[]',
  location    TEXT,
  job_type    TEXT,
  salary_min  INTEGER,
  portals     TEXT DEFAULT '[]',
  notify_email BOOLEAN DEFAULT 1,
  notify_sms  BOOLEAN DEFAULT 0,
  is_active   BOOLEAN DEFAULT 1,
  last_run    DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`,

// ── 6. NOTIFICATIONS ──────────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  data        TEXT DEFAULT '{}',
  is_read     BOOLEAN DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
)`,

// ── 7. PROFILE ANALYSES ──────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS profile_analyses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_score   INTEGER,
  section_scores  TEXT DEFAULT '{}',
  suggestions     TEXT DEFAULT '[]',
  keywords_missing TEXT DEFAULT '[]',
  ai_summary      TEXT,
  analyzed_at     DATETIME DEFAULT CURRENT_TIMESTAMP
)`,

// ── 8. APPLICATION TRACKER ────────────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS applications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id       INTEGER REFERENCES jobs(id),
  company      TEXT NOT NULL,
  role         TEXT NOT NULL,
  portal       TEXT,
  status       TEXT DEFAULT 'applied',
  applied_date DATE,
  notes        TEXT,
  interview_date DATETIME,
  offer_amount INTEGER,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
)`,

// ── 9. INDEXES ────────────────────────────────────────────────────────────
`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
`CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)`,
`CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)`,
`CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at)`,
`CREATE INDEX IF NOT EXISTS idx_user_jobs_user ON user_jobs(user_id)`,
`CREATE INDEX IF NOT EXISTS idx_user_jobs_status ON user_jobs(status)`,
`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`,
`CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, is_active)`,

];

// Run all migrations in a transaction
const runMigrations = db.transaction(() => {
  migrations.forEach((sql, i) => {
    try {
      db.exec(sql);
      if (!sql.startsWith('CREATE INDEX')) {
        const tableName = sql.match(/TABLE IF NOT EXISTS (\w+)/)?.[1];
        if (tableName) console.log(`  ✅ Table: ${tableName}`);
      }
    } catch (err) {
      console.error(`  ❌ Migration ${i + 1} failed:`, err.message);
      throw err;
    }
  });
});

runMigrations();
console.log('\n✅ All migrations completed successfully!\n');
db.close();
