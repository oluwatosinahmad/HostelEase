export function registerSW() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta as any).env?.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Hostel Ease PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  }
}
