/* pwa.js — Instalación en escritorio + registro del Service Worker */
let deferredPrompt = null;

export function initPWA({ installBtnId = 'btn-install' } = {}) {
  // Registrar SW solo en http(s), no en file://
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((e) => console.warn('SW:', e));
    });
  }

  const btn = document.getElementById(installBtnId);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btn) {
      btn.classList.remove('hidden');
      btn.disabled = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (btn) btn.classList.add('hidden');
    toast('App instalada. Ya puedes abrirla desde el escritorio.');
  });

  if (btn) {
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        btn.classList.add('hidden');
      } else {
        showInstallHelp();
      }
    });
  }

  // Si ya está instalada en modo standalone, oculta el botón
  if (window.matchMedia('(display-mode: standalone)').matches && btn) {
    btn.classList.add('hidden');
  }
}

function showInstallHelp() {
  const isChrome = /Chrome|Edge|Brave/i.test(navigator.userAgent);
  toast(isChrome
    ? 'Usa el icono ⤓ Instalar en la barra de direcciones, o menú ⋮ → Instalar app.'
    : 'Usa Compartir → Añadir a pantalla de inicio (móvil) o menú → Instalar (escritorio).', 5000);
}

export function toast(msg, ms = 3000) {
  const el = document.getElementById('toast');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateY(10px)';
    setTimeout(() => el.classList.add('hidden'), 320);
  }, ms);
}
