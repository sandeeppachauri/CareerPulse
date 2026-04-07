// frontend/src/app.js — Main application controller
// All pages, API integration, rendering logic

// ════════════════════════════════════════════════════════════
// BOOTSTRAP
// ════════════════════════════════════════════════════════════
let obSkills = [];
let alKeywords = [];
let stSkills = [];
let jobPage = 1;
let jobsData = [];

window.addEventListener('DOMContentLoaded', async () => {
  const token = api.getToken();
  const user = api.getUser();

  if (!token || !user) {
    hideLoading();
    showOnboarding();
    return;
  }

  // Has token — verify it's still valid
  try {
    await api.getMe();
    AppState.user = api.getUser();
    launchApp();
  } catch (err) {
    api.clearToken();
    hideLoading();
    showOnboarding();
  }
});

function hideLoading() {
  document.getElementById('appLoading').style.display = 'none';
}

async function launchApp() {
  hideLoading();
  document.getElementById('appShell').style.display = 'flex';
  updateSidebar();
  await Promise.all([
    loadDashboard(),
    loadNotificationBadge(),
  ]);
}

// ════════════════════════════════════════════════════════════
// AUTH & ONBOARDING
// ════════════════════════════════════════════════════════════
function showOnboarding() {
  document.getElementById('onboardingModal').style.display = 'flex';
  document.getElementById('loginModal').style.display = 'none';
  renderObPortals();
}

function showLogin() {
  document.getElementById('onboardingModal').style.display = 'none';
  document.getElementById('loginModal').style.display = 'flex';
}

function obStep(n) {
  [0, 1, 2].forEach(i => {
    document.getElementById(`ob-step-${i}`).style.display = i === n ? 'block' : 'none';
  });
  const dots = document.querySelectorAll('#onboardSteps .step-dot');
  dots.forEach((d, i) => {
    d.className = 'step-dot' + (i < n ? ' done' : '') + (i === n ? ' active' : '');
  });
}

async function obRegister() {
  const name = document.getElementById('ob-name').value.trim();
  const email = document.getElementById('ob-email').value.trim();
  const mobile = document.getElementById('ob-mobile').value.trim();
  const password = document.getElementById('ob-password').value;

  if (!name || !email || !password) return showToast('Please fill in all fields', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

  setLoading('ob-register', true);
  try {
    const res = await api.register({ name, email, mobile, password });
    AppState.user = res.user;
    showToast('Account created! Check your email for verification code.', 'success');
    obStep(1);
    // Show OTP modal
    document.getElementById('otp-email-display').textContent = email;
    document.getElementById('otpModal').style.display = 'flex';
    document.getElementById('onboardingModal').style.display = 'none';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('ob-register', false);
  }
}

async function doVerifyOtp() {
  const email = AppState.user?.email || document.getElementById('ob-email').value;
  const otp = document.getElementById('otp-input').value.trim();
  if (!otp || otp.length !== 6) return showToast('Enter the 6-digit code', 'error');

  setLoading('verify-otp', true);
  try {
    await api.verifyOtp(email, otp);
    showToast('Email verified!', 'success');
    document.getElementById('otpModal').style.display = 'none';
    document.getElementById('onboardingModal').style.display = 'flex';
    obStep(1);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('verify-otp', false);
  }
}

async function doResendOtp() {
  const email = AppState.user?.email;
  if (!email) return;
  try {
    await api.resendOtp(email);
    showToast('OTP resent to your email', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function addSkillTag(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const val = e.target.value.trim();
  if (!val || obSkills.includes(val)) return;
  obSkills.push(val);
  renderSkillTags('ob-skills-tags', obSkills, () => renderSkillTags('ob-skills-tags', obSkills));
  e.target.value = '';
}

function renderSkillTags(containerId, skills, onRemove) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = skills.map((s, i) => `
    <div class="form-tag">${s}<span class="rm" onclick="removeSkill('${containerId}',${i})">×</span></div>
  `).join('');
}

function removeSkill(containerId, index) {
  if (containerId === 'ob-skills-tags') obSkills.splice(index, 1);
  else if (containerId === 'st-skills-tags') stSkills.splice(index, 1);
  renderSkillTags(containerId, containerId === 'ob-skills-tags' ? obSkills : stSkills);
}

async function obSaveProfile() {
  const linkedin_url = document.getElementById('ob-linkedin').value.trim();
  const current_role = document.getElementById('ob-role').value.trim();
  const years_exp = parseInt(document.getElementById('ob-exp').value) || 0;
  const location = document.getElementById('ob-location').value.trim();

  setLoading('ob-profile', true);
  try {
    if (AppState.user) {
      await api.updateProfile({ linkedin_url, current_role, years_exp, location, skills: obSkills });
      AppState.user = api.getUser();
    }
    obStep(2);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('ob-profile', false);
  }
}

function renderObPortals() {
  const portals = [
    { slug: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { slug: 'naukri', name: 'Naukri', icon: '🔵' },
    { slug: 'indeed', name: 'Indeed', icon: '🟠' },
    { slug: 'glassdoor', name: 'Glassdoor', icon: '🟣' },
    { slug: 'instahyre', name: 'Instahyre', icon: '🔶' },
    { slug: 'angellist', name: 'AngelList', icon: '🟢' },
  ];
  document.getElementById('ob-portals-grid').innerHTML = portals.map(p => `
    <div class="portal-item connected" id="ob-p-${p.slug}" onclick="toggleObPortal('${p.slug}',this)">
      <div style="font-size:22px;margin-bottom:4px">${p.icon}</div>
      <div style="font-size:11px;font-weight:500">${p.name}</div>
      <div style="font-size:10px;color:var(--teal);margin-top:3px" id="ob-ps-${p.slug}">✓ On</div>
    </div>
  `).join('');
}

const selectedPortals = new Set(['linkedin', 'naukri', 'indeed', 'glassdoor', 'instahyre', 'angellist']);
function toggleObPortal(slug, el) {
  if (selectedPortals.has(slug)) {
    selectedPortals.delete(slug);
    el.classList.remove('connected');
    document.getElementById(`ob-ps-${slug}`).style.color = 'var(--muted)';
    document.getElementById(`ob-ps-${slug}`).textContent = '+ Connect';
  } else {
    selectedPortals.add(slug);
    el.classList.add('connected');
    document.getElementById(`ob-ps-${slug}`).style.color = 'var(--teal)';
    document.getElementById(`ob-ps-${slug}`).textContent = '✓ On';
  }
}

async function obFinish() {
  setLoading('ob-portals', true);
  try {
    // Connect selected portals
    const connects = [...selectedPortals].map(slug => api.connectPortal(slug).catch(() => {}));
    await Promise.all(connects);

    // Trigger first job sync
    api.syncJobs().catch(() => {});

    document.getElementById('onboardingModal').style.display = 'none';
    await launchApp();
    showToast('Welcome to CareerPulse! 🚀', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('ob-portals', false);
  }
}

async function doLogin() {
  const identifier = document.getElementById('li-identifier').value.trim();
  const password = document.getElementById('li-password').value;
  if (!identifier || !password) return showToast('Please fill in all fields', 'error');

  setLoading('login', true);
  try {
    await api.login(identifier, password);
    AppState.user = api.getUser();
    document.getElementById('loginModal').style.display = 'none';
    await launchApp();
    showToast('Welcome back!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('login', false);
  }
}

function doLogout() {
  if (!confirm('Sign out of CareerPulse?')) return;
  api.logout();
}

// ════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════
function showPage(name, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`)?.classList.add('active');
  if (navEl) navEl.classList.add('active');
  AppState.currentPage = name;
  closeSidebar();

  // Lazy load page data
  const loaders = {
    jobs: loadJobs,
    saved: loadSavedJobs,
    alerts: loadAlertsPage,
    analytics: loadAnalytics,
    network: renderNetworkTips,
    tracker: loadTracker,
    portals: loadPortals,
    settings: loadSettings,
    profile: loadProfile,
  };
  if (loaders[name]) loaders[name]();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

function updateSidebar() {
  const u = AppState.user;
  if (!u) return;
  const initials = u.avatar_initials || (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sb-avatar').textContent = initials;
  document.getElementById('sb-name').textContent = u.name?.split(' ').slice(0, 2).join(' ') || 'User';
  document.getElementById('sb-role').textContent = u.current_role || 'Set your role';
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
async function loadDashboard() {
  const u = AppState.user;
  if (u) {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dash-name').textContent = u.name?.split(' ')[0] || 'there';
    document.getElementById('page-dashboard').querySelector('.page-title').innerHTML = `${greet}, <span id="dash-name">${u.name?.split(' ')[0] || 'there'}</span> 👋`;

    if (u.profile_score > 0) {
      document.getElementById('ds-score').textContent = u.profile_score;
      animateRing('dash-score-ring', u.profile_score);
      document.getElementById('dash-score-num').textContent = u.profile_score;
    }
  }

  try {
    const stats = await api.getJobStats();
    AppState.jobStats = stats;
    document.getElementById('ds-new').textContent = stats.new_today || 0;
    document.getElementById('ds-applied').textContent = stats.applied || 0;
    document.getElementById('ds-total').textContent = stats.total || 0;

    if (stats.total > 0) {
      const nb = document.getElementById('nb-jobs');
      nb.textContent = stats.new_today || stats.total;
      nb.style.display = stats.new_today > 0 ? 'block' : 'none';
    }
  } catch (err) { /* silent */ }

  await loadDashTopJobs();
  await loadNotifications();
}

async function loadDashTopJobs() {
  try {
    const res = await api.getJobs({ limit: 4, sort: 'match' });
    jobsData = res.jobs || [];
    const el = document.getElementById('dash-top-jobs');
    if (!jobsData.length) {
      el.innerHTML = `<div class="empty-state" style="padding:20px 0"><div class="ei">🔍</div><p>No jobs yet. <a href="#" onclick="doSyncJobs()" style="color:var(--accent2)">Sync now</a></p></div>`;
      return;
    }
    el.innerHTML = jobsData.slice(0, 4).map(j => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="showPage('jobs',document.getElementById('nav-jobs'))">
        <div style="width:36px;height:36px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${portalIcon(j.source)}</div>
        <div style="flex:1;min-width:0">
          <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.title}</p>
          <p style="font-size:12px;color:var(--muted)">${j.company} · ${j.location || 'India'}</p>
        </div>
        <div style="background:rgba(108,99,255,.15);border-radius:7px;padding:4px 9px;font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--accent2);flex-shrink:0">${j.match_score || 0}%</div>
      </div>
    `).join('');
  } catch (err) { /* silent */ }
}

async function loadNotifications() {
  try {
    const res = await api.getNotifications();
    AppState.notifications = res.notifications || [];
    const count = res.unread_count || 0;

    // Notification badge
    const nb = document.getElementById('nb-notifs');
    const dc = document.getElementById('dash-notif-count');
    if (count > 0) {
      nb.textContent = count > 9 ? '9+' : count;
      nb.style.display = 'block';
      if (dc) { dc.textContent = `${count} new`; dc.style.display = 'inline-flex'; }
    } else {
      nb.style.display = 'none';
      if (dc) dc.style.display = 'none';
    }

    const el = document.getElementById('dash-notifications');
    if (!AppState.notifications.length) {
      el.innerHTML = `<div class="empty-state" style="padding:20px 0"><div class="ei">🔔</div><p>No notifications yet</p></div>`;
      return;
    }
    el.innerHTML = AppState.notifications.slice(0, 5).map(n => `
      <div class="alert-row" style="${!n.is_read ? 'border-color:rgba(108,99,255,.3)' : ''}">
        <div class="alert-icon-wrap">${notifIcon(n.type)}</div>
        <div class="alert-content" style="flex:1">
          <h4>${n.title}</h4>
          <p>${n.message || ''}</p>
        </div>
        <div class="alert-time">${timeAgo(n.created_at)}</div>
      </div>
    `).join('');
  } catch (err) { /* silent */ }
}

async function loadNotificationBadge() {
  try {
    const res = await api.getNotifications(true);
    const count = res.unread_count || 0;
    const nb = document.getElementById('nb-notifs');
    if (count > 0) { nb.textContent = count > 9 ? '9+' : count; nb.style.display = 'block'; }
  } catch (err) { /* silent */ }
}

function notifIcon(type) {
  const map = { alert: '🔔', portal: '🔌', profile: '🧠', job: '💼', system: '⚡' };
  return map[type] || 'ℹ️';
}

async function doSyncJobs() {
  setLoading('sync', true);
  try {
    await api.syncJobs();
    showToast('Job sync started! New jobs will appear shortly.', 'info');
    setTimeout(() => { loadDashboard(); if (AppState.currentPage === 'jobs') loadJobs(); }, 3000);
  } catch (err) {
    showToast('Sync failed: ' + err.message, 'error');
  } finally {
    setLoading('sync', false);
  }
}

// ════════════════════════════════════════════════════════════
// PROFILE AI
// ════════════════════════════════════════════════════════════
async function loadProfile() {
  try {
    const res = await api.getProfile();
    const u = res.user;
    AppState.user = { ...AppState.user, ...u };

    document.getElementById('lp-avatar').textContent = u.avatar_initials || '?';
    document.getElementById('lp-name').textContent = u.name || '—';
    document.getElementById('lp-headline').textContent = (u.current_role || '') + (u.skills?.length ? ' | ' + u.skills.slice(0, 3).join(' | ') : '');
    document.getElementById('lp-location').textContent = u.location || 'India';

    // Simulated stats (would be real from LinkedIn API)
    const seed = (u.id || 1) * 7;
    document.getElementById('lp-stat1').textContent = 30 + (seed % 50);
    document.getElementById('lp-stat2').textContent = 10 + (seed % 20);
    document.getElementById('lp-stat3').textContent = 5 + (seed % 15);

    if (res.analysis) renderProfileAnalysis(res.analysis);
  } catch (err) { /* silent */ }
}

async function runProfileAnalysis() {
  ['btn-analyze', 'btn-analyze2', 'btn-dash-analyze'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = true; el.innerHTML = '<span class="spinner"></span> Analyzing...'; }
  });

  try {
    const res = await api.analyzeProfile();
    renderProfileAnalysis(res.analysis);
    showToast('Profile analysis complete!', 'success');

    // Update dashboard score
    const score = res.analysis.overall_score;
    document.getElementById('ds-score').textContent = score;
    document.getElementById('ds-score-sub').textContent = score >= 80 ? '⭐ All-Star level' : `${100 - score} pts to All-Star`;
    animateRing('dash-score-ring', score);
    document.getElementById('dash-score-num').textContent = score;
  } catch (err) {
    showToast('Analysis failed: ' + err.message, 'error');
  } finally {
    ['btn-analyze', 'btn-analyze2', 'btn-dash-analyze'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.disabled = false; el.innerHTML = id === 'btn-dash-analyze' ? 'Analyze Now ✨' : 'Analyze Profile ✨'; }
    });
  }
}

function renderProfileAnalysis(analysis) {
  if (!analysis) return;
  const score = analysis.overall_score || 0;
  const scoreLabel = score >= 85 ? 'All-Star' : score >= 70 ? 'Good' : score >= 55 ? 'Average' : 'Needs Work';

  document.getElementById('profile-score-num').textContent = score;
  document.getElementById('profile-score-label').textContent = scoreLabel;
  animateRing('profile-score-ring', score);
  animateRing('dash-score-ring', score);
  document.getElementById('dash-score-num').textContent = score;
  document.getElementById('ds-score').textContent = score;

  document.getElementById('profile-ai-summary').textContent = analysis.ai_summary || 'Analysis complete.';

  // Chips
  const chips = document.getElementById('profile-insight-chips');
  const missing = analysis.keywords_missing || [];
  chips.innerHTML = missing.slice(0, 4).map(k => `
    <div style="display:flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:4px 11px;font-size:11.5px">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--amber)"></div>${k}
    </div>
  `).join('');

  // Section bars
  const sections = analysis.section_scores || {};
  const sectionLabels = { headline: 'Headline', summary: 'Summary / About', experience: 'Experience', skills: 'Skills & Endorsements', photo_banner: 'Photo & Banner', recommendations: 'Recommendations', activity: 'Activity & Posts', linkedin_url: 'Custom URL' };
  document.getElementById('profile-section-bars').innerHTML = Object.entries(sections).map(([k, v]) => `
    <div class="strength-bar">
      <div class="sb-head"><span>${sectionLabels[k] || k}</span><span style="color:${scoreColor(v)}">${v}%</span></div>
      <div class="sb-track"><div class="sb-fill" style="width:${v}%;background:${scoreColor(v)}"></div></div>
    </div>
  `).join('');

  // Dashboard bars (top 4)
  const top4 = Object.entries(sections).slice(0, 4);
  document.getElementById('dash-score-bars').innerHTML = top4.map(([k, v]) => `
    <div class="strength-bar" style="margin-bottom:10px">
      <div class="sb-head"><span style="font-size:12px">${sectionLabels[k] || k}</span><span style="font-size:12px;color:${scoreColor(v)}">${v}%</span></div>
      <div class="sb-track"><div class="sb-fill" style="width:${v}%;background:${scoreColor(v)}"></div></div>
    </div>
  `).join('');

  // Suggestions
  const suggestions = analysis.suggestions || [];
  const priorityColors = { high: 'rgba(251,113,133,.15)', medium: 'rgba(251,191,36,.1)', easy: 'rgba(74,222,128,.1)', strategic: 'rgba(108,99,255,.1)' };
  const priorityBorderColors = { high: 'rgba(251,113,133,.35)', medium: 'rgba(251,191,36,.3)', easy: 'rgba(74,222,128,.25)', strategic: 'rgba(108,99,255,.3)' };
  const priorityBadge = { high: 'badge-rose', medium: 'badge-amber', easy: 'badge-green', strategic: 'badge-purple' };

  if (suggestions.length > 0) {
    document.getElementById('profile-sug-count').textContent = `${suggestions.length} Actions`;
    document.getElementById('profile-sug-count').style.display = 'inline-flex';
    document.getElementById('profile-suggestions').innerHTML = suggestions.map(s => `
      <div class="suggestion-item" style="background:${priorityColors[s.priority] || 'var(--surface)'};border-color:${priorityBorderColors[s.priority] || 'var(--border)'}">
        <div class="sug-icon" style="background:rgba(255,255,255,.05)">${s.icon || '💡'}</div>
        <div class="sug-body" style="flex:1">
          <h4>${s.title}</h4>
          <p>${s.detail}</p>
          ${s.action ? `<button class="btn btn-ghost btn-sm" style="margin-top:10px">${s.action}</button>` : ''}
        </div>
        <div style="flex-shrink:0"><span class="badge ${priorityBadge[s.priority] || 'badge-gray'}">${s.priority || 'tip'}</span></div>
      </div>
    `).join('');
  }
}

// ════════════════════════════════════════════════════════════
// JOBS
// ════════════════════════════════════════════════════════════
let jobView = 'all';
let jobTag = 'all';
const searchDebounced = debounce((v) => { jobPage = 1; loadJobs(); }, 400);

function onJobSearch(v) { AppState.jobFilters.search = v; searchDebounced(v); }

function setJobView(v, el) {
  jobView = v;
  document.querySelectorAll('#page-jobs .toggle-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  jobPage = 1;
  loadJobs();
}

function setJobTag(tag, el) {
  jobTag = tag;
  document.querySelectorAll('#job-filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  jobPage = 1;
  loadJobs();
}

async function loadJobs() {
  const params = { page: jobPage, limit: 20, sort: 'match' };
  const search = document.getElementById('job-search')?.value.trim();
  if (search) params.search = search;

  // Apply view filters
  if (jobView === 'remote') params.type = 'remote';
  if (jobView === 'new') params.new_only = true;

  // Apply tag filters
  if (jobTag !== 'all') {
    if (['remote', 'hybrid'].includes(jobTag)) params.type = jobTag;
    else if (['linkedin', 'naukri', 'indeed', 'glassdoor'].includes(jobTag)) params.source = jobTag;
  }

  const grid = document.getElementById('jobs-grid');
  if (jobPage === 1) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><span class="spinner" style="width:28px;height:28px;border-width:3px"></span></div>`;

  try {
    const res = await api.getJobs(params);
    const jobs = res.jobs || [];

    if (jobPage === 1) jobsData = jobs;
    else jobsData = [...jobsData, ...jobs];

    document.getElementById('jobs-sub').textContent = `${res.pagination?.total || 0} jobs from all connected portals`;

    if (jobView === 'best') jobs.sort((a, b) => b.match_score - a.match_score);

    grid.innerHTML = jobs.length
      ? jobs.map(j => jobCardHTML(j)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🔍</div><h3>No jobs found</h3><p>Try different filters or <a href="#" onclick="doSyncJobs()" style="color:var(--accent2)">sync new jobs</a></p></div>`;

    const lm = document.getElementById('jobs-load-more');
    if (res.pagination && jobPage < res.pagination.pages) {
      lm.style.display = 'block';
    } else {
      lm.style.display = 'none';
    }
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">⚠️</div><h3>Failed to load jobs</h3><p>${err.message}</p></div>`;
  }
}

function loadMoreJobs() {
  jobPage++;
  loadJobs();
}

function jobCardHTML(j) {
  const salary = formatSalary(j.salary_min, j.salary_max);
  const skills = Array.isArray(j.skills_required) ? j.skills_required : (JSON.parse(j.skills_required || '[]'));
  return `
    <div class="job-card ${j.is_saved ? 'is-saved' : ''}" id="jc-${j.id}">
      <div style="display:flex;align-items:flex-start;gap:13px">
        <div class="company-logo">${portalIcon(j.source)}</div>
        <div style="flex:1;min-width:0">
          <div class="job-title">${j.title}</div>
          <div class="job-company">${j.company} · ${j.location || 'India'}</div>
        </div>
        <div class="match-pill">
          <div class="mp-num" style="color:${scoreColor(j.match_score || 0)}">${j.match_score || '—'}</div>
          <div class="mp-lbl">match</div>
        </div>
      </div>
      <div class="job-meta">
        <span class="badge ${workModeColor(j.work_mode)}">${j.work_mode || 'on-site'}</span>
        <span class="badge ${sourceColor(j.source)}">${j.source || 'job'}</span>
        ${salary ? `<span class="badge badge-gray">${salary}</span>` : ''}
        ${j.posted_at && isToday(j.posted_at) ? `<span class="badge badge-rose">New</span>` : ''}
      </div>
      ${skills.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px">${skills.slice(0,4).map(s => `<span style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:11px;color:var(--muted)">${s}</span>`).join('')}</div>` : ''}
      <div class="job-actions">
        <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center" onclick="trackApply(${j.id},'${esc(j.title)}','${esc(j.company)}','${esc(j.source)}','${esc(j.url)}')">Apply Now</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleSave(${j.id},${j.match_score||0},this)" title="${j.is_saved ? 'Unsave' : 'Save'}" style="font-size:16px">${j.is_saved ? '🔖' : '🤍'}</button>
        ${j.url ? `<button class="btn btn-ghost btn-sm" onclick="window.open('${esc(j.url)}','_blank')" title="Open job page">↗</button>` : ''}
      </div>
    </div>
  `;
}

function esc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 100); }
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}
function portalIcon(source) {
  const map = { linkedin: '💼', naukri: '🔵', indeed: '🟠', glassdoor: '🟣', instahyre: '🔶', angellist: '🟢', adzuna: '🔷', jsearch: '🔷' };
  return map[source?.toLowerCase()] || '💼';
}

async function toggleSave(jobId, matchScore, btn) {
  try {
    const res = await api.saveJob(jobId, matchScore);
    btn.textContent = res.saved ? '🔖' : '🤍';
    const card = document.getElementById(`jc-${jobId}`);
    if (card) card.classList.toggle('is-saved', res.saved);
    showToast(res.saved ? 'Job saved!' : 'Job removed from saved', res.saved ? 'success' : 'info');
  } catch (err) {
    showToast('Failed to save job', 'error');
  }
}

function trackApply(jobId, title, company, portal, url) {
  // Open URL in new tab
  if (url) window.open(url, '_blank');
  // Pre-fill and open application tracker modal
  document.getElementById('app-company').value = company || '';
  document.getElementById('app-role').value = title || '';
  document.getElementById('app-portal').value = portal || '';
  document.getElementById('appModal').style.display = 'flex';
  document.getElementById('appModal').dataset.jobId = jobId;
}

async function loadSavedJobs() {
  const grid = document.getElementById('saved-grid');
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px"><span class="spinner" style="width:28px;height:28px;border-width:3px"></span></div>`;
  try {
    const res = await api.getSavedJobs();
    const jobs = res.jobs || [];
    grid.innerHTML = jobs.length
      ? jobs.map(j => jobCardHTML({ ...j, is_saved: true })).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><div class="ei">🔖</div><h3>No saved jobs yet</h3><p>Browse jobs and tap 🤍 to save them for later</p><button class="btn btn-primary" style="margin-top:16px" onclick="showPage('jobs',document.getElementById('nav-jobs'))">Browse Jobs →</button></div>`;
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">⚠️</div><h3>Failed to load</h3><p>${err.message}</p></div>`;
  }
}

// ════════════════════════════════════════════════════════════
// ALERTS & NOTIFICATIONS
// ════════════════════════════════════════════════════════════
function addAlertKeyword(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const val = e.target.value.trim();
  if (!val || alKeywords.includes(val)) return;
  alKeywords.push(val);
  renderAlertKeywords();
  e.target.value = '';
}

function renderAlertKeywords() {
  document.getElementById('al-keywords-tags').innerHTML = alKeywords.map((k, i) => `
    <div class="form-tag">${k}<span class="rm" onclick="alKeywords.splice(${i},1);renderAlertKeywords()">×</span></div>
  `).join('');
}

async function submitAlert() {
  const name = document.getElementById('al-name').value.trim();
  const location = document.getElementById('al-location').value.trim();
  const salary_min = parseInt(document.getElementById('al-salary').value) || null;
  const notify_email = document.getElementById('al-notify-email').checked;

  if (!name) return showToast('Please enter an alert name', 'error');

  setLoading('create-alert', true);
  try {
    await api.createAlert({ name, keywords: alKeywords, location, salary_min: salary_min ? salary_min * 100000 : null, notify_email });
    closeModal('alertModal');
    alKeywords = [];
    document.getElementById('al-name').value = '';
    document.getElementById('al-location').value = '';
    document.getElementById('al-salary').value = '';
    document.getElementById('al-keywords-tags').innerHTML = '';
    showToast('Alert created!', 'success');
    loadAlertsPage();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('create-alert', false);
  }
}

async function loadAlertsPage() {
  try {
    const [alertsRes, notifsRes] = await Promise.all([api.getAlerts(), api.getNotifications()]);
    AppState.alerts = alertsRes.alerts || [];
    AppState.notifications = notifsRes.notifications || [];

    const unread = notifsRes.unread_count || 0;
    const badge = document.getElementById('notif-unread-badge');
    if (unread > 0) { badge.textContent = `${unread} Unread`; badge.style.display = 'inline-flex'; }
    else badge.style.display = 'none';

    renderAlertsList();
    renderNotificationsList();
  } catch (err) { /* silent */ }
}

function renderAlertsList() {
  const el = document.getElementById('alerts-list');
  if (!AppState.alerts.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 0"><div class="ei">🔔</div><p>No alerts yet. <button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="openModal('alertModal')">+ Create Alert</button></p></div>`;
    return;
  }
  el.innerHTML = AppState.alerts.map(a => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border)">
      <div>
        <p style="font-weight:500;font-size:14px">${a.name}</p>
        <p style="font-size:12px;color:var(--muted)">${a.keywords?.join(', ') || 'All jobs'} ${a.location ? '· ' + a.location : ''}</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="badge ${a.is_active ? 'badge-teal' : 'badge-gray'}">${a.is_active ? '✓ Active' : 'Paused'}</span>
        <button class="btn btn-ghost btn-xs" onclick="toggleAlert(${a.id},${a.is_active})">${a.is_active ? 'Pause' : 'Resume'}</button>
        <button class="btn btn-danger btn-xs" onclick="deleteAlert(${a.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

async function toggleAlert(id, isActive) {
  try {
    await api.updateAlert(id, { is_active: isActive ? 0 : 1 });
    showToast(isActive ? 'Alert paused' : 'Alert resumed', 'info');
    loadAlertsPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteAlert(id) {
  if (!confirm('Delete this alert?')) return;
  try {
    await api.deleteAlert(id);
    showToast('Alert deleted', 'info');
    loadAlertsPage();
  } catch (err) { showToast(err.message, 'error'); }
}

function renderNotificationsList() {
  const el = document.getElementById('notifications-list');
  if (!AppState.notifications.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">🔔</div><h3>All clear!</h3><p>No notifications yet</p></div>`;
    return;
  }
  el.innerHTML = AppState.notifications.map(n => `
    <div class="alert-row" style="${!n.is_read ? 'border-color:rgba(108,99,255,.35);background:rgba(108,99,255,.04)' : ''}">
      <div class="alert-icon-wrap">${notifIcon(n.type)}</div>
      <div class="alert-content" style="flex:1">
        <h4>${n.title}</h4>
        <p>${n.message || ''}</p>
      </div>
      <div class="alert-time">${timeAgo(n.created_at)}</div>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════
async function loadAnalytics() {
  try {
    const [statsRes, appsRes] = await Promise.all([api.getJobStats(), api.getApplications()]);
    const stats = statsRes;
    const apps = appsRes.applications || [];
    const appStats = appsRes.stats || [];

    // Stat cards
    const statMap = {};
    appStats.forEach(s => statMap[s.status] = s.count);
    const totalApps = apps.length;
    const interviews = statMap['interview'] || 0;
    const offers = statMap['offered'] || 0;
    const responseRate = totalApps > 0 ? Math.round(((interviews + offers) / totalApps) * 100) : 0;

    document.getElementById('analytics-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Applications</div><div class="stat-value" style="color:var(--accent2)">${totalApps}</div><div class="stat-delta" style="color:var(--muted)">total tracked</div></div>
      <div class="stat-card"><div class="stat-label">Response Rate</div><div class="stat-value" style="color:var(--teal)">${responseRate}%</div><div class="stat-delta ${responseRate > 30 ? 'delta-up' : ''}">${responseRate > 30 ? '↑ Above average' : 'Keep applying!'}</div></div>
      <div class="stat-card"><div class="stat-label">Interviews</div><div class="stat-value" style="color:var(--amber)">${interviews}</div><div class="stat-delta" style="color:var(--muted)">scheduled</div></div>
      <div class="stat-card"><div class="stat-label">Job Pool</div><div class="stat-value">${stats.total || 0}</div><div class="stat-delta" style="color:var(--muted)">${stats.new_today || 0} new today</div></div>
    `;

    // By portal
    const bySource = stats.by_source || [];
    const maxJobs = Math.max(...bySource.map(s => s.count), 1);
    const sourceColors = { linkedin: 'var(--accent2)', naukri: 'var(--teal)', indeed: 'var(--amber)', glassdoor: 'var(--rose)', adzuna: 'var(--green)', jsearch: 'var(--muted)' };
    document.getElementById('analytics-by-portal').innerHTML = bySource.length
      ? bySource.map(s => `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px"><span style="text-transform:capitalize">${s.source}</span><span style="color:${sourceColors[s.source] || 'var(--text)'}">${s.count} jobs</span></div>
            <div style="height:7px;background:var(--bg3);border-radius:10px;overflow:hidden"><div style="width:${Math.round(s.count / maxJobs * 100)}%;height:100%;background:${sourceColors[s.source] || 'var(--accent2)'};border-radius:10px"></div></div>
          </div>
        `).join('')
      : '<p style="color:var(--muted);font-size:13px">No job data yet. Sync jobs to see analytics.</p>';

    // Salary benchmark
    const u = AppState.user;
    const role = u?.current_role || 'Software Engineer';
    document.getElementById('analytics-salary').innerHTML = `
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">For <strong style="color:var(--text)">${role}</strong> roles in India</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;color:var(--muted)">Entry/Mid</span><span style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px">₹12-20 LPA</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;color:var(--muted)">Senior (your range)</span><span style="font-family:'Syne',sans-serif;font-weight:700;font-size:22px;color:var(--teal)">₹22-35 LPA</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;color:var(--muted)">Lead/Architect</span><span style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px">₹35-55 LPA</span></div>
        <div style="padding:12px;background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.2);border-radius:10px;font-size:13px;color:var(--teal)">💡 Adding cloud certifications (AWS/Azure) can push you to the top 25%</div>
      </div>
    `;

    // App status overview
    const statusLabels = { applied: 'Applied', viewed: 'Viewed', shortlisted: 'Shortlisted', interview: 'Interview', offered: 'Offered', rejected: 'Rejected' };
    const statusC = { applied: 'badge-gray', viewed: 'badge-amber', shortlisted: 'badge-teal', interview: 'badge-purple', offered: 'badge-green', rejected: 'badge-rose' };
    document.getElementById('analytics-app-status').innerHTML = Object.entries(statusLabels).map(([k, l]) => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px 20px;text-align:center;min-width:100px">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:24px;margin-bottom:4px">${statMap[k] || 0}</div>
        <div class="badge ${statusC[k]}" style="font-size:11px">${l}</div>
      </div>
    `).join('');
  } catch (err) { /* silent */ }
}

// ════════════════════════════════════════════════════════════
// NETWORK TIPS
// ════════════════════════════════════════════════════════════
function renderNetworkTips() {
  const tips = [
    { icon: '🎯', title: 'Follow 10 industry leaders per week', detail: 'Follow Oracle, Confluent, major SI accounts (Infosys, TCS Digital). Comment meaningfully on their posts to get visibility with their followers. Target: 5-10 comments/week.', badge: 'High Impact', bclass: 'badge-teal' },
    { icon: '💬', title: 'Join Integration Engineering groups', detail: 'Active participation in "Oracle SOA Suite Users", "Apache Kafka Community", "Java EE/Jakarta EE" LinkedIn groups can connect you with 10,000+ peers and potential referrers.', badge: 'Medium', bclass: 'badge-amber' },
    { icon: '📝', title: 'Publish a technical article monthly', detail: 'Writing about "Comparing Oracle AQ vs Kafka" or "XSLT patterns in Oracle OSB" positions you as a thought leader and attracts inbound recruiter messages. Even 1 article/month makes a big difference.', badge: 'Strategic', bclass: 'badge-purple' },
    { icon: '🤝', title: 'Send 5 personalised connection requests/week', detail: 'Don\'t use the default message. Reference a specific post they shared. A personalized note increases acceptance rate from ~30% to ~80%. Focus on recruiters at target companies.', badge: 'Quick Win', bclass: 'badge-green' },
    { icon: '⭐', title: 'Request 3 recommendations', detail: 'Profiles with 3+ recommendations get 4x more InMail responses. Reach out to past managers or senior colleagues. We can draft the request message for you.', badge: 'High Impact', bclass: 'badge-teal' },
    { icon: '📅', title: 'Post consistently for 30 days', detail: 'Consistent posting about middleware engineering, Kafka patterns, or Oracle SOA tips can grow your followers by 40% and significantly increase recruiter visibility. Share project insights and quick tutorials.', badge: 'Long-term', bclass: 'badge-amber' },
  ];

  const people = [
    { initials: 'RK', name: 'Rahul Kapoor', role: 'Oracle SOA Architect · Infosys', color: 'linear-gradient(135deg,#f59e0b,#d97706)', mutual: 42, isHot: false },
    { initials: 'PS', name: 'Priya Sharma', role: 'Tech Recruiter · TCS Digital · Hires Integration Engineers', color: 'linear-gradient(135deg,#10b981,#059669)', mutual: 0, isHot: true },
    { initials: 'AM', name: 'Arun Mehta', role: 'Kafka SME · Confluent India', color: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', mutual: 28, isHot: false },
    { initials: 'NK', name: 'Neha Kulkarni', role: 'Tech Recruiter · Infosys Digital', color: 'linear-gradient(135deg,#ec4899,#be185d)', mutual: 15, isHot: true },
  ];

  document.getElementById('network-tips-content').innerHTML = `
    <div class="grid-2" style="margin-bottom:24px">
      ${tips.map(t => `
        <div class="suggestion-item" style="flex-direction:column;margin-bottom:0">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;width:100%">
            <div class="sug-icon" style="background:rgba(255,255,255,.05)">${t.icon}</div>
            <h4 style="font-size:14px;font-weight:600;flex:1">${t.title}</h4>
            <span class="badge ${t.bclass}">${t.badge}</span>
          </div>
          <p style="font-size:13px;color:var(--muted);line-height:1.65">${t.detail}</p>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="section-head"><div class="section-title">People You Should Connect With</div><span class="badge badge-purple">AI Suggested</span></div>
      ${people.map(p => `
        <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="width:42px;height:42px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:#fff;flex-shrink:0">${p.initials}</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:500">${p.name}</p>
            <p style="font-size:12px;color:var(--muted)">${p.role}${p.mutual ? ` · ${p.mutual} mutual` : ''}</p>
          </div>
          <button class="btn ${p.isHot ? 'btn-primary' : 'btn-ghost'} btn-sm">${p.isHot ? 'Connect ★' : 'Connect'}</button>
        </div>
      `).join('')}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════
// APPLICATION TRACKER
// ════════════════════════════════════════════════════════════
async function loadTracker() {
  try {
    const res = await api.getApplications();
    const apps = res.applications || [];
    const stats = res.stats || [];
    const statMap = {};
    stats.forEach(s => statMap[s.status] = s.count);

    // Stats row
    document.getElementById('tracker-stats').innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Applied</div><div class="stat-value" style="color:var(--accent2)">${apps.length}</div></div>
      <div class="stat-card"><div class="stat-label">Interviews</div><div class="stat-value" style="color:var(--teal)">${statMap['interview'] || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Offers</div><div class="stat-value" style="color:var(--green)">${statMap['offered'] || 0}</div></div>
      <div class="stat-card"><div class="stat-label">Rejected</div><div class="stat-value" style="color:var(--rose)">${statMap['rejected'] || 0}</div></div>
    `;

    const tbody = document.getElementById('tracker-tbody');
    if (!apps.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No applications tracked yet. Click "+ Add Application" to start.</td></tr>`;
      return;
    }
    tbody.innerHTML = apps.map(a => `
      <tr>
        <td style="font-weight:500">${a.role}</td>
        <td style="color:var(--muted)">${a.company}</td>
        <td><span class="badge ${sourceColor(a.portal?.toLowerCase())}">${a.portal || '—'}</span></td>
        <td style="color:var(--muted)">${a.applied_date ? new Date(a.applied_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</td>
        <td>
          <select class="form-select" style="padding:4px 8px;font-size:12px;width:auto" onchange="updateAppStatus(${a.id},this.value)">
            ${['applied','viewed','shortlisted','interview','offered','rejected'].map(s => `<option value="${s}" ${a.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </td>
        <td><button class="btn btn-danger btn-xs" onclick="deleteApp(${a.id})">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) { /* silent */ }
}

async function submitApplication() {
  const company = document.getElementById('app-company').value.trim();
  const role = document.getElementById('app-role').value.trim();
  const portal = document.getElementById('app-portal').value;
  const status = document.getElementById('app-status').value;
  const notes = document.getElementById('app-notes').value.trim();
  const jobId = document.getElementById('appModal').dataset.jobId;

  if (!company || !role) return showToast('Company and role are required', 'error');

  setLoading('add-app', true);
  try {
    await api.addApplication({ company, role, portal, status, notes, job_id: jobId ? parseInt(jobId) : null });
    closeModal('appModal');
    document.getElementById('app-company').value = '';
    document.getElementById('app-role').value = '';
    document.getElementById('app-notes').value = '';
    delete document.getElementById('appModal').dataset.jobId;
    showToast('Application tracked!', 'success');
    if (AppState.currentPage === 'tracker') loadTracker();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('add-app', false);
  }
}

async function updateAppStatus(id, status) {
  try {
    await api.updateApplication(id, { status });
    showToast('Status updated', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteApp(id) {
  if (!confirm('Remove this application?')) return;
  try {
    await api.deleteApplication(id);
    showToast('Removed', 'info');
    loadTracker();
  } catch (err) { showToast(err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// PORTALS
// ════════════════════════════════════════════════════════════
async function loadPortals() {
  const u = AppState.user;
  if (u) {
    document.getElementById('portal-email-key').textContent = u.email || 'email';
    document.getElementById('portal-phone-key').textContent = u.mobile || 'mobile';
  }

  try {
    const res = await api.getPortals();
    AppState.portals = res.portals || [];
    renderPortalsGrid();
  } catch (err) { /* silent */ }
}

function renderPortalsGrid() {
  document.getElementById('portals-grid').innerHTML = AppState.portals.map(p => `
    <div class="card" style="${p.is_connected ? 'border-color:rgba(45,212,191,.3)' : ''}">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="width:48px;height:48px;border-radius:12px;background:${p.color}22;display:flex;align-items:center;justify-content:center;font-size:24px">${p.icon}</div>
        <div style="flex:1">
          <p style="font-weight:600;font-size:15px">${p.name}</p>
          <p style="font-size:12px;color:var(--muted)">${p.is_connected ? (p.jobs_fetched ? `${p.jobs_fetched} jobs synced` : 'Connected') : p.description}</p>
        </div>
        <span class="badge ${p.is_connected ? 'badge-teal' : 'badge-gray'}">${p.is_connected ? '✓ Live' : 'Off'}</span>
      </div>
      <button class="btn ${p.is_connected ? 'btn-ghost' : 'btn-primary'} btn-sm" style="width:100%;justify-content:center" onclick="togglePortal('${p.slug}',${p.is_connected})">
        ${p.is_connected ? 'Disconnect' : '+ Connect'}
      </button>
      ${p.is_connected && p.last_synced ? `<p style="font-size:11px;color:var(--muted2);text-align:center;margin-top:8px">Last synced ${timeAgo(p.last_synced)}</p>` : ''}
    </div>
  `).join('');
}

async function togglePortal(slug, isConnected) {
  try {
    if (isConnected) {
      await api.disconnectPortal(slug);
      showToast('Portal disconnected', 'info');
    } else {
      await api.connectPortal(slug);
      showToast('Portal connected! Jobs will sync shortly.', 'success');
    }
    loadPortals();
  } catch (err) { showToast(err.message, 'error'); }
}

// ════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════
async function loadSettings() {
  try {
    const res = await api.getProfile();
    const u = res.user;
    document.getElementById('st-name').value = u.name || '';
    document.getElementById('st-email').value = u.email || '';
    document.getElementById('st-mobile').value = u.mobile || '';
    document.getElementById('st-location').value = u.location || '';
    document.getElementById('st-linkedin').value = u.linkedin_url || '';
    document.getElementById('st-role').value = u.current_role || '';
    document.getElementById('st-exp').value = u.years_exp || '';
    stSkills = Array.isArray(u.skills) ? [...u.skills] : JSON.parse(u.skills || '[]');
    renderSkillTags('st-skills-tags', stSkills);
  } catch (err) { /* silent */ }
}

function addSettingSkill(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const val = e.target.value.trim();
  if (!val || stSkills.includes(val)) return;
  stSkills.push(val);
  renderSkillTags('st-skills-tags', stSkills);
  e.target.value = '';
}

async function saveSettings() {
  const data = {
    name: document.getElementById('st-name').value.trim(),
    mobile: document.getElementById('st-mobile').value.trim(),
    location: document.getElementById('st-location').value.trim(),
    linkedin_url: document.getElementById('st-linkedin').value.trim(),
    current_role: document.getElementById('st-role').value.trim(),
    years_exp: parseInt(document.getElementById('st-exp').value) || 0,
    skills: stSkills,
  };

  setLoading('save-settings', true);
  try {
    const res = await api.updateProfile(data);
    AppState.user = res.user;
    updateSidebar();
    showToast('Profile saved!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading('save-settings', false);
  }
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════
function animateRing(ringId, score) {
  const circumference = 289;
  const offset = circumference - (score / 100) * circumference;
  const ring = document.getElementById(ringId);
  if (ring) {
    ring.style.transition = 'stroke-dashoffset 1.2s ease';
    ring.style.strokeDashoffset = offset;
  }
}
