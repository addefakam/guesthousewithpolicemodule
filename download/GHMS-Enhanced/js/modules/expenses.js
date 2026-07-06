/**
 * expenses.js — Expense Management Module
 */
import { Expenses, ExpenseCategories } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';
import { Auth } from '../data.js';

let filterCat  = 'all';
let filterFrom = '';
let filterTo   = '';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  renderExpenseChart();
  bindEvents(container);
}

function buildPage() {
  const cats    = ExpenseCategories.getAll();
  const filtered = Expenses.filter({ from: filterFrom || undefined, to: filterTo || undefined, category: filterCat });
  const sorted  = [...filtered].sort((a,b) => b.date.localeCompare(a.date));
  const totalFiltered = filtered.reduce((s,e) => s + (parseFloat(e.amount)||0), 0);
  const todayAmt  = Expenses.getTotalToday();
  const monthAmt  = Expenses.getTotalMonth();

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('exp.title')}</h1>
        <p>${t('exp.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        <button class="btn btn-primary" id="add-expense-btn">
          <i data-lucide="plus"></i> ${t('exp.add')}
        </button>
        `}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="stat-card stat-red">
        <div class="stat-icon"><i data-lucide="calendar-days"></i></div>
        <div class="stat-value">${formatCurrency(todayAmt)}</div>
        <div class="stat-label">${t('exp.total_today')}</div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon"><i data-lucide="calendar"></i></div>
        <div class="stat-value">${formatCurrency(monthAmt)}</div>
        <div class="stat-label">${t('exp.total_month')}</div>
      </div>
      <div class="stat-card stat-purple">
        <div class="stat-icon"><i data-lucide="filter"></i></div>
        <div class="stat-value">${formatCurrency(totalFiltered)}</div>
        <div class="stat-label">Filtered Total</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px">
      <!-- Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="pie-chart"></i> Expenses by Category</h3>
        </div>
        <div class="chart-container" style="height:200px">
          <canvas id="expense-chart"></canvas>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="list"></i> Category Summary</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${buildCategorySummary(cats, filtered)}
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="search-bar" style="flex:unset;max-width:140px">
        <i data-lucide="calendar"></i>
        <input class="search-input" type="date" id="filter-from" value="${filterFrom}" placeholder="From">
      </div>
      <div class="search-bar" style="flex:unset;max-width:140px">
        <i data-lucide="calendar"></i>
        <input class="search-input" type="date" id="filter-to" value="${filterTo}" placeholder="To">
      </div>
      <button class="filter-btn ${filterCat==='all'?'active':''}" data-cat="all">All</button>
      ${cats.map(c => `
        <button class="filter-btn ${filterCat===c.id?'active':''}" data-cat="${c.id}">${c.name}</button>
      `).join('')}
    </div>

    <!-- Expense List -->
    ${sorted.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="receipt"></i></div>
           <h3>${t('exp.no_expenses')}</h3>
           <p>${t('exp.add_first')}</p>
           ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
           <button class="btn btn-primary" style="margin-top:16px" id="add-expense-empty">
             <i data-lucide="plus"></i> ${t('exp.add')}
           </button>
           `}
         </div>`
      : `<div class="card">
           <div class="table-wrapper">
             <table class="data-table">
               <thead>
                 <tr>
                   <th>${t('exp.date')}</th>
                   <th>${t('exp.category')}</th>
                   <th>${t('exp.description')}</th>
                   <th>${t('exp.vendor')}</th>
                   <th>${t('exp.payment')}</th>
                   <th>${t('exp.amount')}</th>
                   <th>${t('common.actions')}</th>
                 </tr>
               </thead>
               <tbody>
                 ${sorted.map(expRow).join('')}
               </tbody>
             </table>
           </div>
         </div>`
    }
  </div>`;
}

function buildCategorySummary(cats, expenses) {
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + (parseFloat(e.amount)||0);
  });
  const total = Object.values(byCategory).reduce((s,v) => s+v, 0);

  return cats.map(cat => {
    const amt = byCategory[cat.id] || 0;
    const pct = total > 0 ? (amt / total) * 100 : 0;
    return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">${cat.name}</span>
        <span style="font-size:12px;font-weight:700;color:${cat.color||'var(--text-primary)'}">${formatCurrency(amt)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${cat.color||'var(--gold)'}"></div>
      </div>
    </div>`;
  }).join('');
}

function expRow(e) {
  const cat = ExpenseCategories.getById(e.category);
  return `
  <tr>
    <td style="font-size:12px">${formatDate(e.date)}</td>
    <td>
      <span class="badge" style="background:${cat?.color||''}22;color:${cat?.color||'var(--text-secondary)'};border-color:${cat?.color||'var(--border)'}44">
        ${cat?.name || e.category}
      </span>
    </td>
    <td>${escHtml(e.description||'—')}</td>
    <td style="color:var(--text-secondary);font-size:12px">${escHtml(e.vendor||'—')}</td>
    <td>
      <span class="tag">${escHtml(e.paymentMethod||'cash')}</span>
    </td>
    <td style="font-weight:700;color:var(--red)">${formatCurrency(e.amount)}</td>
    <td>
      ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
      <div class="actions-cell">
        <button class="btn btn-sm btn-ghost edit-expense-btn" data-id="${e.id}"><i data-lucide="pencil"></i></button>
        <button class="btn btn-sm btn-danger delete-expense-btn" data-id="${e.id}"><i data-lucide="trash-2"></i></button>
      </div>
      `}
    </td>
  </tr>`;
}

function renderExpenseChart() {
  const cats     = ExpenseCategories.getAll();
  const expenses = Expenses.filter({
    from: filterFrom || undefined,
    to:   filterTo   || undefined
  });
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + (parseFloat(e.amount)||0);
  });

  const ctx = document.getElementById('expense-chart');
  if (!ctx || !Object.keys(byCategory).length) return;

  const labels = cats.filter(c => byCategory[c.id]).map(c => c.name);
  const data   = cats.filter(c => byCategory[c.id]).map(c => byCategory[c.id]);
  const colors = cats.filter(c => byCategory[c.id]).map(c => c.color || '#8b96b5');

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#8b96b5', font: { size: 11 } } },
      },
      cutout: '60%',
    }
  });
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button, [data-cat]');
    if (!btn) return;

    if (btn.id === 'add-expense-btn' || btn.id === 'add-expense-empty') { openExpenseForm(container); }
    else if (btn.classList.contains('edit-expense-btn')) { openExpenseForm(container, btn.dataset.id); }
    else if (btn.classList.contains('delete-expense-btn')) {
      showConfirm('Delete expense?', t('common.delete_confirm'), () => {
        Expenses.delete(btn.dataset.id);
        showToast('Expense deleted', '', 'success');
        render(container);
      });
    } else if (btn.dataset.cat !== undefined) {
      filterCat = btn.dataset.cat;
      render(container);
    }
  });

  container.querySelector('#filter-from')?.addEventListener('change', e => {
    filterFrom = e.target.value;
    render(container);
  });
  container.querySelector('#filter-to')?.addEventListener('change', e => {
    filterTo = e.target.value;
    render(container);
  });
}

function openExpenseForm(container, id = null) {
  const e    = id ? Expenses.getById(id) : null;
  const cats = ExpenseCategories.getAll();
  const today = new Date().toISOString().slice(0,10);

  openModal(e ? t('exp.edit') : t('exp.add'), `
    <form id="expense-form" class="form-grid">
      <div class="form-group">
        <label>${t('exp.date')} *</label>
        <input class="form-input" name="date" type="date" value="${e?.date||today}" required>
      </div>
      <div class="form-group">
        <label>${t('exp.category')} *</label>
        <select class="form-select" name="category" required>
          <option value="">— Select Category —</option>
          ${cats.map(c => `<option value="${c.id}" ${e?.category===c.id?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group span-2">
        <label>${t('exp.description')} *</label>
        <input class="form-input" name="description" value="${e?.description||''}" required placeholder="What was the expense for?">
      </div>
      <div class="form-group">
        <label>${t('exp.amount')} *</label>
        <input class="form-input" name="amount" type="number" min="0" step="0.01" value="${e?.amount||''}" required placeholder="0.00">
      </div>
      <div class="form-group">
        <label>${t('exp.payment')}</label>
        <select class="form-select" name="paymentMethod">
          <option value="cash"     ${(!e?.paymentMethod||e?.paymentMethod==='cash')?'selected':''}>Cash</option>
          <option value="transfer" ${e?.paymentMethod==='transfer'?'selected':''}>Bank Transfer</option>
          <option value="card"     ${e?.paymentMethod==='card'?'selected':''}>Card</option>
        </select>
      </div>
      <div class="form-group">
        <label>${t('exp.vendor')}</label>
        <input class="form-input" name="vendor" value="${e?.vendor||''}" placeholder="Vendor or supplier name">
      </div>
      <div class="form-group">
        <label>${t('exp.receipt_no')}</label>
        <input class="form-input" name="receiptNo" value="${e?.receiptNo||''}" placeholder="Receipt #">
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-expense">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-expense')?.addEventListener('click', closeModal);
  document.getElementById('expense-form').addEventListener('submit', ev => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(ev.target));
    if (e) {
      Expenses.update(id, data);
      showToast('Expense updated', '', 'success');
    } else {
      Expenses.add(data);
      showToast('Expense recorded', `${data.description} — ${formatCurrency(data.amount)}`, 'success');
    }
    closeModal();
    render(container);
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
