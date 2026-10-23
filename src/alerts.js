import { useEffect } from 'react';
import { db, getKV } from './db.js';
import { DEFAULT_NOTIF, buildSchedule, isNative } from './notify.js';
import { playSound } from './sound.js';
import { dateKey, nowTime, timeToMin, weekdayIdx } from './util.js';

export const BANNER_EVENT = 'evolve:banner';

async function settings() {
  return { ...DEFAULT_NOTIF, ...(await getKV('notif', {})) };
}

// اعلان وب (در صورت مجوز)؛ ترجیحاً از طریق service worker تا با بسته‌بودن تب هم نمایش داده شود
async function webNotify(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) await reg.showNotification(title, { body, icon: './icons/icon-192.png', dir: 'rtl', lang: 'fa' });
    else new Notification(title, { body, dir: 'rtl', lang: 'fa' });
  } catch {
    // اعلان اختیاری است
  }
}

export async function requestWebPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

// هشدار فوری: صدا + لرزش + بنر داخل اپ + اعلان وب
export async function alertNow({ title = 'اِوالو', body = '' }) {
  const cfg = await settings();
  playSound(cfg.sound, cfg.volume);
  if (cfg.vibrate) navigator.vibrate?.([200, 100, 200]);
  window.dispatchEvent(new CustomEvent(BANNER_EVENT, { detail: { title, body } }));
  if (cfg.enabled) webNotify(title, body);
}

const firedKey = (date, key) => `evolve-fired:${date}:${key}`;
const seen = (k) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const mark = (k) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    // ادامه
  }
};

// یادآورهای روزانه و عادت‌ها وقتی اپ باز است (وب/PWA). در نسخهٔ اندروید اعلان محلی کار را انجام می‌دهد.
export async function checkReminders(now = new Date()) {
  const cfg = await settings();
  if (!cfg.enabled) return 0;
  const profile = await getKV('profile');
  const habits = await db.habits.toArray();
  const items = buildSchedule(profile, habits, cfg);
  const today = dateKey(now);
  const idx = weekdayIdx(today);
  const todayNum = idx === 0 ? 7 : idx;
  const m = timeToMin(nowTime(now));
  let fired = 0;
  for (const it of items) {
    if (it.weekday && it.weekday !== todayNum) continue;
    const at = timeToMin(it.time);
    if (m < at || m - at > 5) continue;
    const k = firedKey(today, it.key);
    if (seen(k)) continue;
    mark(k);
    fired += 1;
    await alertNow({ title: it.title, body: it.body });
  }
  return fired;
}

export function useReminderWatcher() {
  useEffect(() => {
    if (isNative()) return undefined;
    const run = () => checkReminders().catch(() => {});
    run();
    const id = setInterval(run, 20000);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
    };
  }, []);
}
