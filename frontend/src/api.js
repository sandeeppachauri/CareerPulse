// frontend/src/api.js — Unified API client for CareerPulse
const BASE_URL = window.CAREERPULSE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  getToken() {
    return localStorage.getItem('cp_token');
  }

  setToken(token) {
    localStorage.setItem('cp_token', token);
  }

  clearToken() {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('cp_user') || 'null');
    } catch { return null; }
  }

  setUser(user) {
    localStorage.setItem('cp_user', JSON.stringify(user));
  }

  async request(method, path, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please check your connection.');
      }
      throw err;
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  async register(data) {
    const res = await this.request('POST', '/auth/register', data, false);
    if (res.token) { this.setToken(res.token); this.setUser(res.user); }
    return res;
  }

  async login(identifier, password) {
    const res = await this.request('POST', '/auth/login', { identifier, password }, false);
    if (res.token) { this.setToken(res.token); this.setUser(res.user); }
    return res;
  }

  async verifyOtp(email, otp) {
    return this.request('POST', '/auth/verify-otp', { email, otp }, false);
  }

  async resendOtp(email) {
    return this.request('POST', '/auth/resend-otp', { email }, false);
  }

  async getMe() {
    const res = await this.request('GET', '/auth/me');
    if (res.user) this.setUser(res.user);
    return res;
  }

  logout() {
    this.clearToken();
    window.location.reload();
  }

  // ── Profile ───────────────────────────────────────────────────────────
  async getProfile() {
    return this.request('GET', '/profile');
  }

  async updateProfile(data) {
    const res = await this.request('PUT', '/profile', data);
    if (res.user) this.setUser(res.user);
    return res;
  }

  async analyzeProfile() {
    return this.request('POST', '/profile/analyze');
  }

  async getScoreHistory() {
    return this.request('GET', '/profile/score-history');
  }

  // ── Jobs ──────────────────────────────────────────────────────────────
  async getJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/jobs${qs ? '?' + qs : ''}`);
  }

  async getJobStats() {
    return this.request('GET', '/jobs/stats');
  }

  async saveJob(jobId, matchScore) {
    return this.request('POST', `/jobs/${jobId}/save`, { match_score: matchScore });
  }

  async getSavedJobs() {
    return this.request('GET', '/jobs/saved');
  }

  async syncJobs() {
    return this.request('POST', '/jobs/sync');
  }

  // ── Alerts ────────────────────────────────────────────────────────────
  async getAlerts() {
    return this.request('GET', '/alerts');
  }

  async createAlert(data) {
    return this.request('POST', '/alerts', data);
  }

  async updateAlert(id, data) {
    return this.request('PUT', `/alerts/${id}`, data);
  }

  async deleteAlert(id) {
    return this.request('DELETE', `/alerts/${id}`);
  }

  async getNotifications(unreadOnly = false) {
    return this.request('GET', `/alerts/notifications${unreadOnly ? '?unread_only=true' : ''}`);
  }

  async markAllRead() {
    return this.request('POST', '/alerts/notifications/read-all');
  }

  // ── Applications ──────────────────────────────────────────────────────
  async getApplications() {
    return this.request('GET', '/applications');
  }

  async addApplication(data) {
    return this.request('POST', '/applications', data);
  }

  async updateApplication(id, data) {
    return this.request('PUT', `/applications/${id}`, data);
  }

  async deleteApplication(id) {
    return this.request('DELETE', `/applications/${id}`);
  }

  // ── Portals ───────────────────────────────────────────────────────────
  async getPortals() {
    return this.request('GET', '/portals');
  }

  async connectPortal(slug) {
    return this.request('POST', `/portals/${slug}/connect`);
  }

  async disconnectPortal(slug) {
    return this.request('POST', `/portals/${slug}/disconnect`);
  }
}

window.api = new ApiClient();
