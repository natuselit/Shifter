import { registerSW } from 'virtual:pwa-register';

export function registerAppServiceWorker() {
  registerSW({ immediate: true });
}
