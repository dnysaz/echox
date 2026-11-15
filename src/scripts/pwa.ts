interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'echox:install-dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const banner = document.getElementById('install-banner');
const installButton = document.getElementById('install-go') as HTMLButtonElement | null;
const dismissButton = document.getElementById('install-close');

const hideBanner = () => banner?.setAttribute('hidden', '');
const showBanner = () => banner?.removeAttribute('hidden');

let deferredPrompt: InstallPromptEvent | null = null;

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline support is optional */
    });
  });
};

const setupInstallPrompt = () => {
  if (!banner || isStandalone()) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    if (!localStorage.getItem(DISMISS_KEY)) showBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideBanner();
  });

  installButton?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') hideBanner();
  });

  dismissButton?.addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    hideBanner();
  });

  // iOS never fires beforeinstallprompt, so explain the manual step instead.
  if (isIos() && !localStorage.getItem(DISMISS_KEY)) {
    const hint = banner.querySelector('.install-copy span');
    if (hint) hint.textContent = 'Tap Share, then “Add to Home Screen”.';
    installButton?.setAttribute('hidden', '');
    window.setTimeout(() => {
      if (!isStandalone() && !localStorage.getItem(DISMISS_KEY)) showBanner();
    }, 4000);
  }
};

/**
 * Mobile browsers should not zoom the app: it is a full-screen player, not a
 * document. iOS ignores user-scalable=no, hence the gesture guards below.
 */
const lockZoom = () => {
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('gesturechange', (event) => event.preventDefault());
  document.addEventListener('gestureend', (event) => event.preventDefault());
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) event.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length > 1) event.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
};

lockZoom();
registerServiceWorker();
setupInstallPrompt();
