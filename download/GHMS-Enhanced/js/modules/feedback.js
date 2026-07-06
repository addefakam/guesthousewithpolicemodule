/**
 * feedback.js — Guest Feedback & Reviews Module
 */
import { Feedback, Guests, Reservations, Rooms } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';

let filterRating = 'all';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  renderFeedbackChart();
  bindEvents(container);
}

function buildPage() {
  const all = Feedback.getAll();
  const avgRating = all.length > 0 ? (all.reduce((s,f) => s + (f.rating||0), 0) / all.length).toFixed(1) : '0.0';
  const filtered = filterRating === 'all' ? all : all.filter(f => f.rating === parseInt(filterRating));
  const sorted = [...filtered].sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  // Rating distribution
  const dist = [5,4,3,2,1].map(r => ({
    rating: r,
    count: all.filter(f => f.rating === r).length,
    pct: all.length > 0 ? Math.round((all.filter(f => f.rating === r).length / all.length) * 100) : 0
  }));

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('feedback.title') || 'Guest Feedback'}</h1>
        <p>${t('feedback.subtitle') || 'Guest reviews and satisfaction ratings'}</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-primary" id="add-feedback-btn">
          <i data-lucide="plus"></i> ${t('feedback.add') || 'Add Review'}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card stat-gold" style="text-align:center">
        <div style="font-size:36px;font-weight:800;color:var(--gold)">${avgRating}</div>
        <div style="color:var(--gold);font-size:18px;margin-bottom:4px">${renderStars(Math.round(avgRating))}</div>
        <div class="stat-label">Average Rating</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="message-circle"></i></div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-label">Total Reviews</div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="thumbs-up"></i></div>
        <div class="stat-value">${all.filter(f => f.rating >= 4).length}</div>
        <div class="stat-label">Positive (4-5)</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon"><i data-lucide="thumbs-down"></i></div>
        <div class="stat-value">${all.filter(f => f.rating <= 2).length}</div>
        <div class="stat-label">Negative (1-2)</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px">
      <!-- Rating Distribution -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-2"></i> Rating Distribution</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
          ${dist.map(d => `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;font-weight:600;color:var(--gold);width:20px">${d.rating}</span>
            <span style="font-size:12px;color:var(--gold)">${'★'.repeat(d.rating)}${'☆'.repeat(5-d.rating)}</span>
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill" style="width:${d.pct}%;background:var(--gold)"></div>
            </div>
            <span style="font-size:12px;color:var(--text-muted);width:30px;text-align:right">${d.count}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="trending-up"></i> Rating Trend</h3>
        </div>
        <div class="chart-container" style="height:200px">
          <canvas id="feedback-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <button class="filter-btn ${filterRating==='all'?'active':''}" data-filter="all">${t('common.all')}</button>
      ${[5,4,3,2,1].map(r => `
        <button class="filter-btn ${filterRating===String(r)?'active':''}" data-filter="${r}">${'★'.repeat(r)} ${r}</button>
      `).join('')}
    </div>

    <!-- Reviews List -->
    ${sorted.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="message-circle"></i></div>
           <h3>No reviews yet</h3>
           <p>Add the first guest review</p>
           <button class="btn btn-primary" style="margin-top:16px" id="add-feedback-empty">
             <i data-lucide="plus"></i> Add Review
           </button>
         </div>`
      : `<div style="display:flex;flex-direction:column;gap:16px">
           ${sorted.map(reviewCard).join('')}
         </div>`
    }
  </div>`;
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span style="color:${i <= rating ? 'var(--gold)' : 'var(--text-muted)'};font-size:14px">★</span>`;
  }
  return html;
}

function reviewCard(f) {
  const guest = Guests.getById(f.guestId);
  const reservation = f.reservationId ? Reservations.getById(f.reservationId) : null;
  const room = reservation ? Rooms.getById(reservation.roomId) : null;

  return `
  <div class="card" style="padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="guest-avatar" style="width:42px;height:42px;font-size:15px">${guest ? Guests.getInitials(guest.name) : '?'}</div>
        <div>
          <div style="font-weight:700;font-size:15px">${escHtml(guest?.name || f.guestName || 'Anonymous')}</div>
          <div style="font-size:12px;color:var(--text-muted)">
            ${room ? `Room ${escHtml(room.number)} · ` : ''}${formatDate(f.createdAt)}
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px;font-weight:800;color:var(--gold)">${f.rating}</span>
        <span>${renderStars(f.rating)}</span>
        <button class="btn btn-sm btn-danger delete-feedback-btn" data-id="${f.id}" style="margin-left:12px" title="Delete">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
    ${f.comment ? `<p style="color:var(--text-secondary);font-size:14px;line-height:1.6;margin:0">${escHtml(f.comment)}</p>` : ''}
  </div>`;
}

function renderFeedbackChart() {
  // Last 7 days average rating trend
  const all = Feedback.getAll();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0,10);
    const dayFeedback = all.filter(f => f.createdAt?.slice(0,10) === dateStr);
    const avg = dayFeedback.length > 0
      ? dayFeedback.reduce((s,f) => s + (f.rating||0), 0) / dayFeedback.length
      : 0;
    days.push({ date: dateStr, avg: Math.round(avg * 10) / 10, count: dayFeedback.length });
  }

  const ctx = document.getElementById('feedback-chart');
  if (!ctx) return;

  Chart.defaults.color = '#8b96b5';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
      }),
      datasets: [{
        label: 'Avg Rating',
        data: days.map(d => d.avg),
        borderColor: '#f5b945',
        backgroundColor: 'rgba(245,185,69,0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#f5b945',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 5, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'add-feedback-btn' || btn.id === 'add-feedback-empty') {
      openFeedbackForm(container);
    } else if (btn.classList.contains('delete-feedback-btn')) {
      showConfirm('Delete review?', 'This action cannot be undone.', () => {
        Feedback.delete(btn.dataset.id);
        showToast('Review deleted', '', 'success');
        render(container);
      });
    } else if (btn.dataset.filter !== undefined) {
      filterRating = btn.dataset.filter;
      render(container);
    }
  });
}

function openFeedbackForm(container) {
  const guests = Guests.getAll();
  const activeRes = Reservations.getAll().filter(r => r.status === 'active' || r.status === 'completed');

  openModal(t('feedback.add') || 'Add Review', `
    <form id="feedback-form" class="form-grid">
      <div class="form-group span-2">
        <label>Guest *</label>
        <select class="form-select" name="guestId" id="fb-guest-select" required>
          <option value="">— Select Guest —</option>
          ${guests.map(g => `<option value="${g.id}">${escHtml(g.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Reservation (Optional)</label>
        <select class="form-select" name="reservationId" id="fb-res-select">
          <option value="">— Select Reservation —</option>
          ${activeRes.map(r => {
            const room = Rooms.getById(r.roomId);
            return `<option value="${r.id}" data-guest="${r.guestId}">Room ${room?.number||'?'} (${formatDate(r.checkIn)})</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Rating *</label>
        <div id="star-rating" style="display:flex;gap:6px;font-size:32px;cursor:pointer;padding:8px 0">
          ${[1,2,3,4,5].map(i => `<span class="star-btn" data-rating="${i}" style="color:var(--text-muted);transition:color 0.15s">★</span>`).join('')}
          <input type="hidden" name="rating" id="rating-input" value="0">
        </div>
      </div>
      <div class="form-group span-2">
        <label>Comment</label>
        <textarea class="form-textarea" name="comment" placeholder="Guest's feedback..." rows="4"></textarea>
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-feedback">Cancel</button>
        <button type="submit" class="btn btn-primary">Submit Review</button>
      </div>
    </form>
  `);

  // Star rating interaction
  let selectedRating = 0;
  document.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      document.getElementById('rating-input').value = selectedRating;
      document.querySelectorAll('.star-btn').forEach(s => {
        s.style.color = parseInt(s.dataset.rating) <= selectedRating ? 'var(--gold)' : 'var(--text-muted)';
      });
    });
    star.addEventListener('mouseenter', () => {
      const hoverVal = parseInt(star.dataset.rating);
      document.querySelectorAll('.star-btn').forEach(s => {
        s.style.color = parseInt(s.dataset.rating) <= hoverVal ? 'var(--gold)' : 'var(--text-muted)';
      });
    });
  });
  document.getElementById('star-rating')?.addEventListener('mouseleave', () => {
    document.querySelectorAll('.star-btn').forEach(s => {
      s.style.color = parseInt(s.dataset.rating) <= selectedRating ? 'var(--gold)' : 'var(--text-muted)';
    });
  });

  // Auto-select guest when reservation is chosen
  document.getElementById('fb-res-select')?.addEventListener('change', e => {
    const opt = e.target.options[e.target.selectedIndex];
    if (opt && opt.dataset.guest) {
      document.getElementById('fb-guest-select').value = opt.dataset.guest;
    }
  });

  document.getElementById('cancel-feedback')?.addEventListener('click', closeModal);
  document.getElementById('feedback-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (!data.rating || parseInt(data.rating) < 1) {
      showToast('Error', 'Please select a rating', 'error');
      return;
    }
    data.rating = parseInt(data.rating);
    const guest = Guests.getById(data.guestId);
    data.guestName = guest?.name || '';
    Feedback.add(data);
    showToast('Review added', `Rating: ${'★'.repeat(data.rating)}`, 'success');
    closeModal();
    render(container);
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}