import { registerSW } from 'virtual:pwa-register';

export function registerAppServiceWorker() {
  let refreshing = false;

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) {
      return;
    }

    refreshing = true;
    window.location.reload();
  });

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateServiceWorker(true);
    }
  });
}
