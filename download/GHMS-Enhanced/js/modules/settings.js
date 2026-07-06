/**
 * settings.js — Settings Module
 */
import { Settings, ExpenseCategories, DaytimeServices, Rooms } from '../data.js';
import { t, setLanguage, getLang, formatCurrency } from '../i18n.js';
import { closeModal, showToast, openModal, showConfirm } from '../app.js';

export function render(container) {
  const s = Settings.get();

  container.innerHTML = `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('set.title')}</h1>
        <p>${t('set.subtitle')}</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- General Settings -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="building-2"></i> Guest House Details</h3>
        </div>
        <form id="settings-form">
          <div class="form-grid cols-1">
            <div class="form-group">
              <label>${t('set.house_name')} *</label>
              <input class="form-input" name="guestHouseName" value="${escHtml(s.guestHouseName)}" required placeholder="Your Guest House Name">
            </div>
            <div class="form-group">
              <label>${t('set.owner_name')}</label>
              <input class="form-input" name="ownerName" value="${escHtml(s.ownerName)}" placeholder="Owner name">
            </div>
            <div class="form-group">
              <label>${t('set.address')}</label>
              <input class="form-input" name="address" value="${escHtml(s.address)}" placeholder="Address">
            </div>
            <div class="form-group">
              <label>${t('set.phone')}</label>
              <input class="form-input" name="phone" value="${escHtml(s.phone)}" placeholder="Phone number">
            </div>
            <div class="form-group">
              <label>${t('set.email')}</label>
              <input class="form-input" name="email" type="email" value="${escHtml(s.email)}" placeholder="Email">
            </div>
            <div class="form-group">
              <label>${t('set.currency')}</label>
              <select class="form-select" name="currency">
                <option value="ETB" ${s.currency==='ETB'?'selected':''}>ETB — Ethiopian Birr</option>
                <option value="USD" ${s.currency==='USD'?'selected':''}>USD — US Dollar</option>
                <option value="EUR" ${s.currency==='EUR'?'selected':''}>EUR — Euro</option>
                <option value="GBP" ${s.currency==='GBP'?'selected':''}>GBP — British Pound</option>
                <option value="KES" ${s.currency==='KES'?'selected':''}>KES — Kenyan Shilling</option>
              </select>
            </div>
            <div class="form-group">
              <label>${t('set.language')}</label>
              <select class="form-select" name="language" id="settings-lang">
                <option value="en" ${s.language==='en'?'selected':''}>English</option>
                <option value="am" ${s.language==='am'?'selected':''}>አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              <i data-lucide="save"></i> ${t('set.save')}
            </button>
          </div>
        </form>
      </div>

      <!-- Right Column: Summary + Data Management -->
      <div>
        <!-- Current Summary -->
        <div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="bar-chart-3"></i> System Summary</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${summaryItem('Rooms',         Rooms.getAll().length,              'bed-double',   'var(--blue)')}
            ${summaryItem('Guests',        getCount('guests'),                 'users',        'var(--green)')}
            ${summaryItem('Reservations',  getCount('reservations'),           'calendar-check','var(--gold)')}
            ${summaryItem('Daytime Services', DaytimeServices.getAll().length, 'sun',          'var(--purple)')}
            ${summaryItem('Expenses',      getCount('expenses'),               'receipt',      'var(--red)')}
            ${summaryItem('Inventory Items',getCount('resources'),             'package-2',    'var(--orange)')}
          </div>
        </div>

        <!-- Expense Categories -->
        <div class="card" style="margin-bottom:20px">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="tags"></i> ${t('set.exp_cats')}</h3>
            <button class="btn btn-sm btn-secondary" id="add-expcat-btn">
              <i data-lucide="plus"></i> Add
            </button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${ExpenseCategories.getAll().map(c => `
              <span class="tag" style="padding:6px 12px;font-size:12px;border-color:${c.color||'var(--border)'}44;color:${c.color||'var(--text-secondary)'}">
                <span style="width:6px;height:6px;border-radius:50%;background:${c.color};display:inline-block;margin-right:4px"></span>
                ${escHtml(c.name)}
                ${c.nameAm ? ` / ${escHtml(c.nameAm)}` : ''}
                <button class="del-expcat" data-id="${c.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;margin-left:4px;font-size:14px">×</button>
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Data Management -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="database"></i> Data Management</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-secondary" id="export-data-btn">
              <i data-lucide="download"></i> Export All Data (JSON)
            </button>
            <button class="btn btn-secondary" id="import-data-btn">
              <i data-lucide="upload"></i> Import Data (JSON)
            </button>
            <input type="file" id="import-file" accept=".json" style="display:none">
            <hr class="divider" style="margin:6px 0">
            <button class="btn btn-danger" id="reset-data-btn">
              <i data-lucide="trash-2"></i> Reset All Data
            </button>
            <span class="form-help" style="color:var(--red)">⚠ This will permanently delete all records</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  lucide.createIcons();
  bindEvents(container);
}

function summaryItem(label, count, icon, color) {
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:${color}22;color:${color}">
        <i data-lucide="${icon}" style="width:16px;height:16px"></i>
      </div>
      <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">${label}</span>
    </div>
    <span style="font-size:18px;font-weight:800;color:var(--text-primary)">${count}</span>
  </div>`;
}

function getCount(key) {
  try { return (JSON.parse(localStorage.getItem('ghms_' + key) || '[]')).length; }
  catch { return 0; }
}

function bindEvents(container) {
  // Save settings
  container.querySelector('#settings-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    Settings.save(data);
    setLanguage(data.language);

    // Update sidebar brand
    const brandName = document.getElementById('sidebar-house-name');
    if (brandName) brandName.textContent = data.guestHouseName;
    const ownerDisplay = document.getElementById('owner-name-display');
    if (ownerDisplay) ownerDisplay.textContent = data.ownerName || 'Owner';
    const ownerAvatar = document.getElementById('owner-avatar');
    if (ownerAvatar) ownerAvatar.textContent = (data.ownerName || 'GH').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

    // Update lang buttons
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`lang-${data.language}`)?.classList.add('active');

    showToast('Settings saved', 'Your settings have been updated', 'success');
    render(container);
  });

  // Add expense category
  container.querySelector('#add-expcat-btn')?.addEventListener('click', () => {
    openModal('Add Expense Category', `
      <form id="expcat-form" class="form-grid cols-1">
        <div class="form-group">
          <label>Category Name (English) *</label>
          <input class="form-input" name="name" required placeholder="e.g. Transport">
        </div>
        <div class="form-group">
          <label>Category Name (Amharic)</label>
          <input class="form-input" name="nameAm" placeholder="e.g. ትራንስፖርት">
        </div>
        <div class="form-group">
          <label>Color</label>
          <input class="form-input" name="color" type="color" value="#f5b945">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="cancel-expcat">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Category</button>
        </div>
      </form>
    `);
    document.getElementById('cancel-expcat')?.addEventListener('click', closeModal);
    document.getElementById('expcat-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      ExpenseCategories.add(data);
      showToast('Category added', '', 'success');
      closeModal();
      render(container);
    });
  });

  // Delete expense category
  container.querySelectorAll('.del-expcat').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showConfirm('Delete category?', t('common.delete_confirm'), () => {
        ExpenseCategories.delete(btn.dataset.id);
        showToast('Category removed', '', 'success');
        render(container);
      });
    });
  });

  // Export data
  container.querySelector('#export-data-btn')?.addEventListener('click', () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('ghms_')) {
        data[key] = JSON.parse(localStorage.getItem(key));
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ghms-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported', 'Backup file downloaded', 'success');
  });

  // Import data
  container.querySelector('#import-data-btn')?.addEventListener('click', () => {
    container.querySelector('#import-file')?.click();
  });

  container.querySelector('#import-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([key, val]) => {
          if (key.startsWith('ghms_')) {
            localStorage.setItem(key, JSON.stringify(val));
          }
        });
        showToast('Data imported', 'All data restored from backup', 'success');
        window.location.reload();
      } catch {
        showToast('Import failed', 'Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Reset data
  container.querySelector('#reset-data-btn')?.addEventListener('click', () => {
    showConfirm(
      'Reset All Data?',
      'This will permanently delete ALL guest house data. This cannot be undone!',
      () => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('ghms_')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
        showToast('Data reset', 'All data has been cleared', 'warning');
        setTimeout(() => window.location.reload(), 1000);
      }
    );
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
