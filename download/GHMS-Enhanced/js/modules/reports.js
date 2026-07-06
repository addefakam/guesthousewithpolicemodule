/**
 * reports.js — Reports & Analytics Module
 */
import { Reservations, DaytimeBookings, Expenses, Rooms, ExpenseCategories } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { showToast } from '../app.js';

let reportFrom = '';
let reportTo   = '';
let groupBy    = 'daily'; // daily, weekly, monthly

export function render(container) {
  // Default: last 30 days
  if (!reportFrom) {
    const d = new Date(); d.setDate(d.getDate() - 30);
    reportFrom = d.toISOString().slice(0,10);
  }
  if (!reportTo) {
    reportTo = new Date().toISOString().slice(0,10);
  }

  container.innerHTML = buildPage();
  lucide.createIcons();
  renderCharts();
  bindEvents(container);
}

function buildPage() {
  const roomRev    = Reservations.getRevenue(reportFrom, reportTo);
  const svcRev     = DaytimeBookings.getRevenue(reportFrom, reportTo);
  const grossRev   = roomRev + svcRev;
  const totalExp   = Expenses.getTotal(reportFrom, reportTo);
  const netProfit  = grossRev - totalExp;
  const roomStats  = Rooms.getStats();
  const occRate    = roomStats.total > 0 ? Math.round((roomStats.occupied / roomStats.total) * 100) : 0;

  const expByCat   = Expenses.getByCategory(reportFrom, reportTo);
  const cats       = ExpenseCategories.getAll();

  const resInPeriod = Reservations.filter({ from: reportFrom, to: reportTo });
  const totalNights = resInPeriod.reduce((s,r) => s + (r.nights||0), 0);
  const uniqueGuests = new Set(resInPeriod.map(r => r.guestId)).size;

  // Revenue by Room Type
  const roomTypeRev = {};
  resInPeriod.forEach(r => {
    if (r.status === 'cancelled') return;
    const room = Rooms.getById(r.roomId);
    const type = room?.type || 'Unknown';
    roomTypeRev[type] = (roomTypeRev[type] || 0) + (parseFloat(r.paidAmount) || 0);
  });
  const roomTypes = Object.keys(roomTypeRev).sort((a,b) => roomTypeRev[b] - roomTypeRev[a]);

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('rep.title')}</h1>
        <p>${t('rep.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" id="export-csv-btn">
          <i data-lucide="download"></i> ${t('rep.export_csv')}
        </button>
        <button class="btn btn-ghost" id="print-report-btn">
          <i data-lucide="printer"></i> ${t('rep.print')}
        </button>
      </div>
    </div>

    <!-- Date Range -->
    <div class="card" style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">
          <i data-lucide="calendar" style="width:14px;height:14px;display:inline;vertical-align:middle"></i>
          ${t('rep.period')}:
        </span>
        <div class="search-bar" style="flex:unset;max-width:160px">
          <input class="search-input" type="date" id="rep-from" value="${reportFrom}">
        </div>
        <span style="color:var(--text-muted)">→</span>
        <div class="search-bar" style="flex:unset;max-width:160px">
          <input class="search-input" type="date" id="rep-to" value="${reportTo}">
        </div>
        <button class="btn btn-primary btn-sm" id="rep-apply">
          <i data-lucide="refresh-cw"></i> ${t('rep.generate')}
        </button>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-sm btn-ghost period-btn" data-days="1">Daily (Today)</button>
          <button class="btn btn-sm btn-ghost period-btn" data-days="7">Weekly</button>
          <button class="btn btn-sm btn-ghost period-btn" data-days="30">Monthly</button>
          <button class="btn btn-sm btn-ghost period-btn" data-days="365">Yearly</button>
        </div>
      </div>
    </div>

    <!-- KPI Summary -->
    <div class="stats-grid" style="grid-template-columns:repeat(6,1fr);margin-bottom:24px">
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="trending-up"></i></div>
        <div class="stat-value">${formatCurrency(grossRev)}</div>
        <div class="stat-label">${t('rep.gross_revenue')}</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="wallet"></i></div>
        <div class="stat-value">${formatCurrency(netProfit)}</div>
        <div class="stat-label">${t('rep.net_profit')}</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="bed-double"></i></div>
        <div class="stat-value">${formatCurrency(roomRev)}</div>
        <div class="stat-label">${t('rep.room_rev')}</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="sun"></i></div>
        <div class="stat-value">${formatCurrency(svcRev)}</div>
        <div class="stat-label">${t('rep.service_rev')}</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon"><i data-lucide="receipt"></i></div>
        <div class="stat-value">${formatCurrency(totalExp)}</div>
        <div class="stat-label">${t('rep.total_exp')}</div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon"><i data-lucide="percent"></i></div>
        <div class="stat-value">${occRate}%</div>
        <div class="stat-label">${t('rep.avg_occ')}</div>
      </div>
    </div>

    <!-- Additional Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">
      <div class="stat-card stat-blue" style="padding:16px">
        <div style="font-size:11px;color:var(--text-muted)">Total Reservations</div>
        <div style="font-size:24px;font-weight:800;color:var(--blue)">${resInPeriod.length}</div>
      </div>
      <div class="stat-card stat-green" style="padding:16px">
        <div style="font-size:11px;color:var(--text-muted)">Unique Guests</div>
        <div style="font-size:24px;font-weight:800;color:var(--green)">${uniqueGuests}</div>
      </div>
      <div class="stat-card stat-gold" style="padding:16px">
        <div style="font-size:11px;color:var(--text-muted)">Total Guest-Nights</div>
        <div style="font-size:24px;font-weight:800;color:var(--gold)">${totalNights}</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-2"></i> Revenue vs Expenses</h3>
        </div>
        <div class="chart-container">
          <canvas id="rev-exp-chart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="pie-chart"></i> Expense Breakdown</h3>
        </div>
        <div class="chart-container" style="height:200px">
          <canvas id="exp-breakdown-chart"></canvas>
        </div>
        <!-- Legend -->
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;justify-content:center">
          ${cats.filter(c => expByCat[c.id]).map(c => `
            <span style="font-size:11px;display:flex;align-items:center;gap:4px">
              <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block"></span>
              ${c.name}: ${formatCurrency(expByCat[c.id])}
            </span>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Revenue Breakdown Table -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="list-checks"></i> Revenue Breakdown</h3>
        </div>
        <div class="receipt-section">
          <div class="receipt-row"><span>Room Revenue</span><span style="color:var(--green)">${formatCurrency(roomRev)}</span></div>
          <div class="receipt-row"><span>Daytime Service Revenue</span><span style="color:var(--green)">${formatCurrency(svcRev)}</span></div>
          <div class="receipt-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
            <span style="font-weight:700">Gross Revenue</span>
            <span style="font-weight:700;color:var(--gold)">${formatCurrency(grossRev)}</span>
          </div>
          <div class="receipt-row"><span>Total Expenses</span><span style="color:var(--red)">-${formatCurrency(totalExp)}</span></div>
          <div class="receipt-row total">
            <span>${t('rep.net_profit')}</span>
            <span style="color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="receipt"></i> Expense Breakdown</h3>
        </div>
        <div class="receipt-section">
          ${cats.filter(c => expByCat[c.id]).map(c => `
            <div class="receipt-row">
              <span style="display:flex;align-items:center;gap:6px">
                <span style="width:8px;height:8px;border-radius:50%;background:${c.color};display:inline-block"></span>
                ${c.name}
              </span>
              <span style="color:var(--red)">${formatCurrency(expByCat[c.id])}</span>
            </div>
          `).join('')}
          <div class="receipt-row total">
            <span>Total Expenses</span>
            <span style="color:var(--red)">${formatCurrency(totalExp)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Type Breakdown Table -->
    <div class="grid-2" style="margin-bottom:24px">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bed-double"></i> Revenue by Room Type</h3>
        </div>
        <div class="receipt-section">
          ${roomTypes.length === 0 ? '<div style="color:var(--text-muted);font-size:13px">No room revenue in this period.</div>' : ''}
          ${roomTypes.map(t => `
            <div class="receipt-row">
              <span style="display:flex;align-items:center;gap:6px">
                <i data-lucide="door-open" style="width:14px;height:14px;color:var(--gold)"></i>
                ${t}
              </span>
              <span style="color:var(--green);font-weight:700">${formatCurrency(roomTypeRev[t])}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function renderCharts() {
  Chart.defaults.color = '#8b96b5';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  // Revenue vs Expenses bar chart by day
  const days = [];
  const d1 = new Date(reportFrom);
  const d2 = new Date(reportTo);
  const span = Math.round((d2 - d1) / (1000*60*60*24));
  
  let step = 1;
  let labelFormat = { month:'short', day:'numeric' };
  
  if (span > 90) {
    step = 30; // monthly grouping
    labelFormat = { year:'numeric', month:'short' };
  } else if (span > 14) {
    step = 7; // weekly grouping
    labelFormat = { month:'short', day:'numeric' };
  }

  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + step)) {
    days.push(d.toISOString().slice(0,10));
  }

  const allRes    = Reservations.getAll().filter(r => r.status !== 'cancelled');
  const allDaySvc = DaytimeBookings.getAll();
  const allExp    = Expenses.getAll();

  const revData = days.map(day => {
    const endDay = new Date(day);
    endDay.setDate(endDay.getDate() + step);
    const end = endDay.toISOString().slice(0,10);
    return allRes.filter(r => r.createdAt?.slice(0,10) >= day && r.createdAt?.slice(0,10) < end)
      .reduce((s,r) => s + (parseFloat(r.paidAmount)||0), 0)
      + allDaySvc.filter(b => b.createdAt?.slice(0,10) >= day && b.createdAt?.slice(0,10) < end)
        .reduce((s,b) => s + (parseFloat(b.paidAmount)||0), 0);
  });

  const expData = days.map(day => {
    const endDay = new Date(day);
    endDay.setDate(endDay.getDate() + step);
    const end = endDay.toISOString().slice(0,10);
    return allExp.filter(e => e.date >= day && e.date < end)
      .reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
  });

  const revCtx = document.getElementById('rev-exp-chart');
  if (revCtx) {
    new Chart(revCtx, {
      type: 'bar',
      data: {
        labels: days.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString('en-US', labelFormat);
        }),
        datasets: [
          {
            label: 'Revenue',
            data: revData,
            backgroundColor: 'rgba(245,185,69,0.4)',
            borderColor: '#f5b945',
            borderWidth: 2,
            borderRadius: 4,
          },
          {
            label: 'Expenses',
            data: expData,
            backgroundColor: 'rgba(239,68,68,0.3)',
            borderColor: '#ef4444',
            borderWidth: 2,
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#8b96b5', font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Expense Breakdown Doughnut
  const cats   = ExpenseCategories.getAll();
  const expByCat = Expenses.getByCategory(reportFrom, reportTo);
  const usedCats = cats.filter(c => expByCat[c.id]);

  const expCtx = document.getElementById('exp-breakdown-chart');
  if (expCtx && usedCats.length > 0) {
    new Chart(expCtx, {
      type: 'doughnut',
      data: {
        labels: usedCats.map(c => c.name),
        datasets: [{
          data: usedCats.map(c => expByCat[c.id]),
          backgroundColor: usedCats.map(c => (c.color || '#8b96b5') + 'cc'),
          borderColor: usedCats.map(c => c.color || '#8b96b5'),
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '60%',
      }
    });
  }
}

function bindEvents(container) {
  container.querySelector('#rep-apply')?.addEventListener('click', () => {
    reportFrom = container.querySelector('#rep-from')?.value || reportFrom;
    reportTo   = container.querySelector('#rep-to')?.value   || reportTo;
    render(container);
  });

  container.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.dataset.days);
      const d = new Date(); d.setDate(d.getDate() - days);
      reportFrom = d.toISOString().slice(0,10);
      reportTo   = new Date().toISOString().slice(0,10);
      render(container);
    });
  });

  container.querySelector('#export-csv-btn')?.addEventListener('click', exportCSV);
  container.querySelector('#print-report-btn')?.addEventListener('click', () => window.print());
}

function exportCSV() {
  const resInPeriod = Reservations.filter({ from: reportFrom, to: reportTo });
  const expInPeriod = Expenses.filter({ from: reportFrom, to: reportTo });

  let csv = 'GUEST HOUSE REPORT\n';
  csv += `Period: ${reportFrom} to ${reportTo}\n\n`;

  // Reservations
  csv += 'RESERVATIONS\n';
  csv += 'Guest,Room,Check-In,Check-Out,Nights,Total Cost,Paid,Status\n';
  resInPeriod.forEach(r => {
    csv += `"${r.guestId}","${r.roomId}","${r.checkIn}","${r.checkOut}",${r.nights},${r.totalCost},${r.paidAmount},${r.status}\n`;
  });

  csv += '\nEXPENSES\n';
  csv += 'Date,Category,Description,Amount,Vendor,Payment Method\n';
  expInPeriod.forEach(e => {
    csv += `"${e.date}","${e.category}","${e.description}",${e.amount},"${e.vendor||''}","${e.paymentMethod||'cash'}"\n`;
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ghms-report-${reportFrom}-to-${reportTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('CSV Exported', 'Report downloaded successfully', 'success');
}
