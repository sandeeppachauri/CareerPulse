// frontend/src/state.js — Application state management
window.AppState = {
  user: null,
  jobs: [],
  savedJobs: [],
  alerts: [],
  notifications: [],
  applications: [],
  portals: [],
  analysis: null,
  jobStats: {},
  currentPage: 'dashboard',
  jobFilters: { search: '', tag: 'all', view: 'all', source: '' },
  loading: {},
  toast: null,
};

// ── Toast notifications ────────────────────────────────────────────────────
window.showToast = function(message, type = 'success', duration = 3500) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = {
    success: 'rgba(74,222,128,0.15)',
    error: 'rgba(251,113,133,0.15)',
    info: 'rgba(108,99,255,0.15)',
    warning: 'rgba(251,191,36,0.15)'
  };
  const borders = {
    success: 'rgba(74,222,128,0.4)',
    error: 'rgba(251,113,133,0.4)',
    info: 'rgba(108,99,255,0.4)',
    warning: 'rgba(251,191,36,0.4)'
  };

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${colors[type]};border:1px solid ${borders[type]};
    backdrop-filter:blur(20px);border-radius:12px;
    padding:14px 20px;display:flex;align-items:center;gap:10px;
    font-family:'DM Sans',sans-serif;font-size:14px;color:#f0f0f8;
    max-width:360px;animation:slideUp 0.3s ease;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
  `;
  toast.innerHTML = `<span style="font-size:18px">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
};

// ── Loading states ─────────────────────────────────────────────────────────
window.setLoading = function(key, state) {
  AppState.loading[key] = state;
  const btn = document.getElementById(`btn-${key}`);
  if (btn) {
    btn.disabled = state;
    btn.style.opacity = state ? '0.6' : '1';
  }
};

// ── Format helpers ──────────────────────────────────────────────────────────
window.formatSalary = function(min, max, currency = 'INR') {
  if (!min && !max) return null;
  const toL = n => Math.round(n / 100000);
  if (min && max) return `₹${toL(min)}-${toL(max)} LPA`;
  if (min) return `₹${toL(min)}+ LPA`;
  if (max) return `Up to ₹${toL(max)} LPA`;
};

window.timeAgo = function(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

window.workModeColor = function(mode) {
  const map = { remote: 'badge-green', hybrid: 'badge-teal', 'on-site': 'badge-gray', onsite: 'badge-gray' };
  return map[mode?.toLowerCase()] || 'badge-gray';
};

window.sourceColor = function(src) {
  const map = { linkedin: 'badge-purple', naukri: 'badge-teal', indeed: 'badge-amber', glassdoor: 'badge-rose', adzuna: 'badge-gray', jsearch: 'badge-gray' };
  return map[src?.toLowerCase()] || 'badge-gray';
};

window.statusColor = function(status) {
  const map = { applied: 'badge-gray', viewed: 'badge-amber', shortlisted: 'badge-green', interview: 'badge-teal', offered: 'badge-purple', rejected: 'badge-rose' };
  return map[status?.toLowerCase()] || 'badge-gray';
};

// ── Score color ──────────────────────────────────────────────────────────
window.scoreColor = function(score) {
  if (score >= 85) return 'var(--green)';
  if (score >= 70) return 'var(--teal)';
  if (score >= 55) return 'var(--accent2)';
  if (score >= 40) return 'var(--amber)';
  return 'var(--rose)';
};

// ── Debounce ──────────────────────────────────────────────────────────────
window.debounce = function(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};
