export function registerSW() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta as any).env?.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Hostel Ease PWA Service Worker registered:', reg.scope);
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update found, reload to show newest build
                  window.location.reload();
                }
              };
            }
          };
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  }
}
