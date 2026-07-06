/**
 * resources.js — Resource & Inventory Module
 */
import { Resources } from '../data.js';
import { t, formatCurrency, formatDate } from '../i18n.js';
import { openModal, closeModal, showToast, showConfirm } from '../app.js';
import { Auth } from '../data.js';

let filterCat = 'all';

export function render(container) {
  container.innerHTML = buildPage();
  lucide.createIcons();
  bindEvents(container);
}

function buildPage() {
  const all      = Resources.getAll();
  const lowStock = Resources.getLowStock();
  const cats     = [...new Set(all.map(r => r.category).filter(Boolean))];
  const filtered = filterCat === 'all' ? all : all.filter(r => r.category === filterCat);
  const totalValue = all.reduce((s,r) => s + (parseFloat(r.quantity)||0) * (parseFloat(r.costPerUnit)||0), 0);

  return `
  <div class="page-enter">
    <div class="page-header">
      <div class="page-header-left">
        <h1>${t('res2.title')}</h1>
        <p>${t('res2.subtitle')}</p>
      </div>
      <div class="page-header-actions">
        ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
        <button class="btn btn-primary" id="add-item-btn">
          <i data-lucide="plus"></i> ${t('res2.add')}
        </button>
        `}
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card stat-blue">
        <div class="stat-icon"><i data-lucide="package-2"></i></div>
        <div class="stat-value">${all.length}</div>
        <div class="stat-label">Total Items</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-icon"><i data-lucide="alert-triangle"></i></div>
        <div class="stat-value">${lowStock.length}</div>
        <div class="stat-label">${t('res2.low_stock')}</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><i data-lucide="layers"></i></div>
        <div class="stat-value">${cats.length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card stat-gold">
        <div class="stat-icon"><i data-lucide="banknote"></i></div>
        <div class="stat-value">${formatCurrency(totalValue)}</div>
        <div class="stat-label">Inventory Value</div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    ${lowStock.length > 0 ? `
    <div class="alert alert-warning">
      <i data-lucide="alert-triangle"></i>
      <div>
        <strong>${t('res2.low_stock')}:</strong>
        ${lowStock.map(r => `<span class="tag" style="margin:2px">${escHtml(r.name)} (${r.quantity} ${r.unit||'units'})</span>`).join('')}
      </div>
    </div>` : ''}

    <!-- Filters -->
    <div class="filter-bar">
      <button class="filter-btn ${filterCat==='all'?'active':''}" data-cat="all">All</button>
      ${cats.map(c => `
        <button class="filter-btn ${filterCat===c?'active':''}" data-cat="${escHtml(c)}">${escHtml(c)}</button>
      `).join('')}
    </div>

    <!-- Inventory Table -->
    ${filtered.length === 0
      ? `<div class="empty-state">
           <div class="empty-icon"><i data-lucide="package-x"></i></div>
           <h3>${t('res2.no_items')}</h3>
           <p>${t('res2.add_first')}</p>
           ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
           <button class="btn btn-primary" style="margin-top:16px" id="add-item-empty">
             <i data-lucide="plus"></i> ${t('res2.add')}
           </button>
           `}
         </div>`
      : `<div class="card">
           <div class="table-wrapper">
             <table class="data-table">
               <thead>
                 <tr>
                   <th>${t('res2.item_name')}</th>
                   <th>${t('res2.category')}</th>
                   <th>${t('res2.quantity')}</th>
                   <th>Min Level</th>
                   <th>Stock Level</th>
                   <th>${t('res2.cost_per_unit')}</th>
                   <th>${t('res2.supplier')}</th>
                   <th>Last Restocked</th>
                   <th>${t('common.actions')}</th>
                 </tr>
               </thead>
               <tbody>
                 ${filtered.map(itemRow).join('')}
               </tbody>
             </table>
           </div>
         </div>`
    }
  </div>`;
}

function itemRow(r) {
  const qty     = parseFloat(r.quantity) || 0;
  const minLvl  = parseFloat(r.minLevel)  || 0;
  const pct     = minLvl > 0 ? Math.min(100, (qty / (minLvl * 2)) * 100) : 100;
  const isLow   = qty <= minLvl;
  const barColor = isLow ? 'var(--red)' : pct < 60 ? 'var(--orange)' : 'var(--green)';

  return `
  <tr>
    <td>
      <div style="font-weight:600">${escHtml(r.name)}</div>
      ${isLow ? '<div style="font-size:11px;color:var(--red)">⚠ Low stock</div>' : ''}
    </td>
    <td><span class="tag">${escHtml(r.category||'General')}</span></td>
    <td>
      <span style="font-size:16px;font-weight:800;color:${isLow?'var(--red)':'var(--text-primary)'}">${qty}</span>
      <span style="font-size:11px;color:var(--text-muted);margin-left:4px">${escHtml(r.unit||'units')}</span>
    </td>
    <td style="color:var(--text-muted);font-size:12px">${minLvl} ${escHtml(r.unit||'')}</td>
    <td style="width:120px">
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${Math.round(pct)}%</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
    </td>
    <td style="color:var(--gold);font-weight:700">${r.costPerUnit ? formatCurrency(r.costPerUnit) : '—'}</td>
    <td style="font-size:12px;color:var(--text-secondary)">${escHtml(r.supplier||'—')}</td>
    <td style="font-size:11px;color:var(--text-muted)">${formatDate(r.lastRestocked)}</td>
    <td>
      ${Auth.getCurrentUser()?.role === 'superuser' ? '' : `
      <div class="actions-cell">
        <button class="btn btn-sm btn-success restock-btn" data-id="${r.id}" title="${t('res2.restock')}">
          <i data-lucide="plus-circle"></i>
        </button>
        <button class="btn btn-sm btn-ghost edit-item-btn" data-id="${r.id}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-item-btn" data-id="${r.id}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      `}
    </td>
  </tr>`;
}

function bindEvents(container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('button, [data-cat]');
    if (!btn) return;

    if (btn.id === 'add-item-btn' || btn.id === 'add-item-empty') { openItemForm(container); }
    else if (btn.classList.contains('edit-item-btn')) { openItemForm(container, btn.dataset.id); }
    else if (btn.classList.contains('restock-btn')) { openRestockModal(container, btn.dataset.id); }
    else if (btn.classList.contains('delete-item-btn')) {
      const item = Resources.getById(btn.dataset.id);
      showConfirm(`Delete "${item?.name}"?`, t('common.delete_confirm'), () => {
        Resources.delete(btn.dataset.id);
        showToast('Item deleted', '', 'success');
        render(container);
      });
    } else if (btn.dataset.cat !== undefined) {
      filterCat = btn.dataset.cat;
      render(container);
    }
  });
}

function openItemForm(container, id = null) {
  const item = id ? Resources.getById(id) : null;
  openModal(item ? t('res2.edit') : t('res2.add'), `
    <form id="item-form" class="form-grid">
      <div class="form-group span-2">
        <label>${t('res2.item_name')} *</label>
        <input class="form-input" name="name" value="${item?.name||''}" required placeholder="e.g. Bath Towels">
      </div>
      <div class="form-group">
        <label>${t('res2.category')}</label>
        <input class="form-input" name="category" value="${item?.category||''}" list="res-cats" placeholder="e.g. Linens">
        <datalist id="res-cats">
          <option value="Linens"><option value="Toiletries"><option value="Food">
          <option value="Supplies"><option value="Equipment"><option value="Cleaning">
        </datalist>
      </div>
      <div class="form-group">
        <label>${t('res2.unit')}</label>
        <input class="form-input" name="unit" value="${item?.unit||''}" placeholder="e.g. pcs, kg, boxes">
      </div>
      <div class="form-group">
        <label>${t('res2.quantity')} *</label>
        <input class="form-input" name="quantity" type="number" min="0" value="${item?.quantity||0}" required>
      </div>
      <div class="form-group">
        <label>${t('res2.min_level')}</label>
        <input class="form-input" name="minLevel" type="number" min="0" value="${item?.minLevel||0}" placeholder="Alert below this">
      </div>
      <div class="form-group">
        <label>${t('res2.cost_per_unit')}</label>
        <input class="form-input" name="costPerUnit" type="number" min="0" step="0.01" value="${item?.costPerUnit||''}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>${t('res2.supplier')}</label>
        <input class="form-input" name="supplier" value="${item?.supplier||''}" placeholder="Supplier name">
      </div>
      <div class="form-actions span-2">
        <button type="button" class="btn btn-ghost" id="cancel-item">Cancel</button>
        <button type="submit" class="btn btn-primary">${t('common.save')}</button>
      </div>
    </form>
  `);

  document.getElementById('cancel-item')?.addEventListener('click', closeModal);
  document.getElementById('item-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (item) {
      Resources.update(id, data);
      showToast('Item updated', `${data.name} updated`, 'success');
    } else {
      Resources.add(data);
      showToast('Item added', `${data.name} added to inventory`, 'success');
    }
    closeModal();
    render(container);
  });
}

function openRestockModal(container, id) {
  const item = Resources.getById(id);
  openModal(`${t('res2.restock')} — ${item?.name}`, `
    <div style="text-align:center;padding:8px 0">
      <p style="color:var(--text-secondary);margin-bottom:6px">Current stock:</p>
      <div style="font-size:32px;font-weight:800;color:var(--gold)">${item?.quantity} <span style="font-size:16px;color:var(--text-muted)">${item?.unit||'units'}</span></div>
      <p style="color:var(--text-muted);font-size:12px;margin-top:4px">Minimum level: ${item?.minLevel||0} ${item?.unit||''}</p>
    </div>
    <form id="restock-form" style="margin-top:20px">
      <div class="form-group">
        <label>Add Quantity *</label>
        <input class="form-input" name="qty" type="number" min="1" value="10" required autofocus>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="cancel-restock">Cancel</button>
        <button type="submit" class="btn btn-success">
          <i data-lucide="plus-circle"></i> Add Stock
        </button>
      </div>
    </form>
  `);

  lucide.createIcons();
  document.getElementById('cancel-restock')?.addEventListener('click', closeModal);
  document.getElementById('restock-form').addEventListener('submit', e => {
    e.preventDefault();
    const qty = parseFloat(new FormData(e.target).get('qty'));
    if (qty > 0) {
      Resources.restock(id, qty);
      showToast('Restocked', `Added ${qty} ${item?.unit||'units'} to ${item?.name}`, 'success');
      closeModal();
      render(container);
    }
  });
}

function escHtml(v) {
  if (v == null) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
