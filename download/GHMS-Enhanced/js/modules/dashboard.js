/**
 * dashboard.js — Dashboard Module
 */
import { Rooms, Guests, Reservations, DaytimeBookings, Expenses, Activity } from '../data.js';
import { t, formatCurrency, formatDateTime } from '../i18n.js';
import { openModal } from '../app.js';

export function render(container) {
  const roomStats  = Rooms.getStats();
  const activeRes  = Reservations.getActive();
  const todayCI    = Reservations.getTodayCheckIns();
  const pendingPay = Reservations.getPendingPayments();
  const pendingAmt = pendingPay.reduce((s,r) => s + (parseFloat(r.totalCost) - parseFloat(r.paidAmount||0)), 0);
  const todayExpenses = Expenses.getTotalToday();
  const todayRev   = Reservations.getAll()
    .filter(r => r.createdAt?.slice(0,10) === new Date().toISOString().slice(0,10) && r.status !== 'cancelled')
    .reduce((s,r) => s + (parseFloat(r.paidAmount)||0), 0)
    + DaytimeBookings.getToday().reduce((s,b) => s + (parseFloat(b.paidAmount)||0), 0);
  const occupancyRate = roomStats.total > 0
    ? Math.round((roomStats.occupied / roomStats.total) * 100) : 0;
  const recentActivity = Activity.getRecent(8);
  const last7Rev = Reservations.getLast7DaysRevenue();

  container.innerHTML = `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1 data-i18n="dash.title">${t('dash.title')}</h1>
        <p data-i18n="dash.subtitle">${t('dash.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="dash-new-res">
          <i data-lucide="plus"></i> ${t('res.add')}
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="stats-grid">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="percent"></i></div>
        <div class="stat-value">${occupancyRate}%</div>
        <div class="stat-label">${t('dash.occupancy')}</div>
        <div class="stat-trend">
          <i data-lucide="bed-double" style="width:12px;height:12px"></i>
          ${roomStats.occupied} / ${roomStats.total} rooms
        </div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="trending-up"></i></div>
        <div class="stat-value">${formatCurrency(todayRev)}</div>
        <div class="stat-label">${t('dash.revenue')}</div>
        <div class="stat-trend up">
          <i data-lucide="arrow-up" style="width:12px;height:12px"></i>
          Today's collections
        </div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="users"></i></div>
        <div class="stat-value">${activeRes.length}</div>
        <div class="stat-label">${t('dash.active_guests')}</div>
        <div class="stat-trend">
          <i data-lucide="calendar-check" style="width:12px;height:12px"></i>
          ${todayCI.length} check-ins today
        </div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon"><i data-lucide="alert-circle"></i></div>
        <div class="stat-value">${formatCurrency(pendingAmt)}</div>
        <div class="stat-label">${t('dash.pending')}</div>
        <div class="stat-trend down">
          <i data-lucide="clock" style="width:12px;height:12px"></i>
          ${pendingPay.length} reservations pending
        </div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="door-open"></i></div>
        <div class="stat-value">${roomStats.available}</div>
        <div class="stat-label">${t('dash.available')}</div>
        <div class="stat-trend">
          <i data-lucide="check-circle" style="width:12px;height:12px"></i>
          Ready for guests
        </div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon"><i data-lucide="receipt"></i></div>
        <div class="stat-value">${formatCurrency(todayExpenses)}</div>
        <div class="stat-label">Today's Expenses</div>
        <div class="stat-trend down">
          <i data-lucide="arrow-down" style="width:12px;height:12px"></i>
          Operational costs
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-grid">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-2"></i> ${t('dash.rev_chart')}</h3>
        </div>
        <div class="chart-container">
          <canvas id="revenue-chart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="pie-chart"></i> ${t('dash.occ_chart')}</h3>
        </div>
        <div class="chart-container" style="height:200px">
          <canvas id="occupancy-chart"></canvas>
        </div>
        <div class="occ-legend" style="margin-top:12px;display:flex;gap:16px;justify-content:center;font-size:12px">
          <span style="color:var(--green)">● Available (${roomStats.available})</span>
          <span style="color:var(--blue)">● Occupied (${roomStats.occupied})</span>
          <span style="color:var(--orange)">● Maintenance (${roomStats.maintenance})</span>
        </div>
      </div>
    </div>

    <!-- Quick Actions + Activity -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="zap"></i> ${t('dash.quick')}</h3>
        </div>
        <div class="quick-actions">
          <button class="quick-action-btn" data-page="rooms">
            <i data-lucide="bed-double"></i>
            <span>${t('room.add')}</span>
          </button>
          <button class="quick-action-btn" data-page="guests">
            <i data-lucide="user-plus"></i>
            <span>${t('guest.add')}</span>
          </button>
          <button class="quick-action-btn" data-page="reservations">
            <i data-lucide="calendar-plus"></i>
            <span>${t('res.add')}</span>
          </button>
          <button class="quick-action-btn" data-page="daytime">
            <i data-lucide="sun"></i>
            <span>${t('day.book')}</span>
          </button>
          <button class="quick-action-btn" data-page="expenses">
            <i data-lucide="receipt"></i>
            <span>${t('exp.add')}</span>
          </button>
          <button class="quick-action-btn" data-page="reports">
            <i data-lucide="bar-chart-3"></i>
            <span>${t('rep.generate')}</span>
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="activity"></i> ${t('dash.activity')}</h3>
        </div>
        <div class="activity-feed">
          ${recentActivity.length === 0
            ? `<div class="empty-state" style="padding:30px 0"><p>${t('dash.no_activity')}</p></div>`
            : recentActivity.map(a => `
              <div class="activity-item">
                <div class="activity-dot ${activityColor(a.type)}"></div>
                <div>
                  <div class="activity-text">${escapeHtml(a.message)}</div>
                  <div class="activity-time">${formatDateTime(a.createdAt)}</div>
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>

    <!-- Today's Reservations -->
    ${buildTodayTable()}
  </div>
  `;

  lucide.createIcons();
  renderCharts(last7Rev, roomStats);
  bindDashActions(container);
}

function activityColor(type) {
  const map = { checkin:'dot-green', checkout:'dot-blue', service:'dot-orange', expense:'dot-red', cancel:'dot-red', info:'dot-blue' };
  return map[type] || 'dot-blue';
}

function buildTodayTable() {
  const todayCI  = Reservations.getTodayCheckIns();
  const todayCO  = Reservations.getTodayCheckOuts();
  const combined = [
    ...todayCI.map(r => ({ ...r, _type: 'checkin' })),
    ...todayCO.map(r => ({ ...r, _type: 'checkout' })),
  ];
  if (combined.length === 0) return '';

  return `
  <div class="card" style="margin-top:20px">
    <div class="card-header">
      <h3 class="card-title"><i data-lucide="calendar-days"></i> Today's Check-ins & Check-outs</h3>
    </div>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Room</th>
            <th>Type</th>
            <th>Nights</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${combined.map(r => {
            const guest = Guests.getById(r.guestId);
            const room  = Rooms.getById(r.roomId);
            return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="guest-avatar" style="width:30px;height:30px;font-size:11px">${Guests.getInitials(guest?.name)}</div>
                  ${escapeHtml(guest?.name || '—')}
                </div>
              </td>
              <td><strong>Room ${escapeHtml(room?.number || '?')}</strong></td>
              <td>
                <span class="badge ${r._type === 'checkin' ? 'badge-active' : 'badge-completed'}">
                  ${r._type === 'checkin' ? '↓ Check-in' : '↑ Check-out'}
                </span>
              </td>
              <td>${r.nights} nights</td>
              <td><span class="badge badge-${r.paymentStatus}">${r.paymentStatus}</span></td>
              <td><span class="badge badge-${r.status}">${r.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderCharts(last7Rev, roomStats) {
  Chart.defaults.color = '#8b96b5';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  // Revenue Chart
  const revCtx = document.getElementById('revenue-chart');
  if (revCtx) {
    new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: last7Rev.map(d => {
          const dt = new Date(d.date);
          return dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
        }),
        datasets: [{
          label: 'Revenue',
          data: last7Rev.map(d => d.revenue),
          backgroundColor: 'rgba(245,185,69,0.3)',
          borderColor: '#f5b945',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { callback: v => `ETB ${v.toLocaleString()}` }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Occupancy Doughnut
  const occCtx = document.getElementById('occupancy-chart');
  if (occCtx) {
    new Chart(occCtx, {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Occupied', 'Maintenance'],
        datasets: [{
          data: [roomStats.available, roomStats.occupied, roomStats.maintenance],
          backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(59,130,246,0.7)', 'rgba(249,115,22,0.7)'],
          borderColor:     ['#22c55e', '#3b82f6', '#f97316'],
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%',
      }
    });
  }
}

function bindDashActions(container) {
  container.querySelector('#dash-new-res')?.addEventListener('click', () => {
    window.navigate('reservations');
  });
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => window.navigate(btn.dataset.page));
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
