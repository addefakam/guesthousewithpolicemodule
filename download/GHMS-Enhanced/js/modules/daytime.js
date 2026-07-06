/**
 * daytime.js — Daytime Services Module
 */
import { DaytimeServices, DaytimeBookings } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';
import { Auth } from '../data.js';

let activeTab = 'bookings';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const services = DaytimeServices.getAll();
  const bookings = [...DaytimeBookings.getAll()].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const todayRev = DaytimeBookings.getToday().reduce((s,b) => s + (parseFloat(b.paidAmount)||0), 0);
  const totalRev = bookings.reduce((s,b) => s + (parseFloat(b.paidAmount)||0), 0);

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('day.title')}</h1>
        <p>${t('day.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        <button class="btn btn-secondary" id="manage-services-btn">
          <i data-lucide="settings"></i> Manage Services
        </button>
        <button class="btn btn-primary" id="book-service-btn">
          <i data-lucide="plus"></i> ${t('day.book')}
        </button>
        `}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="list"></i></div>
        <div class="stat-value">${services.length}</div>
        <div class="stat-label">Services Offered</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="calendar-check"></i></div>
        <div class="stat-value">${DaytimeBookings.getToday().length}</div>
        <div class="stat-label">Today's Bookings</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="trending-up"></i></div>
        <div class="stat-value">${formatCurrency(todayRev)}</div>
        <div class="stat-label">Today's Revenue</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="banknote"></i></div>
        <div class="stat-value">${formatCurrency(totalRev)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px">
      <button class="tab-btn ${activeTab==='bookings'?'tab-active':''}" id="tab-bookings">
        <i data-lucide="calendar-check"></i> ${t('day.bookings')}
      </button>
      <button class="tab-btn ${activeTab==='catalogue'?'tab-active':''}" id="tab-catalogue">
        <i data-lucide="list-checks"></i> ${t('day.catalogue')}
      </button>
    </div>

    <!-- Content -->
    <div id="tab-content">
      ${activeTab === 'bookings' ? buildBookingsTab(bookings, services) : buildCatalogueTab(services)}
    </div>
  </div>

  <style>
  .tab-btn {
    display:flex;align-items:center;gap:8px;padding:10px 20px;
    background:none;border:none;color:var(--text-secondary);
    font-size:13px;font-weight:600;border-bottom:2px solid transparent;
    cursor:pointer;transition:var(--ease);margin-bottom:-1px;font-family:var(--font-sans);
  }
  .tab-btn svg{width:15px;height:15px}
  .tab-btn.tab-active{color:var(--gold);border-bottom-color:var(--gold);}
  .tab-btn:hover{color:var(--text-primary);}
  </style>`;
}

function buildBookingsTab(bookings, services) {
  if (bookings.length === 0) return `
    <div class="empty-state">
      <div class="empty-icon"><i data-lucide="calendar-x"></i></div>
      <h3>${t('day.no_bookings')}</h3>
      ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
      <button class="btn btn-primary" style="margin-top:16px" id="book-empty">
        <i data-lucide="plus"></i> ${t('day.book')}
      </button>
      `}
    </div>`;

  return `
  <div class="card">
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Service</th>
            <th>${t('day.date')}</th>
            <th>${t('day.time')}</th>
            <th>Qty</th>
            <th>${t('day.total')}</th>
            <th>Payment</th>
            <th>${t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => {
            const svc = DaytimeServices.getById(b.serviceId);
            const balance = (parseFloat(b.totalCost)||0) - (parseFloat(b.paidAmount)||0);
            return `
            <tr>
              <td>
                <div style="font-weight:600">${escHtml(b.guestName||'Walk-in')}</div>
                <div style="font-size:11px;color:var(--text-muted)">${escHtml(b.guestPhone||'')}</div>
              </td>
              <td>
                <div style="font-weight:600">${escHtml(svc?.name||b.serviceId||'—')}</div>
                <div style="font-size:11px;color:var(--text-muted)">${escHtml(svc?.category||'')}</div>
              </td>
              <td style="font-size:12px">${formatDate(b.date)}</td>
              <td style="font-size:12px">${b.time||'—'}</td>
              <td style="text-align:center">${b.quantity||1}</td>
              <td>
                <div style="font-weight:700;color:var(--gold)">${formatCurrency(b.totalCost)}</div>
                ${balance > 0.01 ? `<div style="font-size:11px;color:var(--red)">Bal: ${formatCurrency(balance)}</div>` : ''}
              </td>
              <td><span class="badge badge-${b.paymentStatus}">${b.paymentStatus}</span></td>
              <td>
                ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
                <div class="actions-cell">
                  <button class="btn btn-sm btn-ghost edit-booking-btn" data-id="${b.id}">
                    <i data-lucide="pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-danger delete-booking-btn" data-id="${b.id}">
                    <i data-lucide="trash-2"></i>
                  </button>
                </div>
                `}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function buildCatalogueTab(services) {
  if (services.length === 0) return `
    <div class="empty-state">
      <div class="empty-icon"><i data-lucide="list-x"></i></div>
      <h3>${t('day.no_services')}</h3>
      ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
      <button class="btn btn-primary" style="margin-top:16px" id="add-service-empty">
        <i data-lucide="plus"></i> ${t('day.add_service')}
      </button>
      `}
    </div>`;

  return `
  <div class="rooms-grid">
    ${services.map(s => `
    <div class="room-card ${s.active ? 'available' : 'maintenance'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <span class="tag">${escHtml(s.category||'General')}</span>
        <span class="badge ${s.active ? 'badge-active' : 'badge-maintenance'}">${s.active ? 'Active' : 'Inactive'}</span>
      </div>
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;color:var(--text-primary)">${escHtml(s.name)}</div>
      ${s.duration ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">⏱ ${escHtml(s.duration)}</div>` : ''}
      ${s.description ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">${escHtml(s.description)}</div>` : ''}
      <div style="font-size:20px;font-weight:800;color:var(--gold);margin-bottom:14px">${formatCurrency(s.price)}</div>
      <div class="room-actions">
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        <button class="btn btn-sm btn-primary book-this-btn" data-id="${s.id}">
          <i data-lucide="plus"></i> Book
        </button>
        <button class="btn btn-sm btn-ghost edit-service-btn" data-id="${s.id}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-service-btn" data-id="${s.id}">
          <i data-lucide="trash-2"></i>
        </button>
        `}
      </div>
    </div>`).join('')}
  </div>
  ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
  <div style="margin-top:16px">
    <button class="btn btn-secondary" id="add-service-btn-cat">
      <i data-lucide="plus"></i> ${t('day.add_service')}
    </button>
  </div>
  `}`;
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'tab-bookings') { activeTab = 'bookings'; render(container); }
    else if (btn.id === 'tab-catalogue') { activeTab = 'catalogue'; render(container); }
    else if (btn.id === 'book-service-btn' || btn.id === 'book-empty') { openBookingForm(container); }
    else if (btn.classList.contains('book-this-btn')) { openBookingForm(container, null, btn.dataset.id); }
    else if (btn.id === 'manage-services-btn') { activeTab = 'catalogue'; render(container); }
    else if (btn.id === 'add-service-empty' || btn.id === 'add-service-btn-cat') { openServiceForm(container); }
    else if (btn.classList.contains('edit-service-btn')) { openServiceForm(container, btn.dataset.id); }
    else if (btn.classList.contains('delete-service-btn')) {
      const svc = DaytimeServices.getById(btn.dataset.id);
      showConfirm(`Delete "${svc?.name}"?`, t('common.delete_confirm'), () => {
        DaytimeServices.delete(btn.dataset.id);
        showToast('Service deleted', '', 'success');
        render(container);
      });
    } else if (btn.classList.contains('edit-booking-btn')) {
      openBookingForm(container, btn.dataset.id);
    } else if (btn.classList.contains('delete-booking-btn')) {
      showConfirm('Delete booking?', t('common.delete_confirm'), () => {
        DaytimeBookings.delete(btn.dataset.id);
        showToast('Booking deleted', '', 'success');
        render(container);
      });
    }
  });
}

function openBookingForm(container, id = null, prefillServiceId = null) {
  const b = id ? DaytimeBookings.getById(id) : null;
  const services = DaytimeServices.getActive();
  const today = new Date().toISOString().slice(0,10);
  const nowTime = new Date().toTimeString().slice(0,5);

  openModal(b ? 'Edit Service Booking' : t('day.book'), `
    <form id="booking-form" class="form-grid">
      <div class="form-group span-2">
        <label>Service *</label>
        <select class="form-select" name="serviceId" id="service-select" required>
          <option value="">— Select Service —</option>
          ${services.map(s => `<option value="${s.id}" data-price="${s.price}"
            ${(b?.serviceId||prefillServiceId)===s.id?'selected':''}>
            ${escHtml(s.name)} — ${formatCurrency(s.price)} (${escHtml(s.duration||'')})
          </option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Guest Name *</label>
        <input class="form-input" name="guestName" value="${b?.guestName||''}" required placeholder="Guest or company name">
      </div>
      <div class="form-group">
        <label>Guest Phone</label>
        <input class="form-input" name="guestPhone" value="${b?.guestPhone||''}" placeholder="Phone number">
      </div>
      <div class="form-group">
        <label>Date *</label>
        <input class="form-input" name="date" type="date" value="${b?.date||today}" required>
      </div>
      <div class="form-group">
        <label>Time</label>
        <input class="form-input" name="time" type="time" value="${b?.time||nowTime}">
      </div>
      <div class="form-group">
        <label>Quantity</label>
        <input class="form-input" name="quantity" type="number" min="1" value="${b?.quantity||1}" id="qty-input">
      </div>
      <div class="form-group">
        <label>Unit Price</label>
        <input class="form-input" name="unitPrice" type="number" min="0" value="${b?.unitPrice||''}" id="unit-price-input" readonly style="opacity:.6">
      </div>
      <div class="form-group span-2">
        <div class="card" style="padding:12px;background:var(--gold-subtle);border-color:var(--border-gold)">
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700">
            <span style="color:var(--gold)">Total Cost</span>
            <span id="booking-total" style="color:var(--gold)">—</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Amount Paid</label>
        <input class="form-input" name="paidAmount" type="number" min="0" value="${b?.paidAmount||0}">
      </div>
      <div class="form-group">
        <label>Payment Method</label>
        <select class="form-select" name="paymentMethod">
          <option value="cash"     ${(!b?.paymentMethod||b?.paymentMethod==='cash')?'selected':''}>Cash</option>
          <option value="transfer" ${b?.paymentMethod==='transfer'?'selected':''}>Bank Transfer</option>
          <option value="card"     ${b?.paymentMethod==='card'?'selected':''}>Card</option>
        </select>
      </div>
      <div class="form-group span-2">
        <label>Notes</label>
        <textarea class="form-textarea" name="notes" placeholder="Any special requirements...">${b?.notes||''}</textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-booking">Cancel</button>
        <button type="submit" class="btn btn-primary">${b ? t('common.save') : 'Book Service'}</button>
      </div>
    </form>
  `);

  function updateTotal() {
    const sel   = document.getElementById('service-select');
    const price = parseFloat(sel?.options[sel?.selectedIndex]?.dataset?.price) || 0;
    const qty   = parseInt(document.getElementById('qty-input')?.value) || 1;
    if (document.getElementById('unit-price-input')) document.getElementById('unit-price-input').value = price;
    if (document.getElementById('booking-total'))    document.getElementById('booking-total').textContent = formatCurrency(price * qty);
  }

  document.getElementById('service-select')?.addEventListener('change', updateTotal);
  document.getElementById('qty-input')?.addEventListener('input', updateTotal);
  updateTotal();

  document.getElementById('cancel-booking')?.addEventListener('click', closeModal);
  document.getElementById('booking-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (b) {
      DaytimeBookings.update(id, data);
      showToast('Booking updated', '', 'success');
    } else {
      DaytimeBookings.add(data);
      showToast('Service booked', `Booking confirmed`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openServiceForm(container, id = null) {
  const s = id ? DaytimeServices.getById(id) : null;
  openModal(s ? t('day.edit_service') : t('day.add_service'), `
    <form id="service-form" class="form-grid">
      <div class="form-group span-2">
        <label>${t('day.service_name')} *</label>
        <input class="form-input" name="name" value="${s?.name||''}" required placeholder="e.g. Conference Room, Laundry...">
      </div>
      <div class="form-group">
        <label>${t('day.category')}</label>
        <input class="form-input" name="category" value="${s?.category||''}" list="categories-list" placeholder="e.g. Facilities">
        <datalist id="categories-list">
          <option value="Facilities"><option value="Laundry"><option value="Meals">
          <option value="Transport"><option value="Wellness"><option value="Business">
        </datalist>
      </div>
      <div class="form-group">
        <label>${t('day.price')} *</label>
        <input class="form-input" name="price" type="number" min="0" value="${s?.price||''}" required placeholder="e.g. 500">
      </div>
      <div class="form-group">
        <label>${t('day.duration')}</label>
        <input class="form-input" name="duration" value="${s?.duration||''}" placeholder="e.g. 1 hour, Per person">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-select" name="active">
          <option value="true"  ${s?.active!==false?'selected':''}>Active</option>
          <option value="false" ${s?.active===false?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-group span-2">
        <label>Description</label>
        <textarea class="form-textarea" name="description" placeholder="Brief description of the service...">${s?.description||''}</textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-service">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-service')?.addEventListener('click', closeModal);
  document.getElementById('service-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.active = data.active === 'true';
    if (s) {
      DaytimeServices.update(id, data);
      showToast('Service updated', '', 'success');
    } else {
      DaytimeServices.add(data);
      showToast('Service added', `${data.name} added to catalogue`, 'success');
    }
    closeModal();
    render(container);
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
