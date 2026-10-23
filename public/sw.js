// سرویس‌ورکر اِوالو: بارگذاری آفلاین پس از اولین باز شدن.
// استراتژی: ناوبری و فایل‌های هم‌مبدأ GET → «اول شبکه، در صورت قطعی کش»؛ فایل‌های هش‌دار → «اول کش».
// برای به‌روزرسانی، عدد VERSION را عوض کن؛ کش‌های قدیمی هنگام activate پاک می‌شوند.
const VERSION = 'evolve-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const isHashed = (url) => /\/assets\/.+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/.test(url.pathname) || url.pathname.includes('/fonts/');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isHashed(url)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
