/**
 * calendar.js — Room Calendar View Module
 */
import { Rooms, Reservations, Guests } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal } from '../app.js';

let weekOffset = 0;

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function getWeekDays(offset) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() + offset * 7);
  // Align to Monday
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function getRoomStatusForDate(room, date) {
  const dateStr = date.toISOString().slice(0, 10);
  
  // Check room maintenance status
  if (room.status === 'maintenance') return { status: 'maintenance' };

  // Find active/upcoming reservations for this room that overlap this date
  const reservations = Reservations.getAll().filter(r => {
    if (r.roomId !== room.id) return false;
    if (r.status === 'cancelled') return false;
    const ci = new Date(r.checkIn);
    const co = new Date(r.checkOut);
    const check = new Date(dateStr);
    ci.setHours(0, 0, 0, 0);
    co.setHours(0, 0, 0, 0);
    return check >= ci && check < co;
  });

  if (reservations.length > 0) {
    const res = reservations[0];
    const guest = Guests.getById(res.guestId);
    return {
      status: res.status === 'active' ? 'occupied' : 'upcoming',
      reservation: res,
      guest: guest
    };
  }

  return { status: 'available' };
}

function buildPage() {
  const rooms = Rooms.getAll();
  const days = getWeekDays(weekOffset);
  const today = new Date().toISOString().slice(0, 10);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekStart = days[0];
  const weekEnd = days[6];
  const monthLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('cal.title') || 'Room Calendar'}</h1>
        <p>${t('cal.subtitle') || 'Visual room availability overview'}</p>
      </div>
      <div class="page-header-actions">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-ghost" id="cal-prev-week" title="Previous Week">
            <i data-lucide="chevron-left"></i>
          </button>
          <span style="font-size:14px;font-weight:600;color:var(--text-secondary);min-width:180px;text-align:center">${monthLabel}</span>
          <button class="btn btn-ghost" id="cal-next-week" title="Next Week">
            <i data-lucide="chevron-right"></i>
          </button>
          <button class="btn btn-ghost" id="cal-today" title="Go to Today">
            <i data-lucide="calendar"></i> Today
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)">
        <span style="width:14px;height:14px;border-radius:4px;background:var(--green-dim);border:1px solid var(--green)"></span> Available
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)">
        <span style="width:14px;height:14px;border-radius:4px;background:var(--blue-dim);border:1px solid var(--blue)"></span> Occupied
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)">
        <span style="width:14px;height:14px;border-radius:4px;background:var(--gold-subtle);border:1px solid var(--gold)"></span> Upcoming
      </div>
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)">
        <span style="width:14px;height:14px;border-radius:4px;background:var(--orange-dim);border:1px solid var(--orange)"></span> Maintenance
      </div>
    </div>

    <!-- Calendar Grid -->
    ${rooms.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="calendar-x"></i></div>
           <h3>No rooms to display</h3>
           <p>Add rooms first to see the calendar</p>
         </div>`
      : `<div class="card" style="overflow-x:auto">
           <table class="data-table" style="min-width:800px">
             <thead>
               <tr>
                 <th style="min-width:120px;position:sticky;left:0;background:var(--bg-elevated);z-index:1">Room</th>
                 ${days.map(d => {
                   const isToday = d.toISOString().slice(0, 10) === today;
                   const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                   return `<th style="min-width:110px;text-align:center;${isToday ? 'color:var(--gold);font-weight:700' : ''}">
                     <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted)">${dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                     <div style="font-size:15px;font-weight:700">${d.getDate()}</div>
                   </th>`;
                 }).join('')}
               </tr>
             </thead>
             <tbody>
               ${rooms.map(room => `
               <tr>
                 <td style="position:sticky;left:0;background:var(--bg-elevated);z-index:1">
                   <div style="font-weight:700;color:var(--gold);font-size:14px">Room ${escHtml(room.number)}</div>
                   <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize">${room.type}</div>
                   <div style="font-size:11px;color:var(--text-muted)">${formatCurrency(room.pricePerNight)}/n</div>
                 </td>
                 ${days.map(d => {
                   const info = getRoomStatusForDate(room, d);
                   const isToday = d.toISOString().slice(0, 10) === today;
                   return buildCell(info, room, d, isToday);
                 }).join('')}
               </tr>`).join('')}
             </tbody>
           </table>
         </div>`
    }
  </div>`;
}

function buildCell(info, room, date, isToday) {
  const dateStr = date.toISOString().slice(0, 10);
  const bgMap = {
    available: 'var(--green-dim)',
    occupied: 'var(--blue-dim)',
    upcoming: 'var(--gold-subtle)',
    maintenance: 'var(--orange-dim)'
  };
  const borderMap = {
    available: 'var(--green)',
    occupied: 'var(--blue)',
    upcoming: 'var(--gold)',
    maintenance: 'var(--orange)'
  };

  return `
  <td style="text-align:center;padding:4px;${isToday ? 'background:rgba(245,185,69,0.04)' : ''}">
    <div class="cal-cell ${info.reservation ? 'cal-clickable' : ''}"
         style="background:${bgMap[info.status]};border:1px solid ${borderMap[info.status]}33;border-radius:var(--radius-xs);padding:8px 4px;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;${info.reservation ? 'cursor:pointer;transition:all 0.15s' : ''}"
         ${info.reservation ? `data-res-id="${info.reservation.id}"` : ''}>
      ${info.status === 'occupied' && info.guest
        ? `<div style="font-size:10px;font-weight:600;color:var(--blue);line-height:1.2">${escHtml(info.guest.name.split(' ')[0])}</div>
           <div style="font-size:9px;color:var(--text-muted)">Occupied</div>`
        : info.status === 'upcoming' && info.guest
        ? `<div style="font-size:10px;font-weight:600;color:var(--gold);line-height:1.2">${escHtml(info.guest.name.split(' ')[0])}</div>
           <div style="font-size:9px;color:var(--text-muted)">Upcoming</div>`
        : info.status === 'maintenance'
        ? `<div style="font-size:10px;font-weight:600;color:var(--orange)">Maint.</div>`
        : `<div style="font-size:10px;color:var(--green)">Free</div>`
      }
    </div>
  </td>`;
}

function bindEvents(container) {
  container.querySelector('#cal-prev-week')?.addEventListener('click', () => { weekOffset--; render(container); });
  container.querySelector('#cal-next-week')?.addEventListener('click', () => { weekOffset++; render(container); });
  container.querySelector('#cal-today')?.addEventListener('click', () => { weekOffset = 0; render(container); });

  container.addEventListener('click', e => {
    const cell = e.target.closest('.cal-clickable');
    if (!cell) return;
    const resId = cell.dataset.resId;
    if (!resId) return;

    const res = Reservations.getById(resId);
    if (!res) return;
    const guest = Guests.getById(res.guestId);
    const room = Rooms.getById(res.roomId);
    const balance = (parseFloat(res.totalCost) || 0) - (parseFloat(res.paidAmount) || 0);

    openModal('Reservation Details', `
      <div class="form-grid" style="gap:12px">
        <div class="stat-card stat-blue" style="padding:14px">
          <div style="font-size:11px;color:var(--text-muted)">Guest</div>
          <div style="font-size:16px;font-weight:700">${escHtml(guest?.name || '?')}</div>
          <div style="font-size:12px;color:var(--text-muted)">${escHtml(guest?.phone || '')}</div>
        </div>
        <div class="stat-card stat-gold" style="padding:14px">
          <div style="font-size:11px;color:var(--text-muted)">Room</div>
          <div style="font-size:16px;font-weight:700;color:var(--gold)">Room ${escHtml(room?.number || '?')}</div>
          <div style="font-size:12px;color:var(--text-muted);text-transform:capitalize">${room?.type || ''}</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div class="receipt-row"><span>Check-in</span><span>${formatDate(res.checkIn)}</span></div>
        <div class="receipt-row"><span>Check-out</span><span>${formatDate(res.checkOut)}</span></div>
        <div class="receipt-row"><span>Nights</span><span>${res.nights}</span></div>
        <div class="receipt-row"><span>Total Cost</span><span style="color:var(--gold)">${formatCurrency(res.totalCost)}</span></div>
        <div class="receipt-row"><span>Paid</span><span style="color:var(--green)">${formatCurrency(res.paidAmount || 0)}</span></div>
        ${balance > 0.01 ? `<div class="receipt-row"><span>Balance</span><span style="color:var(--red)">${formatCurrency(balance)}</span></div>` : ''}
        <div class="receipt-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
          <span>Status</span><span><span class="badge badge-${res.status}">${res.status}</span></span>
        </div>
      </div>
    `);
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}