/* app.js — Orquestación general */
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES,
  loadTransactions, saveTransactions, loadBudgets, saveBudgets,
  addTransaction, updateTransaction, deleteTransaction,
  monthKey, filterByMonth, totals, expensesByCategory, lastMonths,
  seedDemo, CURRENCIES, getCurrency, setCurrency
} from './store.js';
import { renderCategoryChart, renderMonthlyChart, fmtMoney } from './charts.js';
import { renderTable, exportPDF } from './transactions.js';
import { analyze50503020, renderBudgets } from './advisor.js';
import { initPWA, toast } from './pwa.js';
import { downloadCSV } from './store.js';

const state = {
  tx: loadTransactions(),
  budgets: loadBudgets(),
  editingId: null,
  filters: { from: '', to: '', category: '', q: '', type: '' },
  currentMonth: monthKey(new Date())
};

const $ = (id) => document.getElementById(id);

/* ---------- Tema ---------- */
function initTheme() {
  const saved = localStorage.getItem('finanzas.theme.v1');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.classList.toggle('dark', dark);
  updateThemeBtn();
}
function updateThemeBtn() {
  const dark = document.documentElement.classList.contains('dark');
  $('btn-theme').textContent = dark ? '☀️ Claro' : '🌙 Oscuro';
}

/* ---------- Dashboard ---------- */
function paintDashboard() {
  const monthTx = filterByMonth(state.tx, state.currentMonth);
  const tMonth = totals(monthTx);
  const tAll = totals(state.tx);

  $('kpi-balance').textContent = fmtMoney(tAll.net);
  $('kpi-income').textContent = fmtMoney(tMonth.income);
  $('kpi-expense').textContent = fmtMoney(tMonth.expense);
  $('kpi-net').textContent = fmtMoney(tMonth.net);
  $('kpi-net').className = 'text-2xl font-bold ' + (tMonth.net >= 0
    ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400');
  $('month-label').textContent = new Date(state.currentMonth + '-02')
    .toLocaleDateString('es', { month: 'long', year: 'numeric' });

  const byCat = expensesByCategory(monthTx);
  renderCategoryChart('chart-category', byCat);
  renderMonthlyChart('chart-monthly', lastMonths(state.tx, 6));
  window.__repaintCharts = () => {
    renderCategoryChart('chart-category', expensesByCategory(filterByMonth(state.tx, state.currentMonth)));
    renderMonthlyChart('chart-monthly', lastMonths(state.tx, 6));
  };

  paintAdvisor(monthTx);
}

function paintAdvisor(monthTx) {
  const r = analyze50503020(monthTx);
  $('rule-needs').textContent = `${r.pNeeds.toFixed(1)}% (${fmtMoney(r.needs)})`;
  $('rule-wants').textContent = `${r.pWants.toFixed(1)}% (${fmtMoney(r.wants)})`;
  $('rule-save').textContent = `${r.pSave.toFixed(1)}% (${fmtMoney(r.savings)})`;
  $('bar-needs').style.width = Math.min(100, r.pNeeds) + '%';
  $('bar-wants').style.width = Math.min(100, r.pWants) + '%';
  $('bar-save').style.width = Math.min(100, Math.max(0, r.pSave)) + '%';

  const box = $('tips-list');
  box.innerHTML = '';
  const colors = {
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800',
    warn: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
    bad: 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
    info: 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800'
  };
  const icons = { ok: '✅', warn: '⚠️', bad: '🚨', info: '💡' };
  for (const tip of r.tips) {
    const div = document.createElement('div');
    div.className = `p-3 rounded-xl border text-sm ${colors[tip.level] || colors.info}`;
    div.textContent = `${icons[tip.level] || '💡'} ${tip.text}`;
    box.appendChild(div);
  }

  renderBudgets('budgets-list', monthTx, state.budgets, (cat, val) => {
    state.budgets[cat] = val;
    saveBudgets(state.budgets);
    paintAdvisor(filterByMonth(state.tx, state.currentMonth));
    toast(`Límite de ${cat} actualizado a ${fmtMoney(val)}`);
  });
}

/* ---------- Transacciones ---------- */
function fillCategorySelects() {
  const selForm = $('f-category');
  const selFilter = $('flt-category');
  const currentType = $('f-type').value;
  const cats = currentType === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  selForm.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join('');
  if (!selFilter.dataset.filled) {
    selFilter.innerHTML = '<option value="">Todas las categorías</option>' +
      ALL_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
    selFilter.dataset.filled = '1';
  }
}

function filteredTx() {
  const key = (t) => `${t.date} ${t.time || ''}`;
  const sorted = [...state.tx].sort((a, b) => (key(a) < key(b) ? 1 : -1));
  const { from, to, category, q, type } = state.filters;
  const query = q.trim().toLowerCase();
  return sorted.filter((t) => {
    if (type && t.type !== type) return false;
    if (category && t.category !== category) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (query && !`${t.category} ${t.note} ${t.amount} ${t.date} ${t.time || ''}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function paintTable() {
  const list = filteredTx();
  renderTable('tx-body', list,
    (id) => startEdit(id),
    (id) => {
      if (!confirm('¿Eliminar esta transacción?')) return;
      state.tx = deleteTransaction(state.tx, id);
      saveTransactions(state.tx);
      refreshAll();
      toast('Transacción eliminada.');
    });
  $('tx-count').textContent = `${list.length} transacción(es)`;
}

function startEdit(id) {
  const t = state.tx.find((x) => x.id === id);
  if (!t) return;
  state.editingId = id;
  $('f-type').value = t.type;
  fillCategorySelects();
  $('f-category').value = t.category;
  $('f-date').value = t.date;
  $('f-time').value = t.time || '';
  $('f-amount').value = t.amount;
  $('f-note').value = t.note || '';
  $('form-title').textContent = 'Editar transacción';
  $('btn-cancel-edit').classList.remove('hidden');
  $('btn-submit').textContent = 'Guardar cambios';
  document.getElementById('transacciones').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  state.editingId = null;
  $('tx-form').reset();
  $('f-date').value = new Date().toISOString().slice(0, 10);
  $('f-time').value = nowTime();
  fillCategorySelects();
  $('form-title').textContent = 'Nueva transacción';
  $('btn-cancel-edit').classList.add('hidden');
  $('btn-submit').textContent = 'Agregar';
}

function refreshAll() {
  paintDashboard();
  paintTable();
}

/* ---------- Moneda ---------- */
function initCurrency() {
  const sel = $('currency-picker');
  sel.innerHTML = CURRENCIES.map((c) => `<option value="${c.code}">${c.code} ${c.symbol}</option>`).join('');
  sel.value = getCurrency().code;
  sel.title = getCurrency().name;
  paintCurrencyLabel();
  sel.addEventListener('change', () => {
    try {
      const c = setCurrency(sel.value);
      sel.title = c.name;
      paintCurrencyLabel();
      refreshAll();
      toast(`Moneda cambiada a ${c.name}.`);
    } catch (err) { toast(err.message, 4000); }
  });
}
function paintCurrencyLabel() {
  $('f-amount-label').textContent = `Monto (${getCurrency().symbol})`;
}

/* ---------- Init ---------- */
function bindEvents() {
  $('btn-theme').addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('finanzas.theme.v1', dark ? 'dark' : 'light');
    updateThemeBtn();
    window.__repaintCharts?.();
  });

  $('f-type').addEventListener('change', fillCategorySelects);

  $('tx-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      type: $('f-type').value,
      date: $('f-date').value,
      time: $('f-time').value,
      category: $('f-category').value,
      amount: $('f-amount').value,
      note: $('f-note').value
    };
    try {
      if (state.editingId) {
        state.tx = updateTransaction(state.tx, state.editingId, {
          ...payload, amount: Math.round(Number(payload.amount) * 100) / 100, note: payload.note.trim()
        });
        toast('Transacción actualizada.');
      } else {
        state.tx = addTransaction(state.tx, payload);
        toast('Transacción agregada.');
      }
      saveTransactions(state.tx);
      resetForm();
      refreshAll();
    } catch (err) {
      toast(err.message, 4000);
    }
  });

  $('btn-cancel-edit').addEventListener('click', resetForm);

  // Filtros en tiempo real
  for (const [id, key] of [['flt-from', 'from'], ['flt-to', 'to'], ['flt-category', 'category'], ['flt-type', 'type']]) {
    $(id).addEventListener('input', (e) => { state.filters[key] = e.target.value; paintTable(); });
    $(id).addEventListener('change', (e) => { state.filters[key] = e.target.value; paintTable(); });
  }
  $('flt-q').addEventListener('input', (e) => { state.filters.q = e.target.value; paintTable(); });
  $('btn-clear-filters').addEventListener('click', () => {
    state.filters = { from: '', to: '', category: '', q: '', type: '' };
    for (const id of ['flt-from', 'flt-to', 'flt-category', 'flt-q', 'flt-type']) $(id).value = '';
    paintTable();
  });

  // Mes del dashboard
  $('month-picker').addEventListener('change', (e) => {
    if (e.target.value) { state.currentMonth = e.target.value; paintDashboard(); }
  });
  $('btn-today-month').addEventListener('click', () => {
    state.currentMonth = monthKey(new Date());
    $('month-picker').value = state.currentMonth;
    paintDashboard();
  });

  // Exportación
  $('btn-csv').addEventListener('click', () => {
    const list = filteredTx();
    if (!list.length) return toast('No hay datos para exportar.');
    downloadCSV(list);
    toast('CSV descargado.');
  });
  $('btn-pdf').addEventListener('click', async () => {
    const list = filteredTx();
    if (!list.length) return toast('No hay datos para exportar.');
    toast('Generando PDF…');
    await exportPDF(list, `Mes: ${state.currentMonth}`);
  });

  // Datos demo / borrar
  $('btn-demo').addEventListener('click', () => {
    if (state.tx.length && !confirm('Esto añadirá datos de ejemplo. ¿Continuar?')) return;
    state.tx = [...seedDemo(), ...state.tx];
    saveTransactions(state.tx);
    refreshAll();
    toast('Datos de ejemplo cargados.');
  });
  $('btn-wipe').addEventListener('click', () => {
    if (!confirm('¿Borrar TODAS las transacciones? Esta acción no se puede deshacer.')) return;
    state.tx = [];
    saveTransactions(state.tx);
    refreshAll();
    toast('Datos eliminados.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCurrency();
  $('f-date').value = new Date().toISOString().slice(0, 10);
  $('f-time').value = nowTime();
  $('month-picker').value = state.currentMonth;
  fillCategorySelects();
  bindEvents();
  initPWA({ installBtnId: 'btn-install' });
  refreshAll();
});
