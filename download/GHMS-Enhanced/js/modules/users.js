/**
 * users.js — User Management Module
 */
import { Users, Auth } from '../data.js';
import { t } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';

let searchQuery = '';

export function render(container) {
  // Check access
  const user = Auth.getCurrentUser();
  if (!user || user.role !== 'superuser') {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="shield-off"></i></div><h3>Access Denied</h3><p>You need superuser privileges to manage users.</p></div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const all = Users.getAll();
  const users = searchQuery ? all.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : all;

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('users.title') || 'User Management'}</h1>
        <p>${t('users.subtitle') || 'Manage system users and access control'}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="add-user-btn">
          <i data-lucide="user-plus"></i> ${t('users.add') || 'Add User'}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="users"></i></div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="shield"></i></div>
        <div class="stat-value">${all.filter(u => u.role === 'superuser').length}</div>
        <div class="stat-label">Superusers</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="user-check"></i></div>
        <div class="stat-value">${all.filter(u => u.role === 'operator').length}</div>
        <div class="stat-label">Operators</div>
      </div>
    </div>

    <!-- Search -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px">
      <div class="search-bar">
        <i data-lucide="search"></i>
        <input class="search-input" id="user-search" placeholder="${t('common.search') || 'Search...'}" value="${escHtml(searchQuery)}">
      </div>
    </div>

    <!-- Users Table -->
    ${users.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="users"></i></div>
           <h3>No users found</h3>
         </div>`
      : `<div class="card">
           <div class="table-wrapper">
             <table class="data-table">
               <thead>
                 <tr>
                   <th>Username</th>
                   <th>Name</th>
                   <th>Role</th>
                   <th>Created</th>
                   <th>${t('common.actions')}</th>
                 </tr>
               </thead>
               <tbody>
                 ${users.map(userRow).join('')}
               </tbody>
             </table>
           </div>
         </div>`
    }
  </div>`;
}

function userRow(u) {
  const currentUser = Auth.getCurrentUser();
  const isSelf = currentUser && currentUser.id === u.id;
  return `
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="guest-avatar">${(u.username||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:600">${escHtml(u.username)}</div>
        </div>
      </div>
    </td>
    <td>${escHtml(u.name || '—')}</td>
    <td><span class="badge badge-${u.role === 'superuser' ? 'active' : 'pending'}">${u.role === 'superuser' ? 'Superuser' : 'Operator'}</span></td>
    <td style="color:var(--text-secondary);font-size:12px">${formatDate(u.createdAt)}</td>
    <td>
      <div class="actions-cell">
        <button class="btn btn-sm btn-ghost edit-user-btn" data-id="${u.id}" title="Edit">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn btn-sm btn-secondary change-pwd-btn" data-id="${u.id}" title="Change Password">
          <i data-lucide="key"></i>
        </button>
        ${!isSelf ? `<button class="btn btn-sm btn-danger delete-user-btn" data-id="${u.id}" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>` : '<span style="font-size:11px;color:var(--text-muted)">(you)</span>'}
      </div>
    </td>
  </tr>`;
}

function bindEvents(container) {
  let searchTimer;
  container.querySelector('#user-search')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { searchQuery = e.target.value.trim(); render(container); }, 250);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'add-user-btn') openUserForm(container);
    else if (btn.classList.contains('edit-user-btn')) openUserForm(container, btn.dataset.id);
    else if (btn.classList.contains('change-pwd-btn')) openPasswordForm(container, btn.dataset.id);
    else if (btn.classList.contains('delete-user-btn')) {
      const u = Users.getById(btn.dataset.id);
      showConfirm(`Delete user "${u?.username}"?`, 'This action cannot be undone.', () => {
        Users.delete(btn.dataset.id);
        showToast('User deleted', '', 'success');
        render(container);
      });
    }
  });
}

function openUserForm(container, id = null) {
  const u = id ? Users.getById(id) : null;
  const title = u ? 'Edit User' : 'Add User';

  openModal(title, `
    <form id="user-form" class="form-grid">
      <div class="form-group">
        <label>Username *</label>
        <input class="form-input" name="username" value="${escHtml(u?.username||'')}" required placeholder="e.g. manager" ${u ? 'readonly style="opacity:0.6"' : ''}>
      </div>
      <div class="form-group">
        <label>Full Name *</label>
        <input class="form-input" name="name" value="${escHtml(u?.name||'')}" required placeholder="Full name">
      </div>
      <div class="form-group">
        <label>Role *</label>
        <select class="form-select" name="role" required>
          <option value="superuser" ${u?.role==='superuser'?'selected':''}>Superuser</option>
          <option value="operator"  ${u?.role==='operator'?'selected':''}>Operator</option>
        </select>
      </div>
      ${!u ? `<div class="form-group">
        <label>Password *</label>
        <input class="form-input" name="password" type="password" required placeholder="Password" minlength="3">
      </div>` : ''}
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-user">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-user')?.addEventListener('click', closeModal);
  document.getElementById('user-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    if (u) {
      Users.update(id, { name: data.name, role: data.role });
      // Update current user if editing self
      const currentUser = Auth.getCurrentUser();
      if (currentUser && currentUser.id === id) {
        Auth.login(data.username, Users.getById(id).password);
      }
      showToast('User updated', '', 'success');
    } else {
      // Check username uniqueness
      if (Users.getByUsername(data.username)) {
        showToast('Error', 'Username already exists', 'error');
        return;
      }
      Users.add(data);
      showToast('User created', `User "${data.username}" added`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openPasswordForm(container, id) {
  const u = Users.getById(id);
  if (!u) return;

  openModal(`Change Password — ${u.username}`, `
    <form id="pwd-form" style="max-width:400px;margin:0 auto">
      <div class="form-group">
        <label>New Password *</label>
        <input class="form-input" name="newPassword" type="password" required placeholder="New password" minlength="3" id="new-pwd-input">
      </div>
      <div class="form-group">
        <label>Confirm Password *</label>
        <input class="form-input" name="confirmPassword" type="password" required placeholder="Confirm password" minlength="3" id="confirm-pwd-input">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-pwd">Cancel</button>
        <button type="submit" class="btn btn-primary">Change Password</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-pwd')?.addEventListener('click', closeModal);
  document.getElementById('pwd-form').addEventListener('submit', e => {
    e.preventDefault();
    const newPwd = document.getElementById('new-pwd-input').value;
    const confirmPwd = document.getElementById('confirm-pwd-input').value;
    if (newPwd !== confirmPwd) {
      showToast('Error', 'Passwords do not match', 'error');
      return;
    }
    Users.update(id, { password: newPwd });
    showToast('Password changed', `Password updated for ${u.username}`, 'success');
    closeModal();
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}