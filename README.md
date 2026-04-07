# CareerPulse ⚡ — Complete Career Intelligence Platform

A full-stack web application for LinkedIn profile analysis, unified job portal aggregation, intelligent job matching, and automated career alerts.

---

## 📁 Project Structure

```
careerpulse/
├── backend/                    ← Node.js + Express API
│   ├── server.js               ← Entry point
│   ├── .env.example            ← Config template (copy to .env)
│   ├── Procfile                ← Railway/Heroku deploy config
│   ├── railway.toml            ← Railway deploy config
│   ├── database/
│   │   ├── migrate.js          ← Creates all DB tables
│   │   └── seed.js             ← Seeds 12 sample jobs
│   ├── config/
│   │   └── database.js         ← SQLite connection singleton
│   ├── middleware/
│   │   └── auth.js             ← JWT authentication guard
│   ├── routes/
│   │   ├── auth.js             ← Register, login, OTP verify
│   │   ├── jobs.js             ← Fetch, filter, save, sync jobs
│   │   ├── profile.js          ← Profile update + AI analysis
│   │   ├── alerts.js           ← CRUD alerts + notifications
│   │   ├── applications.js     ← Application tracker
│   │   └── portals.js          ← Portal connect/disconnect
│   └── services/
│       ├── jobService.js       ← Adzuna, JSearch, Indeed RSS + mock fallback
│       ├── matchService.js     ← Keyword-based 0-100 job match scoring
│       ├── profileAnalyzer.js  ← Claude AI analysis + rule-based fallback
│       ├── emailService.js     ← OTP emails, job alerts, welcome emails
│       └── scheduler.js        ← Cron: sync jobs every 6h, alerts every 2h
└── frontend/                   ← Vanilla HTML/CSS/JS SPA
    ├── index.html              ← Full app (all pages, UI)
    ├── netlify.toml            ← Netlify deploy config
    └── src/
        ├── api.js              ← API client (all backend calls)
        ├── state.js            ← App state + helper functions
        └── app.js              ← All page controllers + rendering
```

---

## 🚀 Quick Start (Local Development)

### Step 1 — Backend Setup
```bash
cd careerpulse/backend
cp .env.example .env          # Edit this file!
npm install
npm start
# API runs at http://localhost:3001
# Automatically runs migrations + seeds 12 sample jobs
```

### Step 2 — Frontend Setup
Open `frontend/index.html` in your browser. That's it!

> The `window.CAREERPULSE_API_URL` at the top of `index.html` points to `http://localhost:3001/api` by default.

---

## 🌐 Free Hosting — Zero Cost Stack

### Frontend → Netlify (Free Forever)

**Option A — Drag & Drop (30 seconds):**
1. Go to https://app.netlify.com/drop
2. Drag the entire `frontend/` folder
3. Done! You get a URL like `https://careerpulse-abc.netlify.app`

**Option B — GitHub (recommended for updates):**
```bash
# Push your frontend/ folder to a GitHub repo
# Then in Netlify: New Site → Import from GitHub → select repo
# Build command: (leave empty)
# Publish directory: .
```

### Backend → Railway.app (Free $5 credit/month)

1. Create account at https://railway.app
2. New Project → Deploy from GitHub repo
3. Select your repo → set root directory to `backend/`
4. Add environment variables (from `.env.example`):
   - `JWT_SECRET` = any long random string
   - `NODE_ENV` = production
   - `FRONTEND_URL` = your Netlify URL
5. Railway auto-detects Node.js and deploys!
6. Copy your Railway URL (e.g., `https://careerpulse.up.railway.app`)

### Connect Frontend to Backend

Edit the first `<script>` tag in `frontend/index.html`:
```html
<script>window.CAREERPULSE_API_URL = 'https://careerpulse.up.railway.app/api';</script>
```

Re-deploy the frontend to Netlify.

---

## 🔑 Environment Variables (.env)

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ Yes | Random string, min 32 chars |
| `NODE_ENV` | ✅ Yes | `development` or `production` |
| `FRONTEND_URL` | ✅ Yes | Your Netlify URL (for CORS) |
| `DB_PATH` | Optional | SQLite file path (default: `./database/careerpulse.db`) |
| `SMTP_USER` | Optional | Gmail address for email alerts |
| `SMTP_PASS` | Optional | Gmail App Password |
| `ANTHROPIC_API_KEY` | Optional | Enables AI profile analysis |
| `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Optional | Real job data (250 free calls/month) |
| `JSEARCH_API_KEY` | Optional | RapidAPI key for JSearch (200 free/month) |

> **Without any API keys**: App works fully with 12 seeded sample jobs and rule-based profile analysis.

---

## 🔌 Getting Free API Keys

### Adzuna (Job Data — 250 calls/month free)
1. Go to https://developer.adzuna.com/
2. Sign up → Create App
3. Copy `App ID` and `App Key` to `.env`

### JSearch via RapidAPI (200 calls/month free)
1. Go to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Sign up → Subscribe to Free plan
3. Copy API key to `JSEARCH_API_KEY`

### Claude API (AI Profile Analysis — pay per use)
1. Go to https://console.anthropic.com/
2. Create API key
3. Cost: ~$0.003 per analysis (very cheap)

### Gmail SMTP (Email Alerts — free)
1. Enable 2FA on your Gmail account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password for "Mail"
4. Add to `SMTP_USER` and `SMTP_PASS`

---

## 💰 Monthly Cost Estimate

| Service | Free Tier | Notes |
|---|---|---|
| Netlify (Frontend) | ✅ Free forever | 100GB bandwidth/month |
| Railway (Backend) | ✅ $5 credit/month | Enough for ~500 users |
| SQLite Database | ✅ Included in Railway | File on Railway disk |
| Gmail SMTP | ✅ 500 emails/day free | Use App Password |
| Adzuna API | ✅ 250 calls/month | ~1 sync every 3 days |
| JSearch API | ✅ 200 calls/month | ~1 sync every 3-4 days |
| Claude API | ~$0.50-2/month | Pay per AI analysis |

**Total: $0-2/month** 🎉

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in (email or mobile) |
| POST | `/api/auth/verify-otp` | Verify email OTP |
| GET | `/api/auth/me` | Get current user |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | Get jobs with match scores |
| GET | `/api/jobs/stats` | Dashboard stats |
| POST | `/api/jobs/:id/save` | Save/unsave job |
| GET | `/api/jobs/saved` | Get saved jobs |
| POST | `/api/jobs/sync` | Trigger job sync |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get full profile + analysis |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/analyze` | Run AI analysis |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | Get alerts |
| POST | `/api/alerts` | Create alert |
| PUT | `/api/alerts/:id` | Update alert |
| DELETE | `/api/alerts/:id` | Delete alert |
| GET | `/api/alerts/notifications` | Get notifications |
| POST | `/api/alerts/notifications/read-all` | Mark all read |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/applications` | Get applications + stats |
| POST | `/api/applications` | Add application |
| PUT | `/api/applications/:id` | Update status |
| DELETE | `/api/applications/:id` | Remove |

### Portals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/portals` | Get all portals + status |
| POST | `/api/portals/:slug/connect` | Connect portal |
| POST | `/api/portals/:slug/disconnect` | Disconnect portal |

---

## 🗄️ Database Schema (SQLite)

8 tables:
- `users` — email + mobile as identity key, JWT auth
- `portal_connections` — which portals each user has connected
- `jobs` — aggregated jobs from all portals
- `user_jobs` — user-job relationships (saved, applied, match score)
- `alerts` — job alert configurations
- `notifications` — in-app + email notifications
- `profile_analyses` — AI analysis history
- `applications` — application tracker

---

## 🔄 Background Scheduler

Runs automatically when server starts:
- **Every 6 hours**: Syncs new jobs from all configured portals
- **Every 2 hours**: Checks alerts and sends notifications to matching users
- **Every day at 3 AM**: Cleans up old read notifications (30+ days)

---

## 🧩 Features by Phase

### ✅ Phase 1 — Frontend UI
- Dark theme SPA with 9 pages
- Onboarding flow with 3 steps
- All UI components

### ✅ Phase 2 — Backend + Database
- JWT authentication (register/login/OTP)
- SQLite database with 8 tables
- REST API with all endpoints
- Email service (OTP + job alerts)
- Background job scheduler

### ✅ Phase 3 — Intelligence
- AI profile scoring (Claude API + rule-based fallback)
- Keyword-based job match scoring (0-100)
- Multi-portal job aggregation (Adzuna, JSearch, Indeed RSS)
- Automated alert notifications
- Application tracker with status pipeline

---

## 🐛 Troubleshooting

**"Cannot connect to server"** → Make sure backend is running (`npm start`) and `CAREERPULSE_API_URL` in `index.html` is correct.

**"CORS error"** → Set `FRONTEND_URL` in `.env` to match your frontend URL exactly (no trailing slash).

**No jobs showing** → Run `npm run seed` to add sample jobs, or click "Sync Jobs" in the app.

**Emails not sending** → Check `SMTP_USER`/`SMTP_PASS` in `.env`. In development, emails are logged to console.

**Railway deployment fails** → Make sure `package.json` is in the `backend/` root and all dependencies are in `dependencies` (not `devDependencies`).
