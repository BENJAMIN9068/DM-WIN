/**
 * FORNTMAN-OG Enterprise Admin Console
 * Accessible exclusively at: http://localhost:3000/#/FORNTMAN-OG
 */

// ── Icons (Clean enterprise inline SVG helper) ──────────────────────────────
const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
  games: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 18 3 21 17 3 17 6 3"></polygon><line x1="10" y1="9" x2="14" y2="9"></line><line x1="12" y1="7" x2="12" y2="11"></line><circle cx="17" cy="13" r="1"></circle><circle cx="7" cy="13" r="1"></circle></svg>`,
  hackBots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path><circle cx="12" cy="12" r="4"></circle></svg>`,
  recharge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
  withdrawals: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
  ban: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  gateway: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
};

class AdminConsoleApp {
  constructor() {
    this.token = localStorage.getItem('forntman_admin_token') || 'admin_token_default_active_session';
    this.activeTab = 'dashboard';
    this.dateRange = '7d';
    this.pollingTimer = null;
    this.charts = {};
    this.state = {
      dashboard: null,
      games: [],
      hackBotsUnified: {},
      hackBotsUserSpecific: [],
      recharges: { summary: {}, requests: [] },
      withdrawals: [],
      users: { users: [], total: 0, page: 1, totalPages: 1 },
      auditLogs: []
    };
    this.userSearch = '';
    this.userPage = 1;
    this.withdrawalFilter = 'ALL';
    this.rechargeFilter = 'ALL';
  }

  // ── Network API Helper ───────────────────────────────────────────────────
  async api(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'x-admin-token': this.token
    };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(endpoint, options);
      const data = await res.json();
      if (res.status === 401) {
        this.token = null;
        localStorage.removeItem('forntman_admin_token');
        this.renderLoginScreen();
        throw new Error('Authentication required');
      }
      return data;
    } catch (e) {
      console.error(`API Error on ${endpoint}:`, e);
      throw e;
    }
  }

  // ── Toast Notifications ──────────────────────────────────────────────────
  toast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${type === 'success' ? ICONS.check : type === 'error' ? ICONS.alert : ICONS.dashboard}</span><span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
      setTimeout(() => t.remove(), 300);
    }, 3500);
  }

  // ── Confirmation Modal ───────────────────────────────────────────────────
  confirmAction({ title, message, confirmText = 'Confirm', confirmType = 'primary', onConfirm }) {
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">${ICONS.alert} ${title}</div>
          <button class="modal-close" id="modal-close-btn">${ICONS.x}</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
          <button class="btn btn-${confirmType}" id="modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    const close = () => modalEl.remove();
    modalEl.querySelector('#modal-close-btn').onclick = close;
    modalEl.querySelector('#modal-cancel-btn').onclick = close;
    modalEl.querySelector('#modal-confirm-btn').onclick = async () => {
      close();
      if (onConfirm) await onConfirm();
    };
  }

  // ── Initialize App ───────────────────────────────────────────────────────
  async init() {
    this.parseSubRoute();
    window.addEventListener('hashchange', () => this.handleHashChange());

    // Verify token
    try {
      const auth = await this.api('/api/admin/me');
      if (!auth || !auth.result) {
        this.renderLoginScreen();
        return;
      }
    } catch (e) {
      this.renderLoginScreen();
      return;
    }

    this.renderLayout();
    await this.loadActiveTabData();
    this.startPolling();
  }

  parseSubRoute() {
    const hash = window.location.hash; // e.g. #/FORNTMAN-OG or #/FORNTMAN-OG/games
    const parts = hash.split('/');
    if (parts.length > 2 && parts[2]) {
      this.activeTab = parts[2].toLowerCase();
    } else {
      this.activeTab = 'dashboard';
    }
  }

  handleHashChange() {
    if (!window.location.hash.startsWith('#/FORNTMAN-OG')) {
      window.location.reload();
      return;
    }
    this.parseSubRoute();
    this.updateActiveNav();
    this.loadActiveTabData();
  }

  setTab(tab) {
    this.activeTab = tab;
    window.location.hash = `#/FORNTMAN-OG/${tab}`;
  }

  startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(async () => {
      // Smart background refresh without full DOM disruption
      if (this.activeTab === 'dashboard') {
        const res = await this.api(`/api/admin/dashboard?range=${this.dateRange}`);
        if (res.result) {
          this.state.dashboard = res.data;
          this.updateDashboardKPIs();
        }
      } else if (this.activeTab === 'hack-bots') {
        const res = await this.api('/api/admin/hack-bots/unified');
        if (res.result) {
          this.state.hackBotsUnified = res.data;
          this.updateHackBotCountdowns();
        }
      }
    }, 3000);
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  renderLoginScreen() {
    const root = document.getElementById('admin-root') || document.body;
    root.innerHTML = `
      <div class="admin-login-screen">
        <div class="login-card">
          <div class="login-brand">
            <div class="login-brand-icon">F</div>
            <div class="login-brand-title">FORNTMAN-OG</div>
            <div class="login-brand-desc">Enterprise Administration Console</div>
          </div>
          <div id="login-error-container"></div>
          <form id="admin-login-form">
            <div class="form-field">
              <label class="form-label">Admin Username</label>
              <input type="text" id="admin-user-input" class="input-control" style="width:100%;" value="admin" required autofocus />
            </div>
            <div class="form-field">
              <label class="form-label">Security Key / Password</label>
              <input type="password" id="admin-pass-input" class="input-control" style="width:100%;" value="admin@FORNTMAN2026!" required />
            </div>
            <button type="submit" class="btn btn-primary login-btn">
              ${ICONS.lock} Authenticate Session
            </button>
          </form>
          <div style="margin-top: 20px; font-size: 11px; text-align: center; color: var(--text-muted);">
            Route: <code style="color: #a5b4fc;">/#/FORNTMAN-OG</code> (Strict hash protected)
          </div>
        </div>
      </div>
    `;

    document.getElementById('admin-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const u = document.getElementById('admin-user-input').value.trim();
      const p = document.getElementById('admin-pass-input').value;
      const errBox = document.getElementById('login-error-container');
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (data.result && data.data?.token) {
          this.token = data.data.token;
          localStorage.setItem('forntman_admin_token', this.token);
          this.toast('Session authenticated successfully');
          this.renderLayout();
          await this.loadActiveTabData();
          this.startPolling();
        } else {
          errBox.innerHTML = `<div class="login-alert">${data.msg || 'Invalid administrator credentials'}</div>`;
        }
      } catch (err) {
        errBox.innerHTML = `<div class="login-alert">Server connection error. Ensure local server is running.</div>`;
      }
    };
  }

  // ── Main Layout ──────────────────────────────────────────────────────────
  renderLayout() {
    const root = document.getElementById('admin-root') || document.body;
    root.innerHTML = `
      <div class="admin-sidebar">
        <div class="sidebar-header">
          <div class="brand-badge">OG</div>
          <div>
            <div class="brand-title">FORNTMAN-OG</div>
            <div class="brand-subtitle">Enterprise Console</div>
          </div>
        </div>

        <div class="sidebar-nav">
          <div class="nav-section-title">Core Overview</div>
          <div class="nav-item ${this.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
            ${ICONS.dashboard} <span>Main Dashboard</span>
          </div>

          <div class="nav-section-title">Operations</div>
          <div class="nav-item ${this.activeTab === 'games' ? 'active' : ''}" data-tab="games">
            ${ICONS.games} <span>Games</span>
          </div>
          <div class="nav-item ${this.activeTab === 'hack-bots' ? 'active' : ''}" data-tab="hack-bots">
            ${ICONS.hackBots} <span>Hack Bots</span>
            <span class="nav-badge">Sync</span>
          </div>
          <div class="nav-item ${this.activeTab === 'gateways' ? 'active' : ''}" data-tab="gateways">
            ${ICONS.gateway} <span>Gateways</span>
          </div>
          <div class="nav-item ${this.activeTab === 'recharge' ? 'active' : ''}" data-tab="recharge">
            ${ICONS.recharge} <span>Recharge</span>
            <span class="nav-badge" id="sidebar-pending-rec-count">0</span>
          </div>
          <div class="nav-item ${this.activeTab === 'withdrawals' ? 'active' : ''}" data-tab="withdrawals">
            ${ICONS.withdrawals} <span>Withdrawals</span>
          </div>
          <div class="nav-item ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users">
            ${ICONS.users} <span>Users</span>
          </div>

          <div class="nav-section-title">System & Security</div>
          <div class="nav-item ${this.activeTab === 'audit' ? 'active' : ''}" data-tab="audit">
            ${ICONS.audit} <span>Audit Logs</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="admin-profile-card">
            <div class="admin-avatar">AD</div>
            <div class="admin-info">
              <div class="admin-name">Super Admin</div>
              <div class="admin-role">System Auditor</div>
            </div>
            <button class="btn btn-icon btn-sm" id="admin-logout-btn" title="Sign Out">
              ${ICONS.logout}
            </button>
          </div>
        </div>
      </div>

      <div class="admin-main">
        <header class="admin-header">
          <div class="header-left">
            <div class="page-title" id="admin-header-title">
              Main Dashboard
            </div>
            <span class="route-pill">#/FORNTMAN-OG</span>
          </div>
          <div class="header-right">
            <div class="system-status-indicator">
              <span class="pulse-dot"></span>
              <span>Live Engine Synced</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-manual-refresh">
              ${ICONS.refresh} Refresh
            </button>
          </div>
        </header>

        <main class="admin-content" id="admin-content-pane">
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            Loading Enterprise Control Center...
          </div>
        </main>
      </div>
    `;

    // Sidebar Tab Event Delegation
    document.querySelectorAll('.admin-sidebar .nav-item').forEach(el => {
      el.onclick = () => {
        const tab = el.dataset.tab;
        if (tab) this.setTab(tab);
      };
    });

    document.getElementById('admin-logout-btn').onclick = () => {
      this.confirmAction({
        title: 'Sign Out Administrator',
        message: 'Are you sure you want to end your secure administrator session?',
        confirmText: 'Sign Out',
        confirmType: 'danger',
        onConfirm: () => {
          this.token = null;
          localStorage.removeItem('forntman_admin_token');
          this.renderLoginScreen();
        }
      });
    };

    document.getElementById('btn-manual-refresh').onclick = () => {
      this.loadActiveTabData(true);
      this.toast('Data re-synchronized from backend');
    };
  }

  updateActiveNav() {
    document.querySelectorAll('.admin-sidebar .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === this.activeTab);
    });
    const titleEl = document.getElementById('admin-header-title');
    if (titleEl) {
      const titles = {
        'dashboard': 'Main Dashboard',
        'games': 'Games Management',
        'hack-bots': 'Hack Bots Control Hub',
        'gateways': 'Payment Gateway Configuration',
        'recharge': 'Recharge & Deposit Verifications',
        'withdrawals': 'Withdrawal Orders Management',
        'users': 'User Management & Balance Controls',
        'audit': 'Enterprise Audit Logs'
      };
      titleEl.innerHTML = titles[this.activeTab] || 'Main Dashboard';
    }
  }

  // ── Load Active Tab Data ─────────────────────────────────────────────────
  async loadActiveTabData(isManual = false) {
    const pane = document.getElementById('admin-content-pane');
    if (!pane) return;

    this.updateActiveNav();

    try {
      if (this.activeTab === 'dashboard') {
        const res = await this.api(`/api/admin/dashboard?range=${this.dateRange}`);
        this.state.dashboard = res.data;
        this.renderDashboard();
      } else if (this.activeTab === 'games') {
        const res = await this.api('/api/admin/games');
        this.state.games = res.data;
        this.renderGames();
      } else if (this.activeTab === 'hack-bots') {
        const [uniRes, usrRes] = await Promise.all([
          this.api('/api/admin/hack-bots/unified'),
          this.api('/api/admin/hack-bots/user-specific')
        ]);
        this.state.hackBotsUnified = uniRes.data || {};
        this.state.hackBotsUserSpecific = usrRes.data || [];
        this.renderHackBots();
      } else if (this.activeTab === 'gateways') {
        const res = await this.api('/api/admin/gateways');
        this.state.gateways = res.data || [];
        this.renderGateways();
      } else if (this.activeTab === 'recharge') {
        const res = await this.api('/api/admin/recharges');
        this.state.recharges = res.data;
        // Update sidebar pending badge
        const pendingCount = (res.data.requests || []).filter(r => r.status === 'Pending').length;
        const badgeEl = document.getElementById('sidebar-pending-rec-count');
        if (badgeEl) badgeEl.textContent = pendingCount;
        this.renderRecharge();
      } else if (this.activeTab === 'withdrawals') {
        const res = await this.api(`/api/admin/withdrawals?status=${this.withdrawalFilter}`);
        this.state.withdrawals = res.data || [];
        this.renderWithdrawals();
      } else if (this.activeTab === 'users') {
        const res = await this.api(`/api/admin/users?search=${encodeURIComponent(this.userSearch)}&page=${this.userPage}&pageSize=15`);
        this.state.users = res.data;
        this.renderUsers();
      } else if (this.activeTab === 'audit') {
        const res = await this.api('/api/admin/audit-logs');
        this.state.auditLogs = res.data || [];
        this.renderAuditLogs();
      }
    } catch (e) {
      pane.innerHTML = `
        <div style="background-color: var(--accent-rose-bg); border: 1px solid rgba(244,63,94,0.3); padding: 20px; border-radius: var(--radius-md); color: #fca5a5;">
          <strong>Error loading section:</strong> ${e.message}
          <div style="margin-top: 10px;">
            <button class="btn btn-secondary btn-sm" onclick="window.__adminApp.loadActiveTabData()">Retry</button>
          </div>
        </div>
      `;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: MAIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  renderDashboard() {
    const pane = document.getElementById('admin-content-pane');
    const { kpi, charts } = this.state.dashboard;

    pane.innerHTML = `
      <div class="filter-bar">
        <div class="filter-group">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Timeline:</span>
          <div class="segmented-control">
            <button class="segment-btn ${this.dateRange === 'today' ? 'active' : ''}" data-range="today">Today</button>
            <button class="segment-btn ${this.dateRange === '7d' ? 'active' : ''}" data-range="7d">Last 7 Days</button>
            <button class="segment-btn ${this.dateRange === '30d' ? 'active' : ''}" data-range="30d">Last 30 Days</button>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Live backend telemetry • Auto-syncing every 3s
        </div>
      </div>

      <!-- Top KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Total Users</span>
            <div class="kpi-icon-wrap kpi-icon-indigo">${ICONS.users}</div>
          </div>
          <div class="kpi-value" id="kpi-total-users">${kpi.totalUsers}</div>
          <div class="kpi-meta">
            <span>Registered member accounts</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Online Users</span>
            <div class="kpi-icon-wrap kpi-icon-emerald">
              <span class="pulse-dot"></span>
            </div>
          </div>
          <div class="kpi-value" id="kpi-online-users" style="color: #34d399;">${kpi.onlineUsers}</div>
          <div class="kpi-meta">
            <span>Currently active on games/site</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Successful Deposits</span>
            <div class="kpi-icon-wrap kpi-icon-amber">${ICONS.recharge}</div>
          </div>
          <div class="kpi-value" id="kpi-deposits" style="color: #fbbf24;">₹${kpi.successfulDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div class="kpi-meta">
            <span>All accepted recharge orders</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Successful Withdrawals</span>
            <div class="kpi-icon-wrap kpi-icon-rose">${ICONS.withdrawals}</div>
          </div>
          <div class="kpi-value" id="kpi-withdrawals" style="color: #fb7185;">₹${kpi.successfulWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div class="kpi-meta">
            <span>Processed payout total</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Chart 1: Sales / Deposit Graph -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Sales / Deposit Graph</div>
              <div class="card-subtitle">Volume trend of successful deposits over time</div>
            </div>
            <span class="badge badge-success">Live Trend</span>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-sales"></canvas>
            </div>
          </div>
        </div>

        <!-- Chart 2: User Growth Graph -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">User Growth Graph</div>
              <div class="card-subtitle">Tracking net user onboarding and account expansion</div>
            </div>
            <span class="badge badge-info">Real-time</span>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-user-growth"></canvas>
            </div>
          </div>
        </div>

        <!-- Chart 3: Peak Activity Chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Weekly Activity Distribution</div>
              <div class="card-subtitle">Real transaction volume across days of the week</div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-peak-activity"></canvas>
            </div>
          </div>
        </div>

        <!-- Chart 4: Peak Recharge Chart -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Recharge by Payment Gateway</div>
              <div class="card-subtitle">Real approved deposit volumes across active gateways</div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-wrapper">
              <canvas id="chart-peak-recharge"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Filter bar click handling
    pane.querySelectorAll('.segmented-control button').forEach(b => {
      b.onclick = () => {
        this.dateRange = b.dataset.range;
        this.loadActiveTabData();
      };
    });

    this.initDashboardCharts(charts);
  }

  updateDashboardKPIs() {
    const kpi = this.state.dashboard?.kpi;
    if (!kpi) return;
    const uEl = document.getElementById('kpi-total-users');
    const oEl = document.getElementById('kpi-online-users');
    const dEl = document.getElementById('kpi-deposits');
    const wEl = document.getElementById('kpi-withdrawals');
    if (uEl) uEl.textContent = kpi.totalUsers;
    if (oEl) oEl.textContent = kpi.onlineUsers;
    if (dEl) dEl.textContent = `₹${kpi.successfulDeposits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    if (wEl) wEl.textContent = `₹${kpi.successfulWithdrawals.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  initDashboardCharts(charts) {
    if (typeof Chart === 'undefined') return;

    // Destroy existing chart instances
    Object.values(this.charts).forEach(c => c && c.destroy());
    this.charts = {};

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
    Chart.defaults.font.family = 'Inter, sans-serif';

    // Chart 1: Sales / Deposit Graph
    const ctx1 = document.getElementById('chart-sales')?.getContext('2d');
    if (ctx1) {
      const grad1 = ctx1.createLinearGradient(0, 0, 0, 260);
      grad1.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      grad1.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

      this.charts.sales = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: charts.salesGraph.labels,
          datasets: [{
            label: 'Deposits (₹)',
            data: charts.salesGraph.data,
            borderColor: '#6366f1',
            borderWidth: 2.5,
            fill: true,
            backgroundColor: grad1,
            tension: 0.35,
            pointBackgroundColor: '#6366f1',
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            y: {
              ticks: { callback: v => `₹${v.toLocaleString('en-IN')}` }
            }
          }
        }
      });
    }

    // Chart 2: User Growth Graph
    const ctx2 = document.getElementById('chart-user-growth')?.getContext('2d');
    if (ctx2) {
      const grad2 = ctx2.createLinearGradient(0, 0, 0, 260);
      grad2.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      grad2.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      this.charts.userGrowth = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: charts.userGrowthGraph.labels,
          datasets: [{
            label: 'Total Users',
            data: charts.userGrowthGraph.data,
            borderColor: '#10b981',
            borderWidth: 2.5,
            fill: true,
            backgroundColor: grad2,
            tension: 0.35,
            pointBackgroundColor: '#10b981',
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // Chart 3: Peak Activity Chart
    const ctx3 = document.getElementById('chart-peak-activity')?.getContext('2d');
    if (ctx3) {
      this.charts.activity = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: charts.peakActivity.map(p => p.day),
          datasets: [{
            label: 'Transactions Count',
            data: charts.peakActivity.map(p => p.activeScore),
            backgroundColor: '#0ea5e9',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // Chart 4: Peak Recharge Chart
    const ctx4 = document.getElementById('chart-peak-recharge')?.getContext('2d');
    if (ctx4) {
      this.charts.recharge = new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: charts.peakRecharges.map(p => p.slot),
          datasets: [{
            label: 'Total Recharge Amount (₹)',
            data: charts.peakRecharges.map(p => p.totalAmount),
            backgroundColor: '#f59e0b',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              ticks: { callback: v => `₹${v.toLocaleString('en-IN')}` }
            }
          }
        }
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: GAMES MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════
  renderGames() {
    const pane = document.getElementById('admin-content-pane');
    const games = this.state.games || [];

    const activeCount = games.filter(g => g.status === 'Active').length;
    const hiddenCount = games.filter(g => g.status === 'Hidden').length;

    pane.innerHTML = `
      <div class="filter-bar">
        <div style="display: flex; gap: 14px; align-items: center;">
          <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">Total Games (${games.length})</span>
          <span class="badge badge-success">${activeCount} Active</span>
          <span class="badge badge-warning">${hiddenCount} Hidden</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Changes save instantly to live backend and reflect across player devices
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Game Name</th>
              <th>ID / Internal Code</th>
              <th>Category</th>
              <th>Status</th>
              <th>Win Rate Setting</th>
              <th>Diagnostics</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${games.map(g => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${g.icon || '/assets/png/tower_dash.png'}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover; background:#1e293b;" onerror="this.src='/icon-192x192.png'" />
                    <div>
                      <div style="font-weight: 700; color: var(--text-primary);">${g.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${g.type === 'unified' ? 'Unified Live Server' : 'User-Specific Engine'}</div>
                    </div>
                  </div>
                </td>
                <td><code class="route-pill">${g.gameCode}</code></td>
                <td><span class="badge badge-neutral">${g.category}</span></td>
                <td>
                  <span class="badge ${g.status === 'Active' ? 'badge-success' : 'badge-warning'}">
                    <span class="badge-dot"></span> ${g.status}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; color: #818cf8;">${g.winRate}%</span>
                    <span class="badge badge-neutral" style="font-size: 10px; text-transform: uppercase;">${g.winRateMode || 'default'}</span>
                  </div>
                </td>
                <td>
                  <span class="badge ${g.lastTestStatus === 'PASSED' ? 'badge-success' : 'badge-neutral'}">
                    ${g.lastTestStatus || 'Untested'}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm btn-api-test" data-code="${g.gameCode}">
                      ${ICONS.play} API Run Test
                    </button>
                    <button class="btn btn-secondary btn-sm btn-win-rate" data-code="${g.gameCode}">
                      ${ICONS.edit} Win Rate
                    </button>
                    <button class="btn ${g.status === 'Active' ? 'btn-danger' : 'btn-success'} btn-sm btn-toggle-status" data-code="${g.gameCode}" data-status="${g.status}">
                      ${g.status === 'Active' ? ICONS.eyeOff + ' Hide' : ICONS.eye + ' Unhide'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // API Run Test Handlers
    pane.querySelectorAll('.btn-api-test').forEach(btn => {
      btn.onclick = () => this.executeGameApiTest(btn.dataset.code);
    });

    // Toggle Hide / Unhide Handlers
    pane.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.code;
        const current = btn.dataset.status;
        const target = current === 'Active' ? 'Hidden' : 'Active';
        this.confirmAction({
          title: `${target === 'Hidden' ? 'Hide' : 'Unhide'} Game (${code})`,
          message: target === 'Hidden' 
            ? `When hidden, normal users will NOT be able to view, play, or access this game. Only administrators can still access it. Continue?`
            : `Unhiding this game will restore public player visibility immediately. Continue?`,
          confirmText: `${target} Game`,
          confirmType: target === 'Hidden' ? 'danger' : 'success',
          onConfirm: async () => {
            const res = await this.api('/api/admin/games/status', 'POST', { gameCode: code, status: target });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            }
          }
        });
      };
    });

    // Win Rate Control Handlers
    pane.querySelectorAll('.btn-win-rate').forEach(btn => {
      btn.onclick = () => this.openWinRateModal(btn.dataset.code);
    });
  }

  // ── Execute API Run Test ──────────────────────────────────────────────────
  async executeGameApiTest(gameCode) {
    const game = this.state.games.find(g => g.gameCode === gameCode);
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <div class="modal-title">${ICONS.play} API Run Test: ${game?.name || gameCode}</div>
          <button class="modal-close" id="test-modal-close">${ICONS.x}</button>
        </div>
        <div class="modal-body">
          <div id="test-exec-status" style="margin-bottom: 16px; padding: 12px; border-radius: var(--radius-sm); background: var(--bg-secondary); border: 1px solid var(--border-color); font-size: 13px;">
            Initializing end-to-end sandbox verification...
          </div>
          <div id="test-steps-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="test-modal-done" disabled>Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
    modalEl.querySelector('#test-modal-close').onclick = () => modalEl.remove();
    const doneBtn = modalEl.querySelector('#test-modal-done');
    doneBtn.onclick = () => modalEl.remove();

    try {
      const res = await this.api('/api/admin/games/run-test', 'POST', { gameCode });
      const data = res.data;
      const statusBox = modalEl.querySelector('#test-exec-status');
      const stepsList = modalEl.querySelector('#test-steps-list');

      statusBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; color: ${data.overallStatus === 'SUCCESS' ? '#34d399' : '#fb7185'};">
            ${data.overallStatus === 'SUCCESS' ? '✓ END-TO-END VERIFICATION PASSED' : '✗ VERIFICATION FAILED'}
          </span>
          <span style="color: var(--text-muted); font-size: 12px;">Latency: ${data.latencyMs}ms</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
          Sandbox simulated cycle completed. Real player balances remain 100% isolated and unchanged.
        </div>
      `;

      stepsList.innerHTML = data.steps.map(s => `
        <div style="padding: 10px 14px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: flex-start; gap: 10px;">
          <span class="badge ${s.status === 'PASSED' ? 'badge-success' : 'badge-danger'}" style="margin-top: 2px;">
            ${s.status === 'PASSED' ? 'PASS' : 'FAIL'}
          </span>
          <div>
            <div style="font-weight: 600; font-size: 13px;">${s.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${s.detail}</div>
          </div>
        </div>
      `).join('');

      doneBtn.removeAttribute('disabled');
      this.toast(`API Test for ${game?.name} completed: ${data.overallStatus}`);
    } catch (e) {
      modalEl.querySelector('#test-exec-status').innerHTML = `<div style="color: #fb7185;">Error executing test: ${e.message}</div>`;
      doneBtn.removeAttribute('disabled');
    }
  }

  // ── Win Rate Modal ────────────────────────────────────────────────────────
  openWinRateModal(gameCode) {
    const game = this.state.games.find(g => g.gameCode === gameCode);
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">${ICONS.edit} Win Rate Setting: ${game?.name}</div>
          <button class="modal-close" id="wr-modal-close">${ICONS.x}</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <label class="form-label">Win Rate Percentage (%)</label>
            <input type="number" id="wr-input-percent" class="input-control" style="width: 100%; font-size: 16px; font-weight: 700;" min="1" max="99" step="0.5" value="${game?.winRate || 50}" />
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Enter targeted RTP percentage (1.0% to 99.0%)</div>
          </div>
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="btn btn-secondary btn-sm" id="btn-set-auto" style="flex: 1;">Set to Auto Win Rate</button>
            <button class="btn btn-secondary btn-sm" id="btn-set-default" style="flex: 1;">Reset to Default (${game?.defaultWinRate || 50}%)</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="wr-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="wr-modal-save">Save &amp; Apply Instantly</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.querySelector('#wr-modal-close').onclick = () => modalEl.remove();
    modalEl.querySelector('#wr-modal-cancel').onclick = () => modalEl.remove();

    modalEl.querySelector('#btn-set-auto').onclick = () => {
      document.getElementById('wr-input-percent').value = (49.5 + Math.random() * 2).toFixed(1);
    };

    modalEl.querySelector('#btn-set-default').onclick = () => {
      document.getElementById('wr-input-percent').value = game?.defaultWinRate || 50;
    };

    modalEl.querySelector('#wr-modal-save').onclick = async () => {
      const val = parseFloat(document.getElementById('wr-input-percent').value);
      if (isNaN(val) || val <= 0 || val > 100) {
        alert('Please enter a valid percentage between 1 and 99');
        return;
      }
      modalEl.remove();
      this.confirmAction({
        title: `Confirm Win Rate Adjustment`,
        message: `Set win rate for ${game?.name} to ${val}%? This change will be saved instantly and applied to all future rounds.`,
        confirmText: 'Apply Win Rate',
        confirmType: 'primary',
        onConfirm: async () => {
          const res = await this.api('/api/admin/games/win-rate', 'POST', {
            gameCode,
            winRate: val,
            mode: 'manual'
          });
          if (res.result) {
            this.toast(res.msg);
            this.loadActiveTabData();
          }
        }
      });
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: HACK BOTS
  // ══════════════════════════════════════════════════════════════════════════
  renderHackBots() {
    const pane = document.getElementById('admin-content-pane');
    const unifiedData = this.state.hackBotsUnified || {};
    const games = unifiedData.games || {};
    const grouped = unifiedData.grouped || {};
    const categories = unifiedData.categories || [
      { key: 'all', name: 'All Categories', count: 18 },
      { key: 'wingo', name: 'Win Go Series', count: 5 },
      { key: 'k3', name: 'K3 Lotre Series', count: 4 },
      { key: '5d', name: '5D Lotre Series', count: 4 },
      { key: 'trx_wingo', name: 'TRX Win Go Series', count: 4 },
      { key: 'aviator', name: 'Aviator Crash', count: 1 }
    ];
    const userSpecific = this.state.hackBotsUserSpecific || [];

    if (!this.hackCategoryFilter) this.hackCategoryFilter = 'all';

    // Helper to format MM:SS
    const formatTimer = (sec) => {
      if (sec === undefined || sec === null || isNaN(sec)) return '00:00';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Helper to render lottery ball
    const renderLotteryBall = (numStr) => {
      const num = parseInt(numStr);
      if (isNaN(num)) return `<span style="font-size: 18px; font-weight: 800; color: #38bdf8;">${numStr}</span>`;
      let cls = 'green';
      if (num === 0) cls = 'split-red-violet';
      else if (num === 5) cls = 'split-green-violet';
      else if ([2, 4, 6, 8].includes(num)) cls = 'red';
      else if ([1, 3, 7, 9].includes(num)) cls = 'green';
      else if ([0, 5].includes(num)) cls = 'violet';
      return `<span class="lottery-ball ${cls}">${num}</span>`;
    };

    // Helper to render K3 dice
    const renderK3Dice = (resStr, details) => {
      const diceIcons = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      const d1 = details?.d1 || (resStr && resStr[0]) || 1;
      const d2 = details?.d2 || (resStr && resStr[1]) || 2;
      const d3 = details?.d3 || (resStr && resStr[2]) || 3;
      return `
        <div class="k3-dice-box">
          <span class="k3-die">${diceIcons[Number(d1)-1] || d1}</span>
          <span class="k3-die">${diceIcons[Number(d2)-1] || d2}</span>
          <span class="k3-die">${diceIcons[Number(d3)-1] || d3}</span>
        </div>
      `;
    };

    // Helper to render 5D digits
    const renderFiveDDigits = (resStr) => {
      const digits = String(resStr || '12345').split('').slice(0, 5);
      return `
        <div class="five-d-box">
          ${digits.map(d => `<span class="five-d-digit">${d}</span>`).join('')}
        </div>
      `;
    };

    // Helper to render individual game card
    const renderBotCard = (g) => {
      const isLocked = g.locked || (g.secondsLeft <= 6);
      const isAviator = g.key === 'aviator';

      let visualResultHtml = '';
      if (isAviator) {
        visualResultHtml = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 22px; font-weight: 800; color: #f43f5e; font-family: 'JetBrains Mono', monospace;">
              ${g.declaredResult}
            </span>
            <span class="badge badge-danger">Crash Target</span>
          </div>
        `;
      } else if (g.type === 'lottery_number' || g.type === 'trx_digit') {
        const num = g.declaredResult;
        visualResultHtml = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            ${renderLotteryBall(num)}
            <div style="text-align: left;">
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${g.details?.colour || 'Colour'}</div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${g.details?.bs || 'Size'}</div>
            </div>
          </div>
        `;
      } else if (g.type === 'k3_dice') {
        visualResultHtml = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            ${renderK3Dice(g.declaredResult, g.details)}
            <div style="text-align: left;">
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Sum ${g.details?.sum || ''}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${g.details?.bs || 'Big'} ${g.details?.isTriple ? '• Triple' : ''}</div>
            </div>
          </div>
        `;
      } else if (g.type === '5d_digits') {
        visualResultHtml = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            ${renderFiveDDigits(g.declaredResult)}
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Sum ${g.details?.sum || ''}</div>
          </div>
        `;
      }

      // Override input controls
      let overrideInputHtml = '';
      if (isAviator) {
        const val = parseFloat(g.declaredResult) || 3.50;
        overrideInputHtml = `
          <input type="number" id="override-input-${g.key}" class="input-control" style="flex: 1; font-weight: 700;" min="1.05" max="100.00" step="0.25" value="${val}" ${isLocked ? 'disabled' : ''} />
        `;
      } else if (g.type === 'lottery_number' || g.type === 'trx_digit') {
        const cur = g.declaredResult;
        overrideInputHtml = `
          <select id="override-input-${g.key}" class="input-control" style="flex: 1;" ${isLocked ? 'disabled' : ''}>
            ${[0,1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}" ${cur == n ? 'selected' : ''}>${n} (${n%2===0?'Red':'Green'}${n===0||n===5?' +Violet':''}, ${n>=5?'Big':'Small'})</option>`).join('')}
          </select>
        `;
      } else if (g.type === 'k3_dice') {
        overrideInputHtml = `
          <select id="override-input-${g.key}" class="input-control" style="flex: 1;" ${isLocked ? 'disabled' : ''}>
            <option value="123" ${g.declaredResult === '123' ? 'selected' : ''}>1,2,3 (Sum 6 - Small)</option>
            <option value="234" ${g.declaredResult === '234' ? 'selected' : ''}>2,3,4 (Sum 9 - Small)</option>
            <option value="345" ${g.declaredResult === '345' ? 'selected' : ''}>3,4,5 (Sum 12 - Big)</option>
            <option value="456" ${g.declaredResult === '456' ? 'selected' : ''}>4,5,6 (Sum 15 - Big)</option>
            <option value="666" ${g.declaredResult === '666' ? 'selected' : ''}>6,6,6 (Triple)</option>
          </select>
        `;
      } else if (g.type === '5d_digits') {
        overrideInputHtml = `
          <input type="text" id="override-input-${g.key}" class="input-control" style="flex: 1; font-weight: 700;" maxlength="5" value="${g.declaredResult || '64321'}" ${isLocked ? 'disabled' : ''} />
        `;
      }

      return `
        <div class="bot-card" id="card-game-${g.key}">
          <div class="bot-card-header">
            <div class="bot-game-title">
              <span>${g.name}</span>
              <span class="interval-pill">${g.intervalLabel}</span>
            </div>
            <span class="badge ${isLocked ? 'badge-danger' : 'badge-success'}" id="status-badge-${g.key}">
              <span class="badge-dot"></span> ${isLocked ? 'LOCKED (≤ 6s)' : 'COUNTDOWN'}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); background: var(--bg-secondary); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <span>Issue: <strong style="color: var(--text-primary); font-family: 'JetBrains Mono', monospace;" id="issue-txt-${g.key}">${g.issueNumber}</strong></span>
            <span style="display: flex; align-items: center; gap: 4px;">
              ${ICONS.clock || ''} 
              <strong style="color: ${isLocked ? '#fb7185' : '#818cf8'}; font-family: 'JetBrains Mono', monospace; font-size: 13px;" id="timer-txt-${g.key}">
                ${isAviator ? `${g.secondsLeft}s` : formatTimer(g.secondsLeft)}
              </strong>
            </span>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                ${isLocked ? 'Declared Winning Result' : 'Predetermined Server Result'}
              </span>
              <span class="source-badge ${g.source?.includes('Admin') ? 'override' : 'auto'}" id="source-badge-${g.key}">
                ${g.source?.includes('Admin') ? 'Admin Manual' : 'Unified Server Auto'}
              </span>
            </div>
            <div class="declared-result-display" id="res-disp-${g.key}">
              ${visualResultHtml}
            </div>
          </div>

          <div style="margin-top: 4px;">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
              ${isLocked ? 'Result locked in final 6 seconds window.' : 'Optional manual override (Available before final 6s):'}
            </div>
            <div style="display: flex; gap: 8px;">
              ${overrideInputHtml}
              <button class="btn btn-secondary btn-sm btn-declare-unified" data-key="${g.key}" ${isLocked ? 'disabled' : ''} id="btn-override-${g.key}">
                ${isLocked ? 'Locked (≤6s)' : 'Override'}
              </button>
            </div>
          </div>
        </div>
      `;
    };

    // Render category groups
    const renderCategorySection = (catKey, title, catGames) => {
      if (!catGames || catGames.length === 0) return '';
      return `
        <div class="category-group-header">
          <div class="category-group-title">
            <span style="font-size: 15px; font-weight: 800; color: #fff;">${title}</span>
            <span class="badge badge-neutral">${catGames.length} Intervals</span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-muted);">
            Auto 6s predetermination • Independent countdowns per interval
          </div>
        </div>
        <div class="unified-games-grid">
          ${catGames.map(renderBotCard).join('')}
        </div>
      `;
    };

    // Filter games to show based on selected category tab
    let sectionsHtml = '';
    if (this.hackCategoryFilter === 'all') {
      sectionsHtml += renderCategorySection('wingo', 'Win Go Series (30s, 1Min, 3Min, 5Min, 10Min)', grouped.wingo);
      sectionsHtml += renderCategorySection('k3', 'K3 Lotre Series (1Min, 3Min, 5Min, 10Min)', grouped.k3);
      sectionsHtml += renderCategorySection('5d', '5D Lotre Series (1Min, 3Min, 5Min, 10Min)', grouped['5d']);
      sectionsHtml += renderCategorySection('trx_wingo', 'TRX Win Go Series (1Min, 3Min, 5Min, 10Min)', grouped.trx_wingo);
      sectionsHtml += renderCategorySection('aviator', 'Aviator Crash (Synchronized Real-time Engine)', grouped.aviator);
    } else {
      const catObj = categories.find(c => c.key === this.hackCategoryFilter);
      const catGames = grouped[this.hackCategoryFilter] || [];
      sectionsHtml += renderCategorySection(this.hackCategoryFilter, catObj?.name || 'Category', catGames);
    }

    pane.innerHTML = `
      <!-- Part A: Unified Server Games -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div>
            <div class="card-title">Part A – Unified Server Games (Autonomous Predetermination Engine)</div>
            <div class="card-subtitle">Separate category sections for 30s, 1m, 3m, 5m, 10m intervals • Auto 6s pre-declaration</div>
          </div>
          <span class="badge badge-success">
            <span class="badge-dot"></span> AUTONOMOUS AUTO-ENGINE ACTIVE
          </span>
        </div>
        <div class="card-body">
          <!-- Information Alert Box -->
          <div style="background-color: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <span style="font-size: 20px;">⚙️</span>
              <div style="font-size: 12.5px; line-height: 1.6; color: var(--text-secondary);">
                <strong style="color: var(--text-primary); font-size: 13.5px;">Hands-Free Unified Operation:</strong>
                Admin manual declaration is <strong>NOT required</strong>. Exactly <strong>6 seconds</strong> before each round starts, the Unified Server automatically computes, locks, and declares the predetermined winning outcome. Players receive the exact declared result. If desired, you may still manually override before the 6-second lock threshold.
              </div>
            </div>
          </div>

          <!-- Category Filter Tabs -->
          <div class="hack-category-tabs">
            ${categories.map(c => `
              <button class="hack-category-tab ${this.hackCategoryFilter === c.key ? 'active' : ''}" data-cat="${c.key}">
                <span>${c.name}</span>
                <span class="badge badge-neutral" style="font-size: 10px;">${c.count}</span>
              </button>
            `).join('')}
          </div>

          <!-- Category Sections & Cards Grid -->
          <div id="hack-unified-sections-container">
            ${sectionsHtml}
          </div>
        </div>
      </div>

      <!-- Part B: Non-Unified / User-Specific Games -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Part B – Non-Unified / User-Specific Games</div>
            <div class="card-subtitle">Per-UID controlled results • Tower Dash, Chicken Road, Mega Block, Moto Race</div>
          </div>
          <span class="badge badge-info">Rule: Strictly 3x to 50x</span>
        </div>
        <div class="card-body">
          <div style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 13.5px; margin-bottom: 12px;">Force Controlled Result for Specific User</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: 12px; align-items: flex-end;">
              <div>
                <label class="form-label">User ID (UID)</label>
                <input type="number" id="forced-uid-input" class="input-control" style="width: 100%; font-weight: 700;" placeholder="e.g. 1677637" value="1677637" />
              </div>
              <div>
                <label class="form-label">Select Game</label>
                <select id="forced-game-select" class="input-control" style="width: 100%;">
                  <option value="chicken-road">Chicken Road</option>
                  <option value="chicken-road-2">Chicken Road 2</option>
                  <option value="tower-dash">Tower Dash</option>
                  <option value="mega-block">Mega Block</option>
                  <option value="moto-race">Moto Race</option>
                </select>
              </div>
              <div>
                <label class="form-label">Multiplier Target (3x - 50x)</label>
                <input type="number" id="forced-mult-input" class="input-control" style="width: 100%; font-weight: 700;" min="3.00" max="50.00" step="0.25" placeholder="Auto / Manual" />
              </div>
              <div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-auto-gen-mult" style="width: 100%; height: 38px;">
                  ${ICONS.refresh} Auto Mix (3x-50x)
                </button>
              </div>
              <div>
                <button type="button" class="btn btn-primary" id="btn-arm-forced-bot" style="height: 38px;">
                  ${ICONS.check} Arm Hack Bot
                </button>
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 11.5px; color: var(--text-muted); line-height: 1.5;">
              • Guaranteed Range: Never below 3x, never above 50x.<br />
              • Mixed Randomness: Alternates high (25x-50x) and low (3x-24.99x) to prevent consecutive repetitions.<br />
              • User will receive the controlled high win rate even if global game RTP is set low.
            </div>
          </div>

          <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px;">Active User-Specific Rules (${userSpecific.length})</div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Target Game</th>
                  <th>Forced Multiplier</th>
                  <th>Band Sequence</th>
                  <th>Recent History</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${userSpecific.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No active user-specific rules configured.</td></tr>
                ` : userSpecific.map(r => `
                  <tr>
                    <td><strong style="color: #818cf8;">${r.uid}</strong></td>
                    <td>${r.username || `UID-${r.uid}`}</td>
                    <td><span class="badge badge-neutral">${r.gameName || r.game}</span></td>
                    <td>
                      <span style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 800; color: #34d399;">
                        ${r.forcedMultiplier}x
                      </span>
                    </td>
                    <td>
                      <span class="badge ${r.lastBand === 'HIGH' ? 'badge-warning' : 'badge-info'}">
                        ${r.lastBand || 'BALANCED'}
                      </span>
                    </td>
                    <td>
                      <span style="font-size: 11px; color: var(--text-muted); font-family: monospace;">
                        ${(r.history || []).slice(0, 3).map(h => `${h}x`).join(', ') || 'Initial round'}
                      </span>
                    </td>
                    <td>
                      <span class="badge badge-success"><span class="badge-dot"></span> Armed &amp; Active</span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-danger btn-sm btn-clear-forced" data-id="${r.id}">
                        ${ICONS.x} Clear
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Category tab click delegation
    pane.querySelectorAll('.hack-category-tab').forEach(tab => {
      tab.onclick = () => {
        this.hackCategoryFilter = tab.dataset.cat;
        this.renderHackBots();
      };
    });

    // Unified declaration handlers (for manual overrides)
    pane.querySelectorAll('.btn-declare-unified').forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        const inputEl = document.getElementById(`override-input-${key}`);
        if (!inputEl) return;
        const val = inputEl.value;

        this.confirmAction({
          title: `Override Result: ${key.toUpperCase()}`,
          message: `Manually override next result to: <strong>${val}</strong>? This result will be pushed simultaneously to all connected players when the round starts.`,
          confirmText: 'Confirm Override',
          confirmType: 'primary',
          onConfirm: async () => {
            const res = await this.api('/api/admin/hack-bots/unified/declare', 'POST', {
              gameKey: key,
              result: val
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            } else {
              alert(res.msg);
            }
          }
        });
      };
    });

    // Auto-gen multiplier button
    const autoBtn = document.getElementById('btn-auto-gen-mult');
    if (autoBtn) {
      autoBtn.onclick = () => {
        const isHigh = Math.random() > 0.5;
        const generated = isHigh ? +(25.0 + Math.random() * 24.5).toFixed(2) : +(3.0 + Math.random() * 21.0).toFixed(2);
        document.getElementById('forced-mult-input').value = generated;
      };
    }

    // Arm user-specific bot
    const armBtn = document.getElementById('btn-arm-forced-bot');
    if (armBtn) {
      armBtn.onclick = async () => {
        const uid = document.getElementById('forced-uid-input').value.trim();
        const game = document.getElementById('forced-game-select').value;
        let mult = document.getElementById('forced-mult-input').value;

        if (!uid) {
          alert('Please enter a User ID');
          return;
        }

        this.confirmAction({
          title: `Arm User-Specific Result (${uid})`,
          message: `Force controlled result on ${game} for UID ${uid}? Result is strictly guaranteed between 3x and 50x.`,
          confirmText: 'Arm Hack Bot',
          confirmType: 'primary',
          onConfirm: async () => {
            const res = await this.api('/api/admin/hack-bots/user-specific/force', 'POST', {
              uid,
              game,
              forcedMultiplier: mult ? parseFloat(mult) : null
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            } else {
              alert(res.msg);
            }
          }
        });
      };
    }

    // Clear forced rule
    pane.querySelectorAll('.btn-clear-forced').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const res = await this.api('/api/admin/hack-bots/user-specific/delete', 'POST', { id });
        if (res.result) {
          this.toast('Forced result rule cleared');
          this.loadActiveTabData();
        }
      };
    });
  }

  updateHackBotCountdowns() {
    const unifiedData = this.state.hackBotsUnified;
    if (!unifiedData || !unifiedData.games) return;
    const games = unifiedData.games;

    const formatTimer = (sec) => {
      if (sec === undefined || sec === null || isNaN(sec)) return '00:00';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    for (const key of Object.keys(games)) {
      const g = games[key];
      if (!g) continue;
      const isLocked = g.locked || (g.secondsLeft <= 6);
      const isAviator = g.key === 'aviator';

      // Update timer text
      const timerEl = document.getElementById(`timer-txt-${g.key}`);
      if (timerEl) {
        timerEl.textContent = isAviator ? `${g.secondsLeft}s` : formatTimer(g.secondsLeft);
        timerEl.style.color = isLocked ? '#fb7185' : '#818cf8';
      }

      // Update issue number
      const issueEl = document.getElementById(`issue-txt-${g.key}`);
      if (issueEl) issueEl.textContent = g.issueNumber;

      // Update status badge
      const badgeEl = document.getElementById(`status-badge-${g.key}`);
      if (badgeEl) {
        badgeEl.className = `badge ${isLocked ? 'badge-danger' : 'badge-success'}`;
        badgeEl.innerHTML = `<span class="badge-dot"></span> ${isLocked ? 'LOCKED (≤ 6s)' : 'COUNTDOWN'}`;
      }

      // Update source badge
      const srcEl = document.getElementById(`source-badge-${g.key}`);
      if (srcEl) {
        srcEl.className = `source-badge ${g.source?.includes('Admin') ? 'override' : 'auto'}`;
        srcEl.textContent = g.source?.includes('Admin') ? 'Admin Manual' : 'Unified Server Auto';
      }

      // Update override button disabled state
      const btnEl = document.getElementById(`btn-override-${g.key}`);
      const inputEl = document.getElementById(`override-input-${g.key}`);
      if (btnEl) {
        btnEl.disabled = isLocked;
        btnEl.textContent = isLocked ? 'Locked (≤6s)' : 'Override';
      }
      if (inputEl) {
        inputEl.disabled = isLocked;
      }

      // Update dynamic visual result display
      const resDispEl = document.getElementById(`res-disp-${g.key}`);
      if (resDispEl) {
        if (isAviator) {
          resDispEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span style="font-size: 22px; font-weight: 800; color: #f43f5e; font-family: 'JetBrains Mono', monospace;">
                ${g.declaredResult}
              </span>
              <span class="badge badge-danger">Crash Target</span>
            </div>
          `;
        } else if (g.type === 'lottery_number' || g.type === 'trx_digit') {
          const num = g.declaredResult;
          let cls = 'green';
          const n = parseInt(num);
          if (n === 0) cls = 'split-red-violet';
          else if (n === 5) cls = 'split-green-violet';
          else if ([2, 4, 6, 8].includes(n)) cls = 'red';
          else if ([1, 3, 7, 9].includes(n)) cls = 'green';
          resDispEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <span class="lottery-ball ${cls}">${num}</span>
              <div style="text-align: left;">
                <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${g.details?.colour || 'Colour'}</div>
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${g.details?.bs || 'Size'}</div>
              </div>
            </div>
          `;
        } else if (g.type === 'k3_dice') {
          const diceIcons = ['⚀','⚁','⚂','⚃','⚄','⚅'];
          const d1 = g.details?.d1 || g.declaredResult?.[0] || 1;
          const d2 = g.details?.d2 || g.declaredResult?.[1] || 2;
          const d3 = g.details?.d3 || g.declaredResult?.[2] || 3;
          resDispEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <div class="k3-dice-box">
                <span class="k3-die">${diceIcons[Number(d1)-1] || d1}</span>
                <span class="k3-die">${diceIcons[Number(d2)-1] || d2}</span>
                <span class="k3-die">${diceIcons[Number(d3)-1] || d3}</span>
              </div>
              <div style="text-align: left;">
                <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Sum ${g.details?.sum || ''}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${g.details?.bs || 'Big'} ${g.details?.isTriple ? '• Triple' : ''}</div>
              </div>
            </div>
          `;
        } else if (g.type === '5d_digits') {
          const digits = String(g.declaredResult || '12345').split('').slice(0, 5);
          resDispEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
              <div class="five-d-box">
                ${digits.map(d => `<span class="five-d-digit">${d}</span>`).join('')}
              </div>
              <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">Sum ${g.details?.sum || ''}</div>
            </div>
          `;
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: RECHARGE SECTION
  // ══════════════════════════════════════════════════════════════════════════
  // ── Gateway Management Section ──────────────────────────────────────────
  renderGateways() {
    const pane = document.getElementById('admin-content-pane');
    const gateways = this.state.gateways || [];

    pane.innerHTML = `
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 20px; font-weight: 800; color: #fff;">UPI & Payment Gateways Configuration</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              Manage 4 independent UPI/QR gateways. Toggling a gateway OFF will immediately display <strong>"Server Down – Cannot Accept Payment"</strong> on its frontend page.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-refresh-gateways">
            ${ICONS.refresh} Refresh Gateways
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        ${gateways.map(gw => `
          <div class="card" style="border: 1.5px solid ${gw.enabled ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)'}; background: var(--bg-card); position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h3 style="font-size: 18px; font-weight: 800; color: #fff;">${gw.name}</h3>
                  <code class="route-pill">${gw.route}</code>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                  Min: ₹${gw.minAmount} • Max: ₹${gw.maxAmount}
                </div>
              </div>
              <span class="badge ${gw.enabled ? 'badge-success' : 'badge-danger'}">
                <span class="badge-dot"></span> ${gw.enabled ? 'ONLINE (ON)' : 'DISABLED (OFF)'}
              </span>
            </div>

            <!-- Toggle Switch Container -->
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border: 1px solid var(--border);">
              <div>
                <div style="font-size: 13px; font-weight: 700; color: #fff;">Gateway Power State</div>
                <div style="font-size: 11px; color: var(--text-muted);">${gw.enabled ? 'Accepting user payments normally' : 'Displays "Server Down" to users'}</div>
              </div>
              <button class="btn ${gw.enabled ? 'btn-danger' : 'btn-success'} btn-sm gw-toggle-btn" data-id="${gw.id}" data-enabled="${gw.enabled}">
                ${gw.enabled ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>

            <!-- QR Preview -->
            <div style="background: #ffffff; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 16px; display: flex; flex-direction: column; align-items: center;">
              <img src="${gw.qrImage}?t=${Date.now()}" style="width: 170px; height: 170px; object-fit: contain; border-radius: 10px;" id="qr-preview-${gw.id}" alt="${gw.name} QR Code" />
              <div style="font-size: 12px; font-weight: 700; color: #334155; margin-top: 8px;">Active QR Code</div>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm btn-change-qr" data-id="${gw.id}" data-name="${gw.name}" style="flex: 1;">
                ${ICONS.download} Change QR Image
              </button>
              <a href="${gw.route}?uid=1677637&amount=500" target="_blank" class="btn btn-primary btn-sm" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
                ${ICONS.eye} Test Gateway
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Toggle button listeners
    pane.querySelectorAll('.gw-toggle-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const currentEnabled = btn.dataset.enabled === 'true';
        const res = await this.api('/api/admin/gateways/toggle', 'POST', { gatewayId: id, enabled: !currentEnabled });
        if (res.result) {
          this.toast(res.msg);
          this.loadActiveTabData();
        } else {
          alert(res.msg);
        }
      };
    });

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-gateways');
    if (refreshBtn) refreshBtn.onclick = () => this.loadActiveTabData();

    // Change QR button
    pane.querySelectorAll('.btn-change-qr').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const newUrl = prompt(`Enter new image URL or path for ${name} QR Code:`, `/uploads/gateways/${id.replace('-', '_')}.svg`);
        if (newUrl) {
          this.confirmAction({
            title: `Update QR Code for ${name}`,
            message: `Set active QR image to <code>${newUrl}</code>? All future users visiting ${name} will scan this new QR code.`,
            confirmText: 'Save QR Image',
            confirmType: 'primary',
            onConfirm: async () => {
              const res = await this.api('/api/admin/gateways/update', 'POST', { gatewayId: id, qrImage: newUrl });
              if (res.result) {
                this.toast(res.msg);
                this.loadActiveTabData();
              } else {
                alert(res.msg);
              }
            }
          });
        }
      };
    });
  }

  renderRecharge() {
    const pane = document.getElementById('admin-content-pane');
    const { summary, requests } = this.state.recharges;

    let filtered = requests || [];
    if (this.rechargeFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status.toLowerCase() === this.rechargeFilter.toLowerCase());
    }

    pane.innerHTML = `
      <!-- Summary Cards -->
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Today's Total Accepted Deposit</span>
            <div class="kpi-icon-wrap kpi-icon-emerald">${ICONS.recharge}</div>
          </div>
          <div class="kpi-value" style="color: #34d399;">₹${(summary.todayTotalAccepted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div class="kpi-meta">
            <span>Verified and credited today</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">Unique Users Recharged Today</span>
            <div class="kpi-icon-wrap kpi-icon-indigo">${ICONS.users}</div>
          </div>
          <div class="kpi-value" style="color: #818cf8;">${summary.uniqueUsersToday || 0}</div>
          <div class="kpi-meta">
            <span>Distinct depositors today</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-title">All-Time Total Accepted Deposit</span>
            <div class="kpi-icon-wrap kpi-icon-amber">${ICONS.dashboard}</div>
          </div>
          <div class="kpi-value" style="color: #fbbf24;">₹${(summary.allTimeTotalAccepted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div class="kpi-meta">
            <span>Cumulative accepted deposits</span>
          </div>
        </div>
      </div>

      <!-- Requests Table Filter & Actions -->
      <div class="filter-bar">
        <div class="filter-group">
          <div class="segmented-control">
            <button class="segment-btn ${this.rechargeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">All Requests</button>
            <button class="segment-btn ${this.rechargeFilter === 'Pending' ? 'active' : ''}" data-filter="Pending">Pending</button>
            <button class="segment-btn ${this.rechargeFilter === 'Accepted' ? 'active' : ''}" data-filter="Accepted">Accepted</button>
            <button class="segment-btn ${this.rechargeFilter === 'Rejected' ? 'active' : ''}" data-filter="Rejected">Rejected</button>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Acceptance immediately credits user wallet and updates transaction history
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Username</th>
              <th>UID</th>
              <th>Phone Number</th>
              <th>Payment Mode</th>
              <th>Recharge Amount</th>
              <th>UTR Number</th>
              <th>Payment Receipt</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">No recharge requests found for this filter.</td></tr>
            ` : filtered.map(r => `
              <tr>
                <td><code class="route-pill">${r.id}</code></td>
                <td><strong>${r.username}</strong></td>
                <td><span style="font-family: monospace; color: #818cf8;">${r.userId}</span></td>
                <td>${r.phoneNumber}</td>
                <td><span class="badge badge-neutral">${r.paymentMode}</span></td>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; color: #34d399;">
                    ₹${Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td><code style="font-family: monospace; color: #f59e0b; font-weight: 700;">${r.utrNumber}</code></td>
                <td>
                  <img src="${r.screenshotUrl || '/assets/receipts/receipt_sample_1.svg'}" class="receipt-thumbnail btn-view-receipt" data-url="${r.screenshotUrl || '/assets/receipts/receipt_sample_1.svg'}" data-utr="${r.utrNumber}" data-amt="${r.amount}" title="Click to view full receipt" />
                </td>
                <td>
                  <span class="badge ${r.status === 'Accepted' ? 'badge-success' : r.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">
                    <span class="badge-dot"></span> ${r.status}
                  </span>
                </td>
                <td style="text-align: right;">
                  ${r.status === 'Pending' ? `
                    <div style="display: inline-flex; gap: 6px;">
                      <button class="btn btn-success btn-sm btn-rec-accept" data-id="${r.id}" data-amt="${r.amount}" data-uid="${r.userId}">
                        ${ICONS.check} Accept
                      </button>
                      <button class="btn btn-danger btn-sm btn-rec-reject" data-id="${r.id}" data-amt="${r.amount}" data-uid="${r.userId}">
                        ${ICONS.x} Reject
                      </button>
                    </div>
                  ` : `
                    <span style="font-size: 11px; color: var(--text-muted);">Processed</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Filter clicks
    pane.querySelectorAll('.segmented-control button').forEach(b => {
      b.onclick = () => {
        this.rechargeFilter = b.dataset.filter;
        this.renderRecharge();
      };
    });

    // View Receipt Modal
    pane.querySelectorAll('.btn-view-receipt').forEach(img => {
      img.onclick = () => {
        const url = img.dataset.url;
        const utr = img.dataset.utr;
        const amt = img.dataset.amt;
        const m = document.createElement('div');
        m.className = 'modal-overlay';
        m.innerHTML = `
          <div class="modal-dialog" style="max-width: 440px;">
            <div class="modal-header">
              <div class="modal-title">Payment Screenshot: UTR ${utr}</div>
              <button class="modal-close" id="rec-img-close">${ICONS.x}</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 14px;">
              <img src="${url}" style="width: 100%; max-height: 520px; border-radius: var(--radius-md); object-fit: contain; box-shadow: var(--shadow-md);" />
              <div style="margin-top: 10px; font-weight: 700; color: #34d399; font-size: 16px;">Verified Amount: ₹${amt}</div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="rec-img-done">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(m);
        m.querySelector('#rec-img-close').onclick = () => m.remove();
        m.querySelector('#rec-img-done').onclick = () => m.remove();
      };
    });

    // Accept Recharge
    pane.querySelectorAll('.btn-rec-accept').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const amt = btn.dataset.amt;
        const uid = btn.dataset.uid;
        this.confirmAction({
          title: `Accept Recharge Order #${id}`,
          message: `Are you sure you want to ACCEPT this deposit request? <strong>₹${amt}</strong> will be immediately credited to UID <strong>${uid}</strong>'s wallet, and the order will be recorded in the official deposit ledger.`,
          confirmText: 'Accept & Credit Wallet',
          confirmType: 'success',
          onConfirm: async () => {
            const res = await this.api('/api/admin/recharges/action', 'POST', {
              rechargeId: id,
              action: 'Accept'
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            } else {
              alert(res.msg);
            }
          }
        });
      };
    });

    // Reject Recharge
    pane.querySelectorAll('.btn-rec-reject').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const amt = btn.dataset.amt;
        this.confirmAction({
          title: `Reject Recharge Order #${id}`,
          message: `Are you sure you want to REJECT this deposit of ₹${amt}? No funds will be credited to the user's wallet.`,
          confirmText: 'Reject Recharge',
          confirmType: 'danger',
          onConfirm: async () => {
            const res = await this.api('/api/admin/recharges/action', 'POST', {
              rechargeId: id,
              action: 'Reject',
              reason: 'UTR verification failed or duplicate transaction'
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            } else {
              alert(res.msg);
            }
          }
        });
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: WITHDRAWAL LIST SECTION
  // ══════════════════════════════════════════════════════════════════════════
  renderWithdrawals() {
    const pane = document.getElementById('admin-content-pane');
    const withdrawals = this.state.withdrawals || [];

    pane.innerHTML = `
      <div class="filter-bar">
        <div class="filter-group">
          <div class="segmented-control">
            <button class="segment-btn ${this.withdrawalFilter === 'ALL' ? 'active' : ''}" data-status="ALL">All (${withdrawals.length})</button>
            <button class="segment-btn ${this.withdrawalFilter === 'Requesting' ? 'active' : ''}" data-status="Requesting">Requesting</button>
            <button class="segment-btn ${this.withdrawalFilter === 'Pending' ? 'active' : ''}" data-status="Pending">Pending</button>
            <button class="segment-btn ${this.withdrawalFilter === 'Accepted' ? 'active' : ''}" data-status="Accepted">Accepted</button>
            <button class="segment-btn ${this.withdrawalFilter === 'Rejected' ? 'active' : ''}" data-status="Rejected">Rejected</button>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Strict Status Lifecycle: Requesting → Pending → Accepted / Rejected
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Username</th>
              <th>Phone Number</th>
              <th>UID</th>
              <th>Withdraw Amount</th>
              <th>Mode / Destination</th>
              <th>Created Date</th>
              <th>Status</th>
              <th style="text-align: right;">Status Actions</th>
            </tr>
          </thead>
          <tbody>
            ${withdrawals.length === 0 ? `
              <tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No withdrawal requests found under this status.</td></tr>
            ` : withdrawals.map(w => `
              <tr>
                <td><code class="route-pill">${w.id}</code></td>
                <td><strong>${w.username}</strong></td>
                <td>${w.phoneNumber}</td>
                <td><span style="font-family: monospace; color: #818cf8;">${w.userId}</span></td>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; color: #fb7185;">
                    ₹${Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <div>
                    <span class="badge badge-neutral">${w.withdrawalMode}</span>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      ${w.accountDetails?.accountNumber ? `Acc: ${w.accountDetails.accountNumber} (${w.accountDetails.bankName})` : w.accountDetails?.walletAddress ? `Addr: ${w.accountDetails.walletAddress.slice(0, 10)}...` : 'Bank Transfer'}
                    </div>
                  </div>
                </td>
                <td><span style="font-size: 12px; color: var(--text-secondary);">${w.createdAt}</span></td>
                <td>
                  <span class="badge ${w.status === 'Accepted' ? 'badge-success' : w.status === 'Rejected' ? 'badge-danger' : w.status === 'Pending' ? 'badge-warning' : 'badge-info'}">
                    <span class="badge-dot"></span> ${w.status}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    ${w.status === 'Requesting' ? `
                      <button class="btn btn-secondary btn-sm btn-wth-status" data-id="${w.id}" data-target="Pending">
                        Start Processing
                      </button>
                    ` : ''}

                    ${w.status === 'Pending' ? `
                      <button class="btn btn-success btn-sm btn-wth-status" data-id="${w.id}" data-target="Accepted">
                        ${ICONS.check} Mark Completed
                      </button>
                      <button class="btn btn-danger btn-sm btn-wth-status" data-id="${w.id}" data-target="Rejected">
                        ${ICONS.x} Reject
                      </button>
                    ` : ''}

                    ${w.status === 'Requesting' ? `
                      <button class="btn btn-danger btn-sm btn-wth-status" data-id="${w.id}" data-target="Rejected">
                        ${ICONS.x} Reject
                      </button>
                    ` : ''}

                    ${(w.status === 'Accepted' || w.status === 'Rejected') ? `
                      <span style="font-size: 11px; color: var(--text-muted);">Completed</span>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Filter handling
    pane.querySelectorAll('.segmented-control button').forEach(b => {
      b.onclick = () => {
        this.withdrawalFilter = b.dataset.status;
        this.loadActiveTabData();
      };
    });

    // Status Transition Actions
    pane.querySelectorAll('.btn-wth-status').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const target = btn.dataset.target;
        this.confirmAction({
          title: `Update Withdrawal #${id}`,
          message: `Change withdrawal status to <strong>${target}</strong>? This is immediately saved in the database and reflected in the user's withdrawal history.`,
          confirmText: `Set to ${target}`,
          confirmType: target === 'Accepted' ? 'success' : target === 'Rejected' ? 'danger' : 'primary',
          onConfirm: async () => {
            const res = await this.api('/api/admin/withdrawals/status', 'POST', {
              withdrawalId: id,
              status: target
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            } else {
              alert(res.msg);
            }
          }
        });
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: USER LIST SECTION
  // ══════════════════════════════════════════════════════════════════════════
  renderUsers() {
    const pane = document.getElementById('admin-content-pane');
    const { users, total, page, totalPages } = this.state.users || { users: [], total: 0, page: 1, totalPages: 1 };

    pane.innerHTML = `
      <div class="filter-bar">
        <div class="search-wrap">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" id="user-search-input" class="input-control input-search" placeholder="Search by UID, Username, or Phone..." value="${this.userSearch}" />
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" id="btn-export-users-csv">
            ${ICONS.download} Export CSV
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Username</th>
              <th>Phone Number</th>
              <th>Wallet Balance</th>
              <th>Referred Count</th>
              <th>Recharged Referrals</th>
              <th>Status</th>
              <th>Last Active</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0 ? `
              <tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">No registered users match your search query.</td></tr>
            ` : users.map(u => `
              <tr>
                <td><strong style="font-family: monospace; color: #818cf8;">${u.userId}</strong></td>
                <td>
                  <div style="font-weight: 700; color: var(--text-primary);">${u.username}</div>
                  <div style="font-size: 11px; color: var(--text-muted);">${u.isOnline ? '🟢 Online' : '⚪ Offline'}</div>
                </td>
                <td>${u.phoneNumber}</td>
                <td>
                  <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; color: #34d399;">
                    ₹${Number(u.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td><span class="badge badge-neutral">${u.referralCount || 0} users</span></td>
                <td>
                  <span class="badge badge-info">${u.rechargedReferralCount || 0} active</span>
                </td>
                <td>
                  <span class="badge ${u.isBanned ? 'badge-danger' : 'badge-success'}">
                    <span class="badge-dot"></span> ${u.isBanned ? 'BANNED' : 'ACTIVE'}
                  </span>
                </td>
                <td><span style="font-size: 12px; color: var(--text-secondary);">${u.lastLogin || u.registeredAt}</span></td>
                <td style="text-align: right;">
                  <div style="display: inline-flex; gap: 6px;">
                    <button class="btn btn-secondary btn-sm btn-edit-balance" data-uid="${u.userId}" data-name="${u.username}" data-bal="${u.amount}">
                      ${ICONS.edit} Edit Amount
                    </button>
                    <button class="btn ${u.isBanned ? 'btn-success' : 'btn-danger'} btn-sm btn-toggle-ban" data-uid="${u.userId}" data-banned="${u.isBanned}" data-name="${u.username}">
                      ${u.isBanned ? ICONS.check + ' Unban' : ICONS.ban + ' Ban'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="pagination-wrap">
          <div>Showing ${users.length} of ${total} registered users</div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" id="btn-user-prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
            <span style="padding: 6px 12px; font-weight: 600;">Page ${page} of ${totalPages}</span>
            <button class="btn btn-secondary btn-sm" id="btn-user-next" ${page >= totalPages ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      </div>
    `;

    // Search input
    let searchTimeout;
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
      searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.userSearch = searchInput.value;
          this.userPage = 1;
          this.loadActiveTabData();
        }, 350);
      };
    }

    // Pagination
    const prevBtn = document.getElementById('btn-user-prev');
    const nextBtn = document.getElementById('btn-user-next');
    if (prevBtn) prevBtn.onclick = () => { if (this.userPage > 1) { this.userPage--; this.loadActiveTabData(); } };
    if (nextBtn) nextBtn.onclick = () => { if (this.userPage < totalPages) { this.userPage++; this.loadActiveTabData(); } };

    // Export CSV
    const exportBtn = document.getElementById('btn-export-users-csv');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportUsersToCsv(users);
    }

    // Ban / Unban
    pane.querySelectorAll('.btn-toggle-ban').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.uid;
        const isBanned = btn.dataset.banned === 'true';
        const name = btn.dataset.name;
        const targetBanned = !isBanned;

        this.confirmAction({
          title: targetBanned ? `Ban User ${name} (${uid})` : `Unban User ${name} (${uid})`,
          message: targetBanned
            ? `When banned, user ${name} cannot log in under any circumstance, and all current sessions are invalidated immediately. Continue?`
            : `Unban user ${name}? This will restore normal login and gameplay privileges.`,
          confirmText: targetBanned ? 'Ban Account' : 'Unban Account',
          confirmType: targetBanned ? 'danger' : 'success',
          onConfirm: async () => {
            const res = await this.api('/api/admin/users/ban', 'POST', {
              userId: uid,
              isBanned: targetBanned
            });
            if (res.result) {
              this.toast(res.msg);
              this.loadActiveTabData();
            }
          }
        });
      };
    });

    // Edit Amount (Wallet Balance)
    pane.querySelectorAll('.btn-edit-balance').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.uid;
        const name = btn.dataset.name;
        const curBal = btn.dataset.bal;
        this.openEditBalanceModal(uid, name, curBal);
      };
    });
  }

  openEditBalanceModal(uid, username, currentBalance) {
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-overlay';
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">${ICONS.edit} Edit Wallet Balance: ${username}</div>
          <button class="modal-close" id="bal-modal-close">${ICONS.x}</button>
        </div>
        <div class="modal-body">
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--text-muted);">Current Balance</div>
            <div style="font-size: 20px; font-weight: 800; color: #34d399; font-family: 'JetBrains Mono', monospace;">
              ₹${Number(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label class="form-label">New Wallet Balance Amount (₹)</label>
            <input type="number" id="bal-input-new" class="input-control" style="width: 100%; font-size: 16px; font-weight: 700;" step="1" min="0" value="${currentBalance}" />
          </div>
          <div style="margin-bottom: 10px;">
            <label class="form-label">Reason / Audit Memo</label>
            <input type="text" id="bal-input-reason" class="input-control" style="width: 100%;" placeholder="e.g. Manual deposit adjustment / Compensation" value="Manual Balance Adjustment by Admin" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="bal-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="bal-modal-save">Update Balance</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.querySelector('#bal-modal-close').onclick = () => modalEl.remove();
    modalEl.querySelector('#bal-modal-cancel').onclick = () => modalEl.remove();

    modalEl.querySelector('#bal-modal-save').onclick = async () => {
      const newBal = document.getElementById('bal-input-new').value;
      const reason = document.getElementById('bal-input-reason').value;
      if (isNaN(parseFloat(newBal)) || parseFloat(newBal) < 0) {
        alert('Please enter a valid balance amount');
        return;
      }
      modalEl.remove();

      this.confirmAction({
        title: `Confirm Balance Modification`,
        message: `Directly update balance for <strong>${username}</strong> from <strong>₹${currentBalance}</strong> to <strong>₹${newBal}</strong>? This adjustment is logged with your Admin ID and timestamp.`,
        confirmText: 'Apply Balance Change',
        confirmType: 'primary',
        onConfirm: async () => {
          const res = await this.api('/api/admin/users/edit-balance', 'POST', {
            userId: uid,
            newBalance: newBal,
            reason
          });
          if (res.result) {
            this.toast(res.msg);
            this.loadActiveTabData();
          } else {
            alert(res.msg);
          }
        }
      });
    };
  }

  exportUsersToCsv(users) {
    if (!users || users.length === 0) return;
    const headers = ['UID', 'Username', 'Phone Number', 'Balance', 'Referrals', 'Recharged Referrals', 'Banned', 'Registered At'];
    const rows = users.map(u => [
      u.userId,
      u.username,
      u.phoneNumber,
      u.amount,
      u.referralCount,
      u.rechargedReferralCount,
      u.isBanned ? 'YES' : 'NO',
      u.registeredAt
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `forntman_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    this.toast('Users CSV exported successfully');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7: AUDIT LOGS
  // ══════════════════════════════════════════════════════════════════════════
  renderAuditLogs() {
    const pane = document.getElementById('admin-content-pane');
    const logs = this.state.auditLogs || [];

    pane.innerHTML = `
      <div class="filter-bar">
        <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
          Audit Trail Log (${logs.length} operations)
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          Permanent chronological record of every critical admin action
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Log ID</th>
              <th>Admin Actor</th>
              <th>Action Type</th>
              <th>Operation Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">No audit records found.</td></tr>
            ` : logs.map(l => `
              <tr>
                <td><span style="font-size: 12px; font-family: monospace; color: var(--text-secondary);">${l.timestamp}</span></td>
                <td><code class="route-pill">${l.id}</code></td>
                <td><strong style="color: #818cf8;">${l.admin || 'admin'}</strong></td>
                <td><span class="badge badge-info">${l.action}</span></td>
                <td style="font-size: 12.5px; color: var(--text-secondary); font-family: monospace;">${l.details}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// ── Root Bootstrapper ───────────────────────────────────────────────────────
window.__adminApp = new AdminConsoleApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.__adminApp.init());
} else {
  window.__adminApp.init();
}
