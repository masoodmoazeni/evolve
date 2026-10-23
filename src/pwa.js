import { Capacitor } from '@capacitor/core';

const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

// ثبت سرویس‌ورکر فقط در وب (نه اپ نیتیو) و روی https یا localhost؛ شکست آن اپ را خراب نمی‌کند
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || Capacitor.isNativePlatform()) return;
  if (location.protocol !== 'https:' && !isLocalhost) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
