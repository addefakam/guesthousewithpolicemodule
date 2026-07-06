/**
 * reservations.js — Reservation Management Module
 */
import { Reservations, Guests, Rooms, Auth } from '../data.js';
import { t, formatCurrency, formatDate, formatDateTime } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';

let filterStatus = 'all';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const all      = Reservations.getAll();
  const filtered = filterStatus === 'all' ? all : all.filter(r => r.status === filterStatus);
  const sorted   = [...filtered].sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  const active    = all.filter(r => r.status === 'active').length;
  const upcoming  = all.filter(r => r.status === 'upcoming').length;
  const completed = all.filter(r => r.status === 'completed').length;

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('res.title')}</h1>
        <p>${t('res.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        <button class="btn btn-primary" id="add-res-btn">
          <i data-lucide="plus"></i> ${t('res.add')}
        </button>
        `}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="calendar"></i></div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-label">All Reservations</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="user-check"></i></div>
        <div class="stat-value">${active}</div>
        <div class="stat-label">${t('res.active')}</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="clock"></i></div>
        <div class="stat-value">${upcoming}</div>
        <div class="stat-label">${t('res.upcoming')}</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="check-circle"></i></div>
        <div class="stat-value">${completed}</div>
        <div class="stat-label">${t('res.completed')}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      ${['all','upcoming','active','completed','cancelled'].map(s => `
        <button class="filter-btn ${filterStatus===s?'active':''}" data-filter="${s}">
          ${s === 'all' ? t('common.all') : t('res.' + s)}
        </button>
      `).join('')}
    </div>

    <!-- Table -->
    ${sorted.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="calendar-x"></i></div>
           <h3>${t('res.no_res')}</h3>
           ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
           <button class="btn btn-primary" style="margin-top:16px" id="add-res-empty">
             <i data-lucide="plus"></i> ${t('res.add')}
           </button>
           `}
         </div>`
      : `<div class="card">
           <div class="table-wrapper">
             <table class="data-table">
               <thead>
                 <tr>
                   <th>${t('res.guest')}</th>
                   <th>${t('res.room')}</th>
                   <th>${t('res.checkin')}</th>
                   <th>${t('res.checkout')}</th>
                   <th>${t('res.nights')}</th>
                   <th>${t('res.total')}</th>
                   <th>Payment</th>
                   <th>${t('res.status')}</th>
                   <th>${t('common.actions')}</th>
                 </tr>
               </thead>
               <tbody>
                 ${sorted.map(resRow).join('')}
               </tbody>
             </table>
           </div>
         </div>`
    }
  </div>`;
}

function resRow(r) {
  const guest = Guests.getById(r.guestId);
  const room  = Rooms.getById(r.roomId);
  const balance = (parseFloat(r.totalCost)||0) - (parseFloat(r.paidAmount)||0);

  return `
  <tr>
    <td>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="guest-avatar" style="width:30px;height:30px;font-size:11px">${Guests.getInitials(guest?.name)}</div>
        <div>
          <div style="font-weight:600">${escHtml(guest?.name||'Unknown Guest')}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escHtml(guest?.phone||'')}</div>
        </div>
      </div>
    </td>
    <td>
      <strong>Room ${escHtml(room?.number||'?')}</strong>
      <div style="font-size:11px;color:var(--text-muted)">${escHtml(room?.type||'')}</div>
    </td>
    <td style="font-size:12.5px">${formatDate(r.checkIn)}</td>
    <td style="font-size:12.5px">${formatDate(r.checkOut)}</td>
    <td style="text-align:center"><span class="badge badge-gold">${r.nights}n</span></td>
    <td>
      <div style="font-weight:700;color:var(--gold)">${formatCurrency(r.totalCost)}</div>
      ${balance > 0.01 ? `<div style="font-size:11px;color:var(--red)">Bal: ${formatCurrency(balance)}</div>` : ''}
    </td>
    <td><span class="badge badge-${r.paymentStatus}">${r.paymentStatus}</span></td>
    <td><span class="badge badge-${r.status}">${r.status}</span></td>
    <td>
      <div class="actions-cell">
        <button class="btn btn-sm btn-ghost view-res-btn" data-id="${r.id}" title="View Receipt">
          <i data-lucide="eye"></i>
        </button>
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        ${r.status === 'upcoming' ? `<button class="btn btn-sm btn-success checkin-btn" data-id="${r.id}" title="${t('res.checkin')}">
          <i data-lucide="log-in"></i>
        </button>` : ''}
        ${r.status === 'active' ? `<button class="btn btn-sm btn-secondary checkout-btn" data-id="${r.id}" title="${t('res.checkout')}">
          <i data-lucide="log-out"></i>
        </button>` : ''}
        <button class="btn btn-sm btn-ghost edit-res-btn" data-id="${r.id}" title="${t('common.edit')}">
          <i data-lucide="pencil"></i>
        </button>
        ${r.status !== 'completed' && r.status !== 'cancelled'
          ? `<button class="btn btn-sm btn-danger cancel-res-btn" data-id="${r.id}" title="${t('res.cancel')}">
               <i data-lucide="x-circle"></i>
             </button>` : ''}
        `}
      </div>
    </td>
  </tr>`;
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button, [data-filter]');
    if (!btn) return;

    if (btn.id === 'add-res-btn' || btn.id === 'add-res-empty') {
      openReservationForm(container);
    } else if (btn.dataset.filter) {
      filterStatus = btn.dataset.filter;
      render(container);
    } else if (btn.classList.contains('checkin-btn')) {
      const r = Reservations.getById(btn.dataset.id);
      showConfirm(t('res.do_checkin'), `Check-in guest to Room ${Rooms.getById(r?.roomId)?.number}?`, () => {
        Reservations.checkIn(btn.dataset.id);
        showToast('Checked In', 'Guest successfully checked in', 'success');
        render(container);
      });
    } else if (btn.classList.contains('checkout-btn')) {
      const r = Reservations.getById(btn.dataset.id);
      showConfirm(t('res.do_checkout'), `Check-out guest from Room ${Rooms.getById(r?.roomId)?.number}?`, () => {
        Reservations.checkOut(btn.dataset.id);
        showToast('Checked Out', 'Guest successfully checked out', 'success');
        render(container);
      });
    } else if (btn.classList.contains('view-res-btn')) {
      openReceipt(btn.dataset.id);
    } else if (btn.classList.contains('edit-res-btn')) {
      openReservationForm(container, btn.dataset.id);
    } else if (btn.classList.contains('cancel-res-btn')) {
      showConfirm(t('res.cancel'), t('common.delete_confirm'), () => {
        Reservations.cancel(btn.dataset.id);
        showToast('Reservation cancelled', '', 'warning');
        render(container);
      });
    }
  });
}

function openReservationForm(container, id = null) {
  const r = id ? Reservations.getById(id) : null;
  const guest = r ? Guests.getById(r.guestId) : null;
  const rooms  = Rooms.getAll();
  const today  = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);

  const availableRooms = rooms.filter(rm => rm.status === 'available' || (r && rm.id === r.roomId));

  openModal(r ? 'Edit Reservation' : t('res.add'), `
    <div style="display:flex;gap:24px;align-items:flex-start;">
      <div style="flex:1">
        <form id="res-form" class="form-grid">
      <div class="form-group">
        <label>Guest Name *</label>
        <input class="form-input" name="guestName" value="${guest?.name||''}" required placeholder="e.g. Abebe Kebede">
      </div>
      <div class="form-group">
        <label>Guest Phone *</label>
        <input class="form-input" name="guestPhone" value="${guest?.phone||''}" required placeholder="e.g. 0911234567">
      </div>
      <div class="form-group span-2">
        <label>${t('res.room')} *</label>
        <select class="form-select" name="roomId" id="room-select" required>
          <option value="">${t('res.select_room')}</option>
          ${availableRooms.map(rm => `<option value="${rm.id}" ${r?.roomId===rm.id?'selected':''}
              data-price="${rm.pricePerNight}" data-type="${rm.type}" data-capacity="${rm.capacity||1}">
              Room ${escHtml(rm.number)}
            </option>`).join('')}
        </select>
        <div id="room-details-auto-fill" style="margin-top:8px;font-size:12px;color:var(--text-secondary);display:none;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border)">
           <div id="rd-type" style="text-transform:capitalize">Type: -</div>
           <div id="rd-price">Price: -</div>
           <div id="rd-capacity">Capacity: -</div>
        </div>
      </div>
      <div class="form-group">
        <label>${t('res.checkin')} *</label>
        <input class="form-input" name="checkIn" type="date" value="${r?.checkIn||today}" required id="checkin-date">
      </div>
      <div class="form-group">
        <label>${t('res.checkout')} *</label>
        <input class="form-input" name="checkOut" type="date" value="${r?.checkOut||tomorrow}" required id="checkout-date">
      </div>
      <!-- Auto-calculated summary -->
      <div class="form-group span-2">
        <div id="cost-summary" class="card" style="padding:14px;background:var(--gold-subtle);border-color:var(--border-gold)">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <span style="color:var(--text-secondary)">Nights × Rate</span>
            <span id="cost-detail" style="font-weight:600">— × — = —</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800">
            <span style="color:var(--gold)">Total Cost</span>
            <span id="total-cost" style="color:var(--gold)">—</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>${t('res.paid')} *</label>
        <input class="form-input" name="paidAmount" type="number" min="0" value="${r?.paidAmount||0}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>${t('res.payment_method')}</label>
        <select class="form-select" name="paymentMethod">
          <option value="cash"     ${(!r?.paymentMethod||r?.paymentMethod==='cash')?'selected':''}>${t('res.cash')}</option>
          <option value="transfer" ${r?.paymentMethod==='transfer'?'selected':''}>${t('res.transfer')}</option>
          <option value="card"     ${r?.paymentMethod==='card'?'selected':''}>${t('res.card')}</option>
        </select>
      </div>
      <div class="form-group span-2">
        <label>${t('res.notes')}</label>
        <textarea class="form-textarea" name="notes" placeholder="Special requests, notes...">${r?.notes||''}</textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-res">Cancel</button>
        <button type="submit" class="btn btn-primary">${r ? t('common.save') : 'Create Reservation'}</button>
      </div>
    </form>
    </div>
    <!-- Right side free rooms list -->
    <div style="width:240px;border-left:1px solid var(--border);padding-left:24px;max-height:550px;display:flex;flex-direction:column">
      <h4 style="margin-top:0;margin-bottom:10px;font-size:14px;color:var(--text-secondary)">Available Rooms</h4>
      <input type="text" id="free-room-search" class="form-input" placeholder="Search room (e.g. 101, twin)" style="margin-bottom:12px;font-size:13px;padding:8px 10px;">
      <div style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;padding-right:4px;">
        ${availableRooms.length === 0 ? '<div style="font-size:12px;color:var(--text-muted)">No free rooms</div>' : ''}
        ${availableRooms.map(rm => `
          <div class="card free-room-item" data-id="${rm.id}" data-search="${escHtml(rm.number)} ${rm.type}" style="padding:12px;cursor:pointer;transition:all 0.2s;border:1px solid ${r?.roomId === rm.id ? 'var(--gold)' : 'var(--border)'}">
            <div style="font-weight:600;font-size:14px;color:var(--gold)">Room ${escHtml(rm.number)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${rm.type} · ${rm.capacity} person(s)</div>
            <div style="font-size:12px;font-weight:700;margin-top:6px;color:var(--green)">${formatCurrency(rm.pricePerNight)}/night</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  `);

  // Dynamic cost calculation
  function updateCost() {
    const roomSel = document.getElementById('room-select');
    const ci = document.getElementById('checkin-date')?.value;
    const co = document.getElementById('checkout-date')?.value;
    const selectedOption = roomSel?.options[roomSel?.selectedIndex];
    const price = parseFloat(selectedOption?.dataset?.price) || 0;
    const nights = ci && co ? Reservations.calcNights(ci, co) : 0;
    const total  = nights * price;
    if (document.getElementById('cost-detail')) {
      document.getElementById('cost-detail').textContent = `${nights} nights × ${formatCurrency(price)}`;
      document.getElementById('total-cost').textContent  = formatCurrency(total);
    }
    
    const autoFill = document.getElementById('room-details-auto-fill');
    if (autoFill) {
      if (selectedOption && selectedOption.value) {
        autoFill.style.display = 'block';
        document.getElementById('rd-type').textContent = `Type: ${selectedOption.dataset.type}`;
        document.getElementById('rd-price').textContent = `Rate: ${formatCurrency(price)} / night`;
        document.getElementById('rd-capacity').textContent = `Capacity: ${selectedOption.dataset.capacity} person(s)`;
      } else {
        autoFill.style.display = 'none';
      }
    }
  }

  document.getElementById('room-select')?.addEventListener('change', updateCost);
  document.getElementById('checkin-date')?.addEventListener('change', updateCost);
  document.getElementById('checkout-date')?.addEventListener('change', updateCost);
  updateCost();

  document.querySelectorAll('.free-room-item').forEach(item => {
    item.addEventListener('click', () => {
      const roomSelect = document.getElementById('room-select');
      if (roomSelect) {
        roomSelect.value = item.dataset.id;
        roomSelect.dispatchEvent(new Event('change'));
        document.querySelectorAll('.free-room-item').forEach(el => el.style.borderColor = 'var(--border)');
        item.style.borderColor = 'var(--gold)';
      }
    });
  });

  document.getElementById('free-room-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.free-room-item').forEach(item => {
      if (item.dataset.search.toLowerCase().includes(q)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  });

  document.getElementById('cancel-res')?.addEventListener('click', closeModal);

  document.getElementById('res-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (new Date(data.checkOut) <= new Date(data.checkIn)) {
      showToast('Date Error', 'Check-out must be after check-in', 'error');
      return;
    }

    // Overlap check
    const existing = Reservations.getAll().filter(res => res.roomId === data.roomId && res.status !== 'cancelled' && res.id !== id);
    const ci = new Date(data.checkIn);
    const co = new Date(data.checkOut);
    const hasOverlap = existing.some(res => {
      const resCi = new Date(res.checkIn);
      const resCo = new Date(res.checkOut);
      return ci < resCo && co > resCi;
    });
    
    if (hasOverlap) {
      showToast('Room Unavailable', 'The room is already booked for these dates.', 'error');
      return;
    }

    // Process inline guest registration
    let guestId = r?.guestId;
    if (!guestId) {
      // Find guest by phone or name, or create
      let g = Guests.getAll().find(g => g.phone === data.guestPhone || g.name === data.guestName);
      if (!g) {
        g = Guests.add({ name: data.guestName, phone: data.guestPhone });
      } else {
        Guests.update(g.id, { name: data.guestName, phone: data.guestPhone });
      }
      guestId = g.id;
    } else {
      Guests.update(guestId, { name: data.guestName, phone: data.guestPhone });
    }
    
    data.guestId = guestId;
    delete data.guestName;
    delete data.guestPhone;

    if (r) {
      Reservations.update(id, data);
      showToast('Reservation updated', '', 'success');
    } else {
      const newRes = Reservations.add(data);
      showToast('Reservation created', `Room ${Rooms.getById(data.roomId)?.number} reserved`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openReceipt(id) {
  const r     = Reservations.getById(id);
  if (!r) return;
  const guest = Guests.getById(r.guestId);
  const room  = Rooms.getById(r.roomId);
  const balance = (parseFloat(r.totalCost)||0) - (parseFloat(r.paidAmount)||0);
  const settings = JSON.parse(localStorage.getItem('ghms_settings') || '{}');

  openModal('Reservation Receipt', `
    <div class="receipt-section" id="receipt-content">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="font-size:24px;margin-bottom:4px">🏡</div>
        <h2 style="font-family:var(--font-serif);font-size:18px;color:var(--gold)">${escHtml(settings.guestHouseName||'Guest House')}</h2>
        <p style="font-size:12px;color:var(--text-muted)">${escHtml(settings.address||'')} | ${escHtml(settings.phone||'')}</p>
      </div>

      <div style="margin-bottom:20px">
        <div class="receipt-row"><span style="color:var(--text-muted)">Receipt #</span><span>${escHtml(r.id.slice(-8).toUpperCase())}</span></div>
        <div class="receipt-row"><span style="color:var(--text-muted)">Date Issued</span><span>${formatDate(r.createdAt)}</span></div>
      </div>

      <div style="margin-bottom:20px;padding:14px;background:var(--gold-subtle);border:1px solid var(--border-gold);border-radius:var(--radius-md)">
        <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:8px">Guest Details</h4>
        <div style="font-weight:700;font-size:15px">${escHtml(guest?.name||'—')}</div>
        <div style="font-size:12px;color:var(--text-secondary)">${escHtml(guest?.phone||'')} ${guest?.idNumber ? '| ID: '+escHtml(guest.idNumber) : ''}</div>
      </div>

      <div style="margin-bottom:20px">
        <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:12px">Reservation Details</h4>
        <div class="receipt-row"><span>Room</span><span>Room ${escHtml(room?.number||'?')} — ${escHtml(room?.name||room?.type||'')}</span></div>
        <div class="receipt-row"><span>Check-in</span><span>${formatDate(r.checkIn)}</span></div>
        <div class="receipt-row"><span>Check-out</span><span>${formatDate(r.checkOut)}</span></div>
        <div class="receipt-row"><span>Nights</span><span>${r.nights}</span></div>
        <div class="receipt-row"><span>Rate per Night</span><span>${formatCurrency(r.roomRate)}</span></div>
      </div>

      <div style="border-top:1px solid var(--border);padding-top:12px">
        <div class="receipt-row"><span>Subtotal</span><span>${formatCurrency(r.totalCost)}</span></div>
        <div class="receipt-row"><span>Amount Paid</span><span style="color:var(--green)">${formatCurrency(r.paidAmount||0)}</span></div>
        ${balance > 0.01 ? `<div class="receipt-row"><span style="color:var(--red)">Balance Due</span><span style="color:var(--red)">${formatCurrency(balance)}</span></div>` : ''}
        <div class="receipt-row total"><span>TOTAL</span><span>${formatCurrency(r.totalCost)}</span></div>
      </div>

      <div style="margin-top:16px;display:flex;gap:8px;align-items:center;font-size:12px">
        <span>Status:</span>
        <span class="badge badge-${r.paymentStatus}">${r.paymentStatus}</span>
        <span>Payment:</span>
        <span class="tag">${r.paymentMethod||'cash'}</span>
      </div>

      ${r.notes ? `<div style="margin-top:14px;font-size:12px;color:var(--text-secondary);padding-top:12px;border-top:1px solid var(--border)">
        <strong>Notes:</strong> ${escHtml(r.notes)}
      </div>` : ''}

      <div style="text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);padding-top:16px;border-top:1px solid var(--border)">
        Thank you for staying with us! | አመሰግናለን!
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="close-receipt">Close</button>
      <button class="btn btn-primary" id="print-receipt">
        <i data-lucide="printer"></i> Print
      </button>
    </div>
  `);

  lucide.createIcons();
  document.getElementById('close-receipt')?.addEventListener('click', closeModal);
  document.getElementById('print-receipt')?.addEventListener('click', () => window.print());
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
