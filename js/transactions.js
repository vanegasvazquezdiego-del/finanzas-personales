/* transactions.js — Tabla, filtros, formulario y exportación */
import { applyFilters, deleteTransaction, downloadCSV, toCSV, getCurrency, fmtTime12h } from './store.js';
import { fmtMoney } from './charts.js';

export function renderTable(tbodyId, list, onEdit, onDelete) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Sin transacciones con estos filtros. Agrega una nueva o ajusta la búsqueda.</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  for (const t of list) {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60';
    const badge = t.type === 'ingreso'
      ? '<span class="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Ingreso</span>'
      : '<span class="px-2 py-1 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Gasto</span>';
    const amountCls = t.type === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const sign = t.type === 'ingreso' ? '+' : '−';
    tr.innerHTML = `
      <td class="px-4 py-3 whitespace-nowrap">${escapeHtml(t.date)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${escapeHtml(fmtTime12h(t.time))}</td>
      <td class="px-4 py-3">${badge}</td>
      <td class="px-4 py-3">${escapeHtml(t.category)}</td>
      <td class="px-4 py-3">${escapeHtml(t.note || '—')}</td>
      <td class="px-4 py-3 text-right font-semibold ${amountCls}">${sign}${fmtMoney(t.amount)}</td>
      <td class="px-4 py-3 text-right whitespace-nowrap">
        <button data-act="edit" class="px-2 py-1 text-xs rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300">Editar</button>
        <button data-act="del" class="px-2 py-1 text-xs rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">Eliminar</button>
      </td>`;
    tr.querySelector('[data-act="edit"]').addEventListener('click', () => onEdit(t.id));
    tr.querySelector('[data-act="del"]').addEventListener('click', () => onDelete(t.id));
    frag.appendChild(tr);
  }
  tbody.appendChild(frag);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* Exportación PDF con jsPDF + autotable (CDN). Fallback a impresión. */
export async function exportPDF(list, meta) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    // Fallback: construye área imprimible
    buildPrintArea(list, meta);
    window.print();
    return;
  }
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(16);
  doc.text('Reporte de Finanzas Personales', 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleString('es')}  |  Transacciones: ${list.length}  |  ${meta || ''}`, 40, 68);
  const cur = getCurrency().code;
  const rows = list.map((t) => [t.date, fmtTime12h(t.time), t.type, t.category, Number(t.amount).toFixed(2), t.note || '']);
  doc.autoTable({
    startY: 85,
    head: [['Fecha', 'Hora', 'Tipo', 'Categoría', `Monto (${cur})`, 'Nota']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] }
  });
  doc.save(`finanzas-reporte-${new Date().toISOString().slice(0, 10)}.csv`.replace('.csv', '.pdf'));
}

function buildPrintArea(list, meta) {
  let area = document.getElementById('print-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'print-area';
    area.style.display = 'none';
    document.body.appendChild(area);
  }
  area.innerHTML = `<h1>Reporte de Finanzas Personales</h1><p>${escapeHtml(meta || '')} — ${list.length} transacciones</p>` +
    `<table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Categoría</th><th>Monto</th><th>Nota</th></tr></thead><tbody>` +
    list.map((t) => `<tr><td>${escapeHtml(t.date)}</td><td>${escapeHtml(fmtTime12h(t.time))}</td><td>${escapeHtml(t.type)}</td><td>${escapeHtml(t.category)}</td><td>${escapeHtml(String(t.amount))}</td><td>${escapeHtml(t.note || '')}</td></tr>`).join('') +
    `</tbody></table>`;
  area.style.display = 'block';
}

export { applyFilters, deleteTransaction, downloadCSV, toCSV };
