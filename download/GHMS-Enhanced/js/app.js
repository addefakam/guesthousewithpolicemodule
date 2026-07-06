/**
 * app.js — Main Application Entry Point
 * Guest House Management System
 */
import { setLanguage, getLang, applyTranslations, t } from './i18n.js';
import { Settings, seedDemoData, Auth } from './data.js';

// ---- Module registry (lazy loaded) ----
const modules = {
  dashboard:    () => import('./modules/dashboard.js'),
  rooms:        () => import('./modules/rooms.js'),
  guests:       () => import('./modules/guests.js'),
  reservations: () => import('./modules/reservations.js'),
  calendar:     () => import('./modules/calendar.js'),
  daytime:      () => import('./modules/daytime.js'),
  expenses:     () => import('./modules/expenses.js'),
  resources:    () => import('./modules/resources.js'),
  reports:      () => import('./modules/reports.js'),
  settings:     () => import('./modules/settings.js'),
  users:        () => import('./modules/users.js'),
  feedback:     () => import('./modules/feedback.js'),
};

let currentPage = 'dashboard';

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Seed demo data on first run
  seedDemoData();

  // Load settings
  const settings = Settings.get();
  const lang = settings.language || 'en';
  setLanguage(lang);

  // Apply settings to UI
  applySettingsToUI(settings);

  // Set current date
  updateDateDisplay();

  // Initialize Lucide icons
  lucide.createIcons();

  // Sidebar events
  initSidebar();

  // Language switcher
  initLangSwitcher(lang);

  // Modal events
  initModal();

  // Confirm dialog
  initConfirmDialog();

  // Initialize Notifications
  initNotifications();

  // Navigate to dashboard
  // Expose navigate globally for quick-action buttons
  window.navigate = navigate;

  // Initialize Authentication
  initAuth();
});

// ============================================================
// AUTHENTICATION
// ============================================================
function initAuth() {
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');

  function updateAuthState() {
    const user = Auth.getCurrentUser();
    if (!user) {
      loginOverlay.classList.remove('hidden');
      document.getElementById('sidebar').style.display = 'none';
      document.querySelector('.top-bar').style.display = 'none';
    } else {
      loginOverlay.classList.add('hidden');
      document.getElementById('sidebar').style.display = 'flex';
      document.querySelector('.top-bar').style.display = 'flex';
      applyRoleUI(user);
      navigate('dashboard');
    }
  }

  function applyRoleUI(user) {
    // Set Owner/User details
    const ownerDisplay = document.getElementById('owner-name-display');
    const ownerRole = document.getElementById('owner-role-display');
    if (ownerDisplay) ownerDisplay.textContent = user.name || user.username;
    if (ownerRole) ownerRole.textContent = user.role.toUpperCase();

    // Toggle navigation based on role
    document.querySelectorAll('.nav-item').forEach(item => {
      const roleReq = item.getAttribute('data-role');
      if (roleReq && user.role !== roleReq) {
        item.style.display = 'none';
      } else {
        item.style.display = 'flex';
      }
    });
  }

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    if (Auth.login(userEl.value, passEl.value)) {
      showToast('Success', 'Logged in successfully', 'success');
      updateAuthState();
      loginForm.reset();
    } else {
      showToast('Error', 'Invalid username or password', 'error');
    }
  });

  logoutBtn?.addEventListener('click', () => {
    Auth.logout();
    updateAuthState();
  });

  updateAuthState();
}

// ============================================================
// NAVIGATION
// ============================================================
async function navigate(page) {
  const user = Auth.getCurrentUser();
  if (!user) return; // Prevent navigation if not logged in

  const targetNav = document.querySelector(`.nav-item[data-page="${page}"]`);
  const reqRole = targetNav?.getAttribute('data-role');
  if (reqRole && user.role !== reqRole) {
    showToast('Access Denied', 'You do not have permission to view this page.', 'error');
    return;
  }

  currentPage = page;

  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update breadcrumb
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    const key = `nav.${page}`;
    pageTitle.textContent = t(key);
    pageTitle.setAttribute('data-i18n', key);
  }

  // Show loading
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="init-loader"><div class="spinner-ring"></div><p>${t('common.loading')}</p></div>`;

  // Load and render module
  try {
    const mod = await modules[page]();
    // Small delay for visual polish
    await new Promise(r => setTimeout(r, 100));
    mod.render(content);
  } catch (err) {
    console.error(`Failed to load module: ${page}`, err);
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="alert-circle"></i></div>
        <h3>Failed to load page</h3>
        <p style="color:var(--red)">${err.message}</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('dashboard')">
          <i data-lucide="home"></i> Go to Dashboard
        </button>
      </div>`;
    lucide.createIcons();
  }

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('mobile-open');
}

window.navigate = navigate;

// ============================================================
// SIDEBAR
// ============================================================
function initSidebar() {
  // Nav item clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) navigate(page);
    });
  });

  // Toggle collapse/expand
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar   = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      // On mobile: toggle mobile-open; on desktop: toggle collapsed
      if (window.innerWidth <= 900) {
        sidebar.classList.toggle('mobile-open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  // Close mobile sidebar on outside click
  document.addEventListener('click', e => {
    if (window.innerWidth <= 900 && sidebar?.classList.contains('mobile-open')) {
      if (!sidebar.contains(e.target) && e.target !== toggleBtn && !toggleBtn?.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
      }
    }
  });
}

// ============================================================
// LANGUAGE SWITCHER
// ============================================================
function initLangSwitcher(initialLang) {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === initialLang);
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      Settings.update({ language: lang });
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Re-render current page with new translations
      navigate(currentPage);
    });
  });
}

// ============================================================
// MODAL
// ============================================================
let modalResolve = null;

function initModal() {
  const overlay  = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close-btn');

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal-overlay')?.classList.contains('hidden')) {
        closeModal();
      }
      if (!document.getElementById('confirm-overlay')?.classList.contains('hidden')) {
        document.getElementById('confirm-overlay')?.classList.add('hidden');
      }
    }
  });
}

export function openModal(title, bodyHtml) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');

  if (titleEl) titleEl.textContent = title;
  if (bodyEl)  bodyEl.innerHTML = bodyHtml;
  overlay?.classList.remove('hidden');
  lucide.createIcons();

  // Focus first input
  setTimeout(() => {
    const firstInput = bodyEl?.querySelector('input:not([type=hidden]),select,textarea');
    firstInput?.focus();
  }, 100);
}

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.add('hidden');
  const bodyEl = document.getElementById('modal-body');
  if (bodyEl) bodyEl.innerHTML = '';
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
let confirmCallback = null;

function initConfirmDialog() {
  const cancelBtn = document.getElementById('confirm-cancel-btn');
  const okBtn     = document.getElementById('confirm-ok-btn');
  const overlay   = document.getElementById('confirm-overlay');

  cancelBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
    confirmCallback = null;
  });

  okBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  overlay?.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      confirmCallback = null;
    }
  });
}

export function showConfirm(title, message, onConfirm) {
  const overlay  = document.getElementById('confirm-overlay');
  const titleEl  = document.getElementById('confirm-title-text');
  const msgEl    = document.getElementById('confirm-msg-text');

  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = message;
  confirmCallback = onConfirm;
  overlay?.classList.remove('hidden');
}

// ============================================================
// TOAST
// ============================================================
export function showToast(title, message = '', type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: 'check-circle',
    error:   'x-circle',
    warning: 'alert-triangle',
    info:    'info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconMap[type] || 'info'}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escHtml(title)}</div>
      ${message ? `<div class="toast-msg">${escHtml(message)}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function initNotifications() {
  const bell = document.getElementById('notification-bell');
  const badge = document.getElementById('notif-badge');

  if (!bell) return;

  let notifPanel = null;

  // Simple synchronous notification check using direct data access
  function checkNotifications() {
    const notifs = [];
    try {
      const PREFIX = 'ghms_';
      function g(k) { try { return JSON.parse(localStorage.getItem(PREFIX+k)||'null'); } catch { return null; } }

      // Low stock
      const resources = g('resources') || [];
      resources.forEach(r => {
        if (parseFloat(r.quantity) <= parseFloat(r.minLevel || 0)) {
          notifs.push({ type: 'warning', icon: 'alert-triangle', message: `Low stock: ${r.name} (${r.quantity} ${r.unit||'units'})` });
        }
      });

      // Pending payments
      const reservations = g('reservations') || [];
      const guests = g('guests') || [];
      const rooms = g('rooms') || [];
      reservations.forEach(r => {
        if ((r.paymentStatus === 'pending' || r.paymentStatus === 'partial') && r.status !== 'cancelled') {
          const guest = guests.find(g => g.id === r.guestId);
          const room = rooms.find(rm => rm.id === r.roomId);
          const bal = (parseFloat(r.totalCost)||0) - (parseFloat(r.paidAmount)||0);
          notifs.push({ type: 'error', icon: 'wallet', message: `Balance due: ${guest?.name||'?'} — Room ${room?.number||'?'} (${bal.toFixed(2)})` });
        }
      });

      // Upcoming check-ins today
      const today = new Date().toISOString().slice(0,10);
      reservations.forEach(r => {
        if (r.checkIn?.slice(0,10) === today && r.status === 'upcoming') {
          const guest = guests.find(g => g.id === r.guestId);
          const room = rooms.find(rm => rm.id === r.roomId);
          notifs.push({ type: 'info', icon: 'log-in', message: `Check-in today: ${guest?.name||'?'} — Room ${room?.number||'?'}` });
        }
      });
    } catch(e) { console.error('Notification check error', e); }
    return notifs;
  }

  function updateBadge() {
    const notifs = checkNotifications();
    if (badge) {
      badge.textContent = notifs.length;
      if (notifs.length > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
    return notifs;
  }

  bell.addEventListener('click', e => {
    e.stopPropagation();
    if (notifPanel) { notifPanel.remove(); notifPanel = null; return; }

    const notifs = updateBadge();
    const colorMap = { warning: 'var(--orange)', error: 'var(--red)', info: 'var(--blue)' };

    notifPanel = document.createElement('div');
    notifPanel.className = 'notif-panel';
    notifPanel.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <h4 style="margin:0;font-size:14px;font-weight:700">Notifications</h4>
        <span style="font-size:11px;color:var(--text-muted)">${notifs.length} alert${notifs.length!==1?'s':''}</span>
      </div>
      <div style="max-height:320px;overflow-y:auto">
        ${notifs.length === 0 ? '<div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px">All caught up! No notifications.</div>' : ''}
        ${notifs.map(n => `
          <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px;cursor:default;transition:background 0.15s" onmouseenter="this.style.background='var(--bg-card-hover)'" onmouseleave="this.style.background='transparent'">
            <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${colorMap[n.type]||'var(--blue)'}22;color:${colorMap[n.type]||'var(--blue)'};flex-shrink:0">
              <i data-lucide="${n.icon}" style="width:15px;height:15px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;color:var(--text-secondary);line-height:1.4">${n.message}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Position the panel
    const rect = bell.getBoundingClientRect();
    notifPanel.style.position = 'fixed';
    notifPanel.style.top = (rect.bottom + 8) + 'px';
    notifPanel.style.right = (window.innerWidth - rect.right) + 'px';
    notifPanel.style.width = '360px';
    document.body.appendChild(notifPanel);
    lucide.createIcons();

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeNotif(e) {
        if (!notifPanel?.contains(e.target) && e.target !== bell) {
          notifPanel?.remove();
          notifPanel = null;
          document.removeEventListener('click', closeNotif);
        }
      });
    }, 10);
  });

  // Update badge periodically
  updateBadge();
  setInterval(updateBadge, 30000); // Check every 30 seconds
}

// ============================================================
// HELPERS
// ============================================================
function applySettingsToUI(settings) {
  // Brand name
  const brandName = document.getElementById('sidebar-house-name');
  if (brandName) brandName.textContent = settings.guestHouseName || 'GuestHouse';

  // Owner info
  const ownerDisplay = document.getElementById('owner-name-display');
  if (ownerDisplay) ownerDisplay.textContent = settings.ownerName || 'Owner';

  const ownerAvatar = document.getElementById('owner-avatar');
  if (ownerAvatar) {
    const name = settings.ownerName || settings.guestHouseName || 'GH';
    ownerAvatar.textContent = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }
}

function updateDateDisplay() {
  const el = document.getElementById('current-date');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
