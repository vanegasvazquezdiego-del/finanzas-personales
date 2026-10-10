# Finanzas Personales — PWA de gestión y control de gastos

🌐 **En línea 24/7:** https://vanegasvazquezdiego-del.github.io/finanzas-personales/
· 💻 Repo: https://github.com/vanegasvazquezdiego-del/finanzas-personales

Aplicación web profesional, sin build y sin backend. HTML5 + Tailwind CSS + JavaScript vanilla (módulos ES) + Chart.js. Datos 100% locales (LocalStorage). Instalable en escritorio como PWA.

## Estructura

```
finanzas-personales/
├── index.html          # UI: dashboard, transacciones, asesoría
├── manifest.json       # Config PWA
├── service-worker.js   # Cache offline
├── css/styles.css      # Estilos complementarios
├── js/
│   ├── store.js        # Persistencia, CRUD, filtros, CSV, agregados
│   ├── charts.js       # Chart.js: doughnut + barras
│   ├── transactions.js # Tabla, PDF, helpers
│   ├── advisor.js      # Regla 50/30/20 + presupuestos/alertas
│   ├── pwa.js          # Instalación + Service Worker
│   └── app.js          # Orquestación, tema, eventos
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## Activo todo el tiempo

El servidor corre como **tarea programada de Windows** (`FinanzasPersonales`):
se inicia solo 1 minuto después de iniciar sesión, sin límite de tiempo,
con 3 reintentos automáticos si falla, y funciona con batería.
Verla con `Get-ScheduledTask -TaskName FinanzasPersonales`.
Si alguna vez se detiene: `Start-ScheduledTask -TaskName FinanzasPersonales`
o doble clic en `iniciar-finanzas.bat`.

## Cómo ejecutar (manual)

No requiere Node ni compilación. Elige una opción:

**Opción A — Doble clic (solo consulta):**
Abre `index.html` en Chrome/Edge. Funciona, excepto el Service Worker (no corre en `file://` por seguridad del navegador).

**Opción B — Servidor local (recomendado, activa PWA):**

```powershell
# Python
cd finanzas-personales
python -m http.server 8080
# abre http://localhost:8080
```

```powershell
# Node
npx serve -l 8080 finanzas-personales
# o
npx http-server finanzas-personales -p 8080
```

```powershell
# VS Code: extensión "Live Server" → clic derecho en index.html → Open with Live Server
```

> Servir por `http://localhost` es necesario para que el Service Worker y el `manifest.json` funcionen.

## Cómo instalar en el escritorio (PWA paso a paso)

Requisitos: servir la app por `http://localhost` o `https://` (no `file://`), usar Chrome o Edge.

**Chrome / Edge (Windows):**
1. Abre la app (`http://localhost:8080`).
2. Opción 1: pulsa el botón verde **"⤓ Instalar en el Escritorio"** (arriba a la derecha). Si el navegador lo permite, verás el diálogo de instalación.
3. Opción 2 (nativa): icono **Instalar** (⤓/💻) en la barra de direcciones → *Instalar*.
4. Opción 3 (manual): menú **⋮ → Instalar Finanzas Personales / Apps → Instalar**.
5. Se abre como ventana independiente sin barra de navegación. Queda en escritorio/inicio y funciona offline.

**Si el botón muestra ayuda en lugar de instalar:**
Es porque el navegador aún no emitió `beforeinstallprompt` (normal la primera vez o sin HTTPS). Usa la opción 2/3 del menú, que es la instalación nativa equivalente.

**Desinstalar:** en la app instalada → menú ⋮ → *Desinstalar*; o Windows → *Configuración → Aplicaciones*.

**Android:** menú ⋮ → *Añadir a pantalla de inicio / Instalar app*.
**iOS (Safari):** *Compartir → Añadir a pantalla de inicio* (límite de iOS, no es instalable Chromium).

**Verificar PWA:** DevTools (F12) → pestaña *Application → Manifest* (debe cargar nombre, iconos 192/512, start_url) y *Service Workers* (registrado y en ejecución).

## Funcionalidades

- **Dashboard:** saldo total histórico, ingresos/egresos/balance del mes (selector de mes), doughnut de gastos por categoría y barras de evolución 6 meses.
- **Transacciones:** formulario ingreso/gasto (fecha, categoría, monto, nota), editar/eliminar, filtros por fechas + categoría + tipo + buscador en tiempo real, exportar CSV y PDF (jsPDF, con fallback a impresión).
- **Asesoría 50/30/20:** % necesidades/caprichos/ahorro sobre ingresos del mes, barras y consejos dinámicos según hábitos + categoría dominante.
- **Alertas:** límites mensuales editables por categoría; badge ✓ OK / ⚠️ 80% / ⛔ superado con barra de progreso.
- **Persistencia:** `localStorage` (`finanzas.transactions.v1`, `finanzas.budgets.v1`, `finanzas.theme.v1`). Botones *Cargar demo* y *Borrar todo*.
- **Moneda:** selector en el header (EUR, USD, MXN, COP, ARS, CLP, PEN, GBP). Se guarda en `localStorage` y actualiza KPIs, gráficos, tabla, asesoría, límites y PDF.
- **Tema:** modo oscuro/claro con Tailwind `darkMode:'class'`, respeta `prefers-color-scheme` y se guarda.

## Notas técnicas

- Sin dependencias de build; CDN: Tailwind, Chart.js 4, jsPDF + autotable.
- Service Worker con estrategia cache-first + actualización en segundo plano; bump a `CACHE_NAME` para nuevas versiones.
- Moneda: EUR (`es-ES`); cambia `fmtMoney` en `js/charts.js` para otra moneda.
