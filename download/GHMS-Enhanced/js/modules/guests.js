/**
 * guests.js — Guest Management Module
 */
import { Guests, Reservations, Rooms } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';

let searchQuery = '';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const all     = Guests.getAll();
  const guests  = searchQuery ? Guests.search(searchQuery) : all;

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('guest.title')}</h1>
        <p>${t('guest.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="add-guest-btn">
          <i data-lucide="user-plus"></i> ${t('guest.add')}
        </button>
      </div>
    </div>

    <!-- Search & Stats -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px">
      <div class="search-bar">
        <i data-lucide="search"></i>
        <input class="search-input" id="guest-search" placeholder="${t('common.search')}" value="${escHtml(searchQuery)}">
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:13px;color:var(--text-secondary)">${guests.length} of ${all.length} guests</span>
      </div>
    </div>

    <!-- Guest Table -->
    ${guests.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="users"></i></div>
           <h3>${searchQuery ? t('common.no_data') : t('guest.no_guests')}</h3>
           <p>${searchQuery ? 'Try a different search term' : t('guest.add_first')}</p>
           ${!searchQuery ? `<button class="btn btn-primary" style="margin-top:16px" id="add-guest-empty">
             <i data-lucide="user-plus"></i> ${t('guest.add')}
           </button>` : ''}
         </div>`
      : `<div class="card">
           <div class="table-wrapper">
             <table class="data-table">
               <thead>
                 <tr>
                   <th>${t('guest.name')}</th>
                   <th>${t('guest.phone')}</th>
                   <th>${t('guest.id_number')}</th>
                   <th>${t('guest.nationality')}</th>
                   <th>Total Stays</th>
                   <th>Last Stay</th>
                   <th>${t('common.actions')}</th>
                 </tr>
               </thead>
               <tbody>
                 ${guests.map(guestRow).join('')}
               </tbody>
             </table>
           </div>
         </div>`
    }
  </div>`;
}

function guestRow(g) {
  const stayHistory = Reservations.getAll().filter(r => r.guestId === g.id);
  const lastStay    = stayHistory.sort((a,b) => b.checkIn.localeCompare(a.checkIn))[0];
  return `
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="guest-avatar">${Guests.getInitials(g.name)}</div>
        <div>
          <div style="font-weight:600">${escHtml(g.name)}</div>
          ${g.email ? `<div style="font-size:11px;color:var(--text-muted)">${escHtml(g.email)}</div>` : ''}
        </div>
      </div>
    </td>
    <td>${escHtml(g.phone) || '—'}</td>
    <td>
      ${g.idNumber ? `<span class="tag">${escHtml(g.idNumber)}</span>` : '—'}
    </td>
    <td>${escHtml(g.nationality) || '—'}</td>
    <td>
      <span class="badge badge-gold">${stayHistory.length} stay${stayHistory.length !== 1 ? 's' : ''}</span>
    </td>
    <td style="color:var(--text-secondary);font-size:12px">${lastStay ? formatDate(lastStay.checkIn) : 'Never'}</td>
    <td>
      <div class="actions-cell">
        <button class="btn btn-sm btn-secondary view-guest-btn" data-id="${g.id}" title="View Profile">
          <i data-lucide="eye"></i>
        </button>
        <button class="btn btn-sm btn-ghost edit-guest-btn" data-id="${g.id}" title="${t('common.edit')}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-guest-btn" data-id="${g.id}" title="${t('common.delete')}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </td>
  </tr>`;
}

function bindEvents(container) {
  let searchTimer;
  container.querySelector('#guest-search')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      render(container);
    }, 250);
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'add-guest-btn' || btn.id === 'add-guest-empty') {
      openGuestForm(container);
    } else if (btn.classList.contains('edit-guest-btn')) {
      openGuestForm(container, btn.dataset.id);
    } else if (btn.classList.contains('view-guest-btn')) {
      openGuestProfile(btn.dataset.id);
    } else if (btn.classList.contains('delete-guest-btn')) {
      const g = Guests.getById(btn.dataset.id);
      showConfirm(
        `Delete ${g?.name}?`,
        t('common.delete_confirm'),
        () => {
          Guests.delete(btn.dataset.id);
          showToast('Guest deleted', '', 'success');
          render(container);
        }
      );
    }
  });
}

function openGuestForm(container, id = null) {
  const g = id ? Guests.getById(id) : null;
  openModal(g ? t('guest.edit') : t('guest.add'), `
    <form id="guest-form" class="form-grid">
      <div class="form-group span-2">
        <label>${t('guest.name')} *</label>
        <input class="form-input" name="name" value="${g?.name||''}" required placeholder="Full name">
      </div>
      <div class="form-group">
        <label>${t('guest.phone')} *</label>
        <input class="form-input" name="phone" value="${g?.phone||''}" required placeholder="e.g. 0911234567">
      </div>
      <div class="form-group">
        <label>${t('guest.email')}</label>
        <input class="form-input" name="email" type="email" value="${g?.email||''}" placeholder="email@example.com">
      </div>
      <div class="form-group">
        <label>${t('guest.id_type')}</label>
        <select class="form-select" name="idType">
          <option value="national_id" ${(!g?.idType||g?.idType==='national_id')?'selected':''}>${t('guest.id_national')}</option>
          <option value="passport"    ${g?.idType==='passport'?'selected':''}>${t('guest.id_passport')}</option>
          <option value="driving"     ${g?.idType==='driving'?'selected':''}>${t('guest.id_driving')}</option>
        </select>
      </div>
      <div class="form-group">
        <label>${t('guest.id_number')}</label>
        <input class="form-input" name="idNumber" value="${g?.idNumber||''}" placeholder="ID / Passport number">
      </div>
      <div class="form-group">
        <label>${t('guest.nationality')}</label>
        <input class="form-input" name="nationality" value="${g?.nationality||''}" placeholder="e.g. Ethiopian">
      </div>
      <div class="form-group span-2">
        <label>${t('guest.address')}</label>
        <input class="form-input" name="address" value="${g?.address||''}" placeholder="City, Region">
      </div>
      <div class="form-group span-2">
        <label>${t('guest.notes')}</label>
        <textarea class="form-textarea" name="notes" placeholder="Any special notes...">${g?.notes||''}</textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-guest">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-guest')?.addEventListener('click', closeModal);
  document.getElementById('guest-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (g) {
      Guests.update(id, data);
      showToast('Guest updated', `${data.name} updated successfully`, 'success');
    } else {
      Guests.add(data);
      showToast('Guest registered', `${data.name} registered successfully`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openGuestProfile(id) {
  const g = Guests.getById(id);
  if (!g) return;
  const reservations = Reservations.getAll()
    .filter(r => r.guestId === id)
    .sort((a,b) => b.checkIn.localeCompare(a.checkIn));
  const totalSpent = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((s,r) => s + (parseFloat(r.paidAmount)||0), 0);

  openModal(`${g.name} — Profile`, `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <div class="guest-avatar" style="width:60px;height:60px;font-size:20px">${Guests.getInitials(g.name)}</div>
      <div>
        <h3 style="font-size:18px;font-weight:700;margin-bottom:4px">${escHtml(g.name)}</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${g.phone ? `<span class="tag"><i data-lucide="phone" style="width:12px;height:12px;display:inline"></i> ${escHtml(g.phone)}</span>` : ''}
          ${g.email ? `<span class="tag"><i data-lucide="mail" style="width:12px;height:12px;display:inline"></i> ${escHtml(g.email)}</span>` : ''}
          ${g.nationality ? `<span class="tag">${escHtml(g.nationality)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="form-grid" style="margin-bottom:20px">
      <div class="stat-card stat-gold" style="padding:14px">
        <div style="font-size:11px;color:var(--text-muted)">Total Stays</div>
        <div style="font-size:22px;font-weight:800;color:var(--gold)">${reservations.length}</div>
      </div>
      <div class="stat-card stat-green" style="padding:14px">
        <div style="font-size:11px;color:var(--text-muted)">Total Spent</div>
        <div style="font-size:18px;font-weight:800;color:var(--green)">${formatCurrency(totalSpent)}</div>
      </div>
    </div>

    ${g.idNumber ? `<div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
      <strong>ID:</strong> ${escHtml(g.idNumber)} (${escHtml(g.idType || 'national_id')})
    </div>` : ''}
    ${g.address ? `<div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">
      <strong>Address:</strong> ${escHtml(g.address)}
    </div>` : ''}

    <h4 style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">${t('guest.history')}</h4>
    ${reservations.length === 0
      ? '<p style="color:var(--text-muted);font-size:13px">No reservations yet</p>'
      : `<div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Room</th><th>Check-in</th><th>Check-out</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              ${reservations.map(r => {
                const room = Rooms.getById(r.roomId);
                return `<tr>
                  <td>Room ${escHtml(room?.number||'?')}</td>
                  <td>${formatDate(r.checkIn)}</td>
                  <td>${formatDate(r.checkOut)}</td>
                  <td style="color:var(--gold)">${formatCurrency(r.totalCost)}</td>
                  <td><span class="badge badge-${r.status}">${r.status}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`
    }
  `);
  lucide.createIcons();
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
