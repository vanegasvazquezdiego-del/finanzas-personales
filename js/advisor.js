/* advisor.js — Regla 50/30/20 + alertas por categoría */
import { NEEDS, WANTS, getCurrency } from './store.js';
import { fmtMoney } from './charts.js';

export function analyze50503020(monthTx) {
  const income = sumBy(monthTx, 'ingreso');
  const expense = sumBy(monthTx, 'gasto');
  const needs = sumByCat(monthTx, NEEDS);
  const wants = sumByCat(monthTx, WANTS);
  const savings = income - expense;

  const pNeeds = income > 0 ? (needs / income) * 100 : 0;
  const pWants = income > 0 ? (wants / income) * 100 : 0;
  const pSave = income > 0 ? (savings / income) * 100 : 0;

  const tips = [];
  if (income <= 0) {
    tips.push({ level: 'info', text: 'Registra tus ingresos del mes para activar el análisis 50/30/20.' });
    return { income, expense, needs, wants, savings, pNeeds, pWants, pSave, tips };
  }
  // Necesidades
  if (pNeeds <= 50) tips.push({ level: 'ok', text: `Necesidades bajo control: ${pNeeds.toFixed(1)}% de tus ingresos (objetivo ≤ 50%). ¡Bien!` });
  else if (pNeeds <= 60) tips.push({ level: 'warn', text: `Necesidades en ${pNeeds.toFixed(1)}%: ligeramente sobre el 50%. Revisa vivienda, servicios o compra semanal.` });
  else tips.push({ level: 'bad', text: `Necesidades en ${pNeeds.toFixed(1)}%: muy por encima del 50%. Considera renegociar servicios, reducir transporte o planificar comidas.` });
  // Caprichos
  if (pWants <= 30) tips.push({ level: 'ok', text: `Caprichos en ${pWants.toFixed(1)}% (objetivo ≤ 30%). Equilibrio saludable.` });
  else tips.push({ level: 'warn', text: `Caprichos en ${pWants.toFixed(1)}%: superas el 30%. Pon un tope semanal a ocio/compras.` });
  // Ahorro
  if (pSave >= 20) tips.push({ level: 'ok', text: `Ahorro del ${pSave.toFixed(1)}% (${fmtMoney(savings)}). Estás cumpliendo la regla 50/30/20.` });
  else if (pSave >= 0) tips.push({ level: 'warn', text: `Ahorro del ${pSave.toFixed(1)}%: por debajo del 20%. Automatiza una transferencia del 10–20% al cobrar.` });
  else tips.push({ level: 'bad', text: `Balance negativo (${fmtMoney(savings)}). Gastas más de lo que ingresas: recorta caprichos primero.` });
  // Hábito: categoría dominante
  const top = topCategory(monthTx);
  if (top) tips.push({ level: 'info', text: `Tu mayor gasto es "${top.cat}" con ${fmtMoney(top.total)}. ${suggestFor(top.cat)}` });

  return { income, expense, needs, wants, savings, pNeeds, pWants, pSave, tips };
}

function sumBy(list, type) {
  return list.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
}
function sumByCat(list, cats) {
  return list.filter((t) => t.type === 'gasto' && cats.includes(t.category)).reduce((a, t) => a + Number(t.amount), 0);
}
function topCategory(list) {
  const m = {};
  for (const t of list) if (t.type === 'gasto') m[t.category] = (m[t.category] || 0) + Number(t.amount);
  const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
  return entries.length ? { cat: entries[0][0], total: entries[0][1] } : null;
}
function suggestFor(cat) {
  const map = {
    Comida: 'Prueba planificar menú semanal y lista cerrada de supermercado.',
    Transporte: 'Compara abono mensual vs. pago por viaje y comparte trayectos.',
    Ocio: 'Fija un presupuesto semanal de ocio en efectivo o tarjeta separada.',
    Compras: 'Aplica la regla de 48h antes de compras no esenciales.',
    Servicios: 'Revisa tarifas de luz/internet/móvil una vez al trimestre.',
    Vivienda: 'El alquiler no debería superar el 30–35% de tus ingresos.'
  };
  return map[cat] || 'Define un límite mensual para esa categoría.';
}

/* Render de presupuestos + alertas */
export function renderBudgets(containerId, monthTx, budgets, onSave) {
  const box = document.getElementById(containerId);
  if (!box) return;
  const spent = {};
  for (const t of monthTx) if (t.type === 'gasto') spent[t.category] = (spent[t.category] || 0) + Number(t.amount);

  box.innerHTML = '';
  for (const [cat, limit] of Object.entries(budgets)) {
    const used = spent[cat] || 0;
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    const over = limit > 0 && used > limit;
    const warn = !over && limit > 0 && used / limit >= 0.8;
    const color = over ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-emerald-500';
    const badge = over
      ? '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">⛔ Límite superado</span>'
      : warn
        ? '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">⚠️ Cerca del límite</span>'
        : '<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">✓ OK</span>';
    const row = document.createElement('div');
    row.className = 'p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900';
    row.innerHTML = `
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="font-medium">${cat} ${badge}</div>
        <div class="text-sm text-slate-500 dark:text-slate-400">${fmtMoney(used)} / ${fmtMoney(limit)}</div>
      </div>
      <div class="progress-track mt-2"><div class="progress-fill ${color}" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="mt-2 flex items-center gap-2">
        <label class="text-xs text-slate-500">Límite ${getCurrency().symbol}</label>
        <input type="number" min="0" step="1" value="${limit}" data-cat="${cat}"
          class="w-28 px-2 py-1 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent" />
      </div>`;
    box.appendChild(row);
  }
  box.querySelectorAll('input[data-cat]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const v = Math.max(0, Number(inp.value) || 0);
      onSave(inp.dataset.cat, v);
    });
  });
}
