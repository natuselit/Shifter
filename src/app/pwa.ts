import { registerSW } from 'virtual:pwa-register';

export function registerAppServiceWorker() {
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateServiceWorker(true);
    }
  });
}
