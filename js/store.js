/* store.js — Persistencia en LocalStorage + lógica de datos */
const STORAGE_KEY = 'finanzas.transactions.v1';
const BUDGET_KEY = 'finanzas.budgets.v1';
const THEME_KEY = 'finanzas.theme.v1';
const CURRENCY_KEY = 'finanzas.currency.v1';

export const CURRENCIES = [
  { code: 'EUR', locale: 'es-ES', symbol: '€', name: 'Euro (€)' },
  { code: 'USD', locale: 'en-US', symbol: '$', name: 'Dólar EE. UU. ($)' },
  { code: 'MXN', locale: 'es-MX', symbol: '$', name: 'Peso mexicano ($)' },
  { code: 'COP', locale: 'es-CO', symbol: '$', name: 'Peso colombiano ($)' },
  { code: 'ARS', locale: 'es-AR', symbol: '$', name: 'Peso argentino ($)' },
  { code: 'CLP', locale: 'es-CL', symbol: '$', name: 'Peso chileno ($)' },
  { code: 'PEN', locale: 'es-PE', symbol: 'S/', name: 'Sol peruano (S/)' },
  { code: 'GBP', locale: 'en-GB', symbol: '£', name: 'Libra esterlina (£)' }
];

export function getCurrency() {
  try {
    const code = localStorage.getItem(CURRENCY_KEY) || 'EUR';
    return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
  } catch { return CURRENCIES[0]; }
}

export function setCurrency(code) {
  if (!CURRENCIES.some((c) => c.code === code)) throw new Error('Moneda no soportada.');
  localStorage.setItem(CURRENCY_KEY, code);
  return getCurrency();
}

export const EXPENSE_CATEGORIES = [
  'Comida', 'Transporte', 'Vivienda', 'Servicios',
  'Salud', 'Ocio', 'Compras', 'Educación', 'Otros gastos'
];

export const INCOME_CATEGORIES = [
  'Nómina', 'Freelance', 'Ventas', 'Inversiones', 'Otros ingresos'
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/* Necesidades vs Caprichos para la regla 50/30/20 */
export const NEEDS = ['Vivienda', 'Servicios', 'Comida', 'Transporte', 'Salud', 'Educación'];
export const WANTS = ['Ocio', 'Compras', 'Otros gastos'];

export const DEFAULT_BUDGETS = {
  Comida: 350, Transporte: 150, Vivienda: 700, Servicios: 180,
  Salud: 120, Ocio: 200, Compras: 250, 'Educación': 150, 'Otros gastos': 150
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* "18:30" -> "6:30 p. m." · "" o inválida -> "—" */
export function fmtTime12h(t) {
  if (!t || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return '—';
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveTransactions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function loadBudgets() {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return { ...DEFAULT_BUDGETS };
    return { ...DEFAULT_BUDGETS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_BUDGETS }; }
}

export function saveBudgets(b) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
}

export function validateTx({ type, date, category, amount, time }) {
  const errors = [];
  if (type !== 'ingreso' && type !== 'gasto') errors.push('Tipo inválido.');
  if (!date || Number.isNaN(Date.parse(date))) errors.push('Fecha inválida.');
  if (!category || !ALL_CATEGORIES.includes(category)) errors.push('Categoría inválida.');
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) errors.push('El monto debe ser mayor a 0.');
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.push('Hora inválida (usa formato HH:MM, 00:00–23:59).');
  return errors;
}

export function addTransaction(list, tx) {
  const errors = validateTx(tx);
  if (errors.length) throw new Error(errors.join(' '));
  const item = {
    id: uid(),
    type: tx.type,
    date: tx.date,
    time: (tx.time || '').slice(0, 5),
    category: tx.category,
    amount: Math.round(Number(tx.amount) * 100) / 100,
    note: (tx.note || '').trim().slice(0, 200),
    createdAt: new Date().toISOString()
  };
  return [item, ...list];
}

export function updateTransaction(list, id, patch) {
  const next = list.map((t) => (t.id === id ? { ...t, ...patch } : t));
  const target = next.find((t) => t.id === id);
  const errors = validateTx(target);
  if (errors.length) throw new Error(errors.join(' '));
  return next;
}

export function deleteTransaction(list, id) {
  return list.filter((t) => t.id !== id);
}

/* --- Agregados --- */
export function monthKey(d = new Date()) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export function filterByMonth(list, key) {
  return list.filter((t) => (t.date || '').slice(0, 7) === key);
}

export function totals(list) {
  let income = 0, expense = 0;
  for (const t of list) {
    if (t.type === 'ingreso') income += Number(t.amount) || 0;
    else expense += Number(t.amount) || 0;
  }
  return { income, expense, net: income - expense, balance: income - expense };
}

export function expensesByCategory(list) {
  const map = {};
  for (const t of list) {
    if (t.type !== 'gasto') continue;
    map[t.category] = (map[t.category] || 0) + Number(t.amount);
  }
  return map;
}

/* Últimos N meses incluyendo el actual: [{ key, label, income, expense }] */
export function lastMonths(list, n = 6) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString('es', { month: 'short' });
    const slice = filterByMonth(list, key);
    const t = totals(slice);
    out.push({ key, label, income: t.income, expense: t.expense, net: t.net });
  }
  return out;
}

export function applyFilters(list, { from = '', to = '', category = '', q = '', type = '' }) {
  const query = q.trim().toLowerCase();
  return list.filter((t) => {
    if (type && t.type !== type) return false;
    if (category && t.category !== category) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (query) {
      const hay = `${t.category} ${t.note} ${t.amount} ${t.date} ${t.type}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export function toCSV(list) {
  const header = ['id', 'tipo', 'fecha', 'hora', 'categoria', 'monto', 'nota'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = list.map((t) => [t.id, t.type, t.date, t.time || '', t.category, t.amount, t.note].map(esc).join(','));
  return [header.join(','), ...rows].join('\n');
}

export function downloadCSV(list, filename = 'finanzas-reporte.csv') {
  const csv = '﻿' + toCSV(list); // BOM para Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function seedDemo() {
  const today = new Date();
  const iso = (offsetDays) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const demo = [
    { type: 'ingreso', date: iso(2), time: '09:00', category: 'Nómina', amount: 2200, note: 'Salario mensual' },
    { type: 'ingreso', date: iso(9), time: '18:30', category: 'Freelance', amount: 450, note: 'Proyecto web' },
    { type: 'gasto', date: iso(1), time: '13:15', category: 'Comida', amount: 42.5, note: 'Supermercado' },
    { type: 'gasto', date: iso(2), time: '08:05', category: 'Transporte', amount: 18, note: 'Metro mensual' },
    { type: 'gasto', date: iso(3), time: '10:00', category: 'Vivienda', amount: 650, note: 'Alquiler' },
    { type: 'gasto', date: iso(4), time: '12:00', category: 'Servicios', amount: 85, note: 'Luz + internet' },
    { type: 'gasto', date: iso(5), time: '21:45', category: 'Ocio', amount: 60, note: 'Cine y cena' },
    { type: 'gasto', date: iso(6), time: '17:20', category: 'Salud', amount: 35, note: 'Farmacia' },
    { type: 'gasto', date: iso(12), time: '19:10', category: 'Compras', amount: 120, note: 'Ropa' },
    { type: 'gasto', date: iso(20), time: '11:30', category: 'Comida', amount: 95, note: 'Compra semanal' },
    { type: 'gasto', date: iso(35), time: '14:00', category: 'Comida', amount: 110, note: 'Mes anterior' },
    { type: 'ingreso', date: iso(32), time: '09:00', category: 'Nómina', amount: 2200, note: 'Salario anterior' },
  ];
  let list = [];
  for (const d of demo) list = addTransaction(list, d);
  return list.reverse();
}
