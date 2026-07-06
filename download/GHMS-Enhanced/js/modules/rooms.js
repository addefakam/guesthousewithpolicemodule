/**
 * rooms.js — Room Management Module
 */
import { Rooms, Reservations } from '../data.js';
import { t, formatCurrency } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';

let viewMode = 'grid';
let filterStatus = 'all';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const rooms = getFilteredRooms();
  const stats = Rooms.getStats();

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('room.title')}</h1>
        <p>${t('room.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary icon-btn" id="view-toggle" title="${viewMode === 'grid' ? t('room.view_list') : t('room.view_grid')}">
          <i data-lucide="${viewMode === 'grid' ? 'list' : 'grid-2x2'}"></i>
        </button>
        <button class="btn btn-primary" id="add-room-btn">
          <i data-lucide="plus"></i> ${t('room.add')}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="building-2"></i></div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total Rooms</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="door-open"></i></div>
        <div class="stat-value">${stats.available}</div>
        <div class="stat-label">${t('room.available')}</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="bed-double"></i></div>
        <div class="stat-value">${stats.occupied}</div>
        <div class="stat-label">${t('room.occupied')}</div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon"><i data-lucide="wrench"></i></div>
        <div class="stat-value">${stats.maintenance}</div>
        <div class="stat-label">${t('room.maintenance')}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <button class="filter-btn ${filterStatus==='all'?'active':''}" data-filter="all">${t('room.all')}</button>
      <button class="filter-btn ${filterStatus==='available'?'active':''}" data-filter="available">
        <span class="status-dot dot-green" style="display:inline-block;margin-right:4px"></span>${t('room.available')}
      </button>
      <button class="filter-btn ${filterStatus==='occupied'?'active':''}" data-filter="occupied">
        <span class="status-dot dot-blue" style="display:inline-block;margin-right:4px"></span>${t('room.occupied')}
      </button>
      <button class="filter-btn ${filterStatus==='maintenance'?'active':''}" data-filter="maintenance">
        <span class="status-dot dot-orange" style="display:inline-block;margin-right:4px"></span>${t('room.maintenance')}
      </button>
    </div>

    <!-- Rooms -->
    <div id="rooms-display">
      ${rooms.length === 0
        ? emptyState()
        : (viewMode === 'grid' ? buildGrid(rooms) : buildList(rooms))
      }
    </div>
  </div>`;
}

function getFilteredRooms() {
  const all = Rooms.getAll();
  return filterStatus === 'all' ? all : all.filter(r => r.status === filterStatus);
}

function emptyState() {
  return `
  <div class="empty-state">
    <div class="empty-icon"><i data-lucide="bed-double"></i></div>
    <h3>${t('room.no_rooms')}</h3>
    <p>${t('room.add_first')}</p>
    <button class="btn btn-primary" style="margin-top:16px" id="add-room-empty">
      <i data-lucide="plus"></i> ${t('room.add')}
    </button>
  </div>`;
}

function buildGrid(rooms) {
  return `<div class="rooms-grid">${rooms.map(roomCard).join('')}</div>`;
}

function buildList(rooms) {
  return `
  <div class="card">
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('room.number')}</th>
            <th>${t('room.name')}</th>
            <th>${t('room.type')}</th>
            <th>${t('room.floor')}</th>
            <th>${t('room.capacity')}</th>
            <th>${t('room.price')}</th>
            <th>${t('room.status')}</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${rooms.map(r => `
          <tr>
            <td><strong style="font-size:16px;color:var(--gold)">${escHtml(r.number)}</strong></td>
            <td>${escHtml(r.name)}</td>
            <td><span class="tag">${roomTypeLabel(r.type)}</span></td>
            <td>${escHtml(r.floor) || '—'}</td>
            <td>${escHtml(r.capacity) || '1'}</td>
            <td style="color:var(--gold);font-weight:700">${formatCurrency(r.pricePerNight)}<small style="color:var(--text-muted);font-weight:400">/night</small></td>
            <td><span class="badge badge-${r.status}">${statusLabel(r.status)}</span></td>
            <td>
              <div class="actions-cell">
                <button class="btn btn-sm btn-secondary edit-room-btn" data-id="${r.id}" title="${t('common.edit')}">
                  <i data-lucide="pencil"></i>
                </button>
                <button class="btn btn-sm btn-ghost status-btn" data-id="${r.id}" title="Change Status">
                  <i data-lucide="refresh-cw"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-room-btn" data-id="${r.id}" title="${t('common.delete')}">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function roomCard(r) {
  const activeRes = Reservations.getActive().find(res => res.roomId === r.id);
  const guest     = activeRes ? activeRes : null;
  return `
  <div class="room-card ${r.status}" data-id="${r.id}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div>
        <div class="room-number">${escHtml(r.number)}</div>
        <div class="room-type">${roomTypeLabel(r.type)}${r.floor ? ` · Floor ${r.floor}` : ''}</div>
      </div>
      <span class="badge badge-${r.status}">
        <span class="status-dot ${statusDot(r.status)}"></span>
        ${statusLabel(r.status)}
      </span>
    </div>

    ${r.name ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">${escHtml(r.name)}</div>` : ''}

    ${r.amenities ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">${escHtml(r.amenities)}</div>` : ''}

    <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:14px">
      <span class="room-price">${formatCurrency(r.pricePerNight)}</span>
      <span class="room-price-label">/night</span>
    </div>

    ${r.capacity ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">
      <i data-lucide="users" style="width:12px;height:12px;display:inline"></i> Capacity: ${r.capacity}
    </div>` : ''}

    <div class="room-actions">
      <button class="btn btn-sm btn-secondary edit-room-btn" data-id="${r.id}">
        <i data-lucide="pencil"></i> ${t('common.edit')}
      </button>
      <button class="btn btn-sm btn-ghost status-btn" data-id="${r.id}">
        <i data-lucide="refresh-cw"></i>
      </button>
      <button class="btn btn-sm btn-danger delete-room-btn" data-id="${r.id}">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  </div>`;
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button, [data-filter]');
    if (!btn) return;

    if (btn.id === 'add-room-btn' || btn.id === 'add-room-empty') {
      openRoomForm(container);
    } else if (btn.id === 'view-toggle') {
      viewMode = viewMode === 'grid' ? 'list' : 'grid';
      render(container);
    } else if (btn.classList.contains('edit-room-btn')) {
      openRoomForm(container, btn.dataset.id);
    } else if (btn.classList.contains('delete-room-btn')) {
      const room = Rooms.getById(btn.dataset.id);
      showConfirm(
        `Delete Room ${room?.number}?`,
        t('common.delete_confirm'),
        () => {
          Rooms.delete(btn.dataset.id);
          showToast('Room deleted', '', 'success');
          render(container);
        }
      );
    } else if (btn.classList.contains('status-btn')) {
      openStatusModal(container, btn.dataset.id);
    } else if (btn.dataset.filter) {
      filterStatus = btn.dataset.filter;
      render(container);
    }
  });
}

function openRoomForm(container, id = null) {
  const room = id ? Rooms.getById(id) : null;
  const title = room ? t('room.edit') : t('room.add');

  openModal(title, `
    <form id="room-form" class="form-grid">
      <div class="form-group span-2">
        <label>${t('room.number')} *</label>
        <input class="form-input" name="number" value="${room?.number||''}" required placeholder="e.g. 101">
      </div>
      <div class="form-group">
        <label>${t('room.type')} *</label>
        <select class="form-select" name="type" required>
          <option value="single"  ${room?.type==='single'?'selected':''}>${t('room.single')}</option>
          <option value="double"  ${room?.type==='double'?'selected':''}>${t('room.double')}</option>
          <option value="twin"    ${room?.type==='twin'?'selected':''}>${t('room.twin')}</option>
          <option value="suite"   ${room?.type==='suite'?'selected':''}>${t('room.suite')}</option>
          <option value="deluxe"  ${room?.type==='deluxe'?'selected':''}>${t('room.deluxe')}</option>
        </select>
      </div>
      <div class="form-group">
        <label>${t('room.price')} *</label>
        <input class="form-input" name="pricePerNight" type="number" min="0" value="${room?.pricePerNight||''}" required placeholder="e.g. 1200">
      </div>
      <div class="form-group">
        <label>${t('room.floor')}</label>
        <input class="form-input" name="floor" type="number" min="0" value="${room?.floor||''}" placeholder="e.g. 2">
      </div>
      <div class="form-group">
        <label>${t('room.capacity')}</label>
        <input class="form-input" name="capacity" type="number" min="1" value="${room?.capacity||'1'}" placeholder="1">
      </div>
      <div class="form-group span-2">
        <label>${t('room.amenities')}</label>
        <input class="form-input" name="amenities" value="${room?.amenities||''}" placeholder="e.g. WiFi, TV, AC, Fridge">
        <span class="form-help">Comma-separated list of amenities</span>
      </div>

      <div class="form-group span-2">
        <label>${t('room.description')}</label>
        <textarea class="form-textarea" name="description" placeholder="Brief description...">${room?.description||''}</textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-room">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-room')?.addEventListener('click', closeModal);

  document.getElementById('room-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    if (room) {
      Rooms.update(id, data);
      showToast('Room updated', `Room ${data.number} updated successfully`, 'success');
    } else {
      Rooms.add(data);
      showToast('Room added', `Room ${data.number} added successfully`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openStatusModal(container, id) {
  const room = Rooms.getById(id);
  openModal(`Change Status — Room ${room?.number}`, `
    <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
      <p style="color:var(--text-secondary);margin-bottom:8px">Select new status for Room <strong>${room?.number}</strong>:</p>
      ${['available','occupied','maintenance'].map(s => `
        <button class="btn ${s === room.status ? 'btn-primary' : 'btn-secondary'} status-change-btn" data-status="${s}" style="justify-content:flex-start;gap:12px">
          <span class="status-dot ${statusDot(s)}"></span>
          ${statusLabel(s)}
          ${s === room.status ? ' (current)' : ''}
        </button>
      `).join('')}
    </div>
  `);

  document.querySelectorAll('.status-change-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Rooms.setStatus(id, btn.dataset.status);
      showToast('Status updated', `Room ${room.number} is now ${btn.dataset.status}`, 'info');
      closeModal();
      render(container);
    });
  });
}

// Helpers
function statusLabel(s) {
  const map = { available: t('room.available'), occupied: t('room.occupied'), maintenance: t('room.maintenance') };
  return map[s] || s;
}
function statusDot(s) {
  return { available:'dot-green', occupied:'dot-blue', maintenance:'dot-orange' }[s] || '';
}
function roomTypeLabel(t2) {
  const map = { single:'Single', double:'Double', twin:'Twin', suite:'Suite', deluxe:'Deluxe' };
  return map[t2] || t2;
}
function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
