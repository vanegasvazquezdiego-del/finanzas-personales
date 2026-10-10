/* charts.js — Gráficos con Chart.js */
import { getCurrency } from './store.js';

let doughnutChart = null;
let monthlyChart = null;

const PALETTE = [
  '#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
  '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#64748b'
];

function themeColors() {
  const dark = document.documentElement.classList.contains('dark');
  return {
    tick: dark ? '#cbd5e1' : '#475569',
    grid: dark ? 'rgba(148,163,184,.15)' : 'rgba(100,116,139,.2)'
  };
}

export function renderCategoryChart(canvasId, byCategory) {
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === 'undefined') return;
  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(el, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sin gastos'],
      datasets: [{
        data: data.length ? data : [1],
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${fmtMoney(ctx.parsed)}`
          }
        }
      },
      cutout: '62%'
    }
  });
}

export function renderMonthlyChart(canvasId, months) {
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === 'undefined') return;
  const { tick, grid } = themeColors();
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(el, {
    type: 'bar',
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        { label: 'Ingresos', data: months.map((m) => m.income), backgroundColor: '#10b981', borderRadius: 6 },
        { label: 'Gastos', data: months.map((m) => m.expense), backgroundColor: '#ef4444', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: tick }, grid: { display: false } },
        y: {
          ticks: { color: tick, callback: (v) => getCurrency().symbol + v },
          grid: { color: grid }, beginAtZero: true
        }
      },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

export function refreshChartsTheme() {
  // Re-render con colores de tema: se llama desde app.js guardando últimos datos
  if (typeof window.__repaintCharts === 'function') window.__repaintCharts();
}

export function fmtMoney(n) {
  const c = getCurrency();
  return new Intl.NumberFormat(c.locale, { style: 'currency', currency: c.code }).format(Number(n) || 0);
}
