import { useEffect } from 'react';
import { db, getKV } from './db.js';
import { DEFAULT_NOTIF, buildSchedule, cancelFocusEnd, isNative, scheduleFocusEnd, showFocusOngoing } from './notify.js';
import { playSound } from './sound.js';
import { remainingMs, staleRun } from './focusLogic.js';
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
export async function alertNow({ title = 'اِوالو', body = '', sticky = false, to = null }) {
  const cfg = await settings();
  playSound(cfg.sound, cfg.volume);
  if (cfg.vibrate) navigator.vibrate?.([200, 100, 200]);
  window.dispatchEvent(new CustomEvent(BANNER_EVENT, { detail: { title, body, sticky, to } }));
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

// پایان جلسهٔ تمرکز از هر صفحه‌ای: بنر ماندگار + صدا + لرزش (فقط یک بار برای هر جلسه)
export async function checkFocusEnd(now = Date.now()) {
  const row = await db.kv.get('focusRun');
  const run = row?.value;
  if (staleRun(run, now)) {
    await db.kv.delete('focusRun');
    cancelFocusEnd().catch(() => {});
    return false;
  }
  if (!run || run.pausedAt || run.endedAt || remainingMs(run, now) > 0) return false;
  const k = `evolve-focus-alert:${run.startedAt}`;
  if (seen(k)) return false;
  mark(k);
  await alertNow({ title: 'جلسهٔ تمرکز تمام شد', body: 'کارت عالی بود. هر وقت خواستی ثبتش کن.', sticky: true, to: '/focus/run' });
  return true;
}

export function useFocusWatcher() {
  useEffect(() => {
    const run = () => checkFocusEnd().catch(() => {});
    // هنگام رفتن به پس‌زمینه اعلان پایان جلسه دوباره زمان‌بندی می‌شود تا حتماً با بسته‌بودن اپ برسد
    const hidden = async () => {
      if (!document.hidden || !isNative()) return;
      const run = (await db.kv.get('focusRun'))?.value;
      if (!run || run.endedAt || run.pausedAt || remainingMs(run) <= 0) return;
      const end = Date.now() + remainingMs(run);
      await scheduleFocusEnd(end);
      await showFocusOngoing(run.title, end);
    };
    const onVis = () => { run(); hidden().catch(() => {}); };
    run();
    const id = setInterval(run, 1000);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

// صفحه را در طول تمرکز روشن نگه می‌دارد (در صورت پشتیبانی مرورگر/وب‌ویو)
export function useKeepAwake(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return undefined;
    let lock;
    let off = false;
    const take = async () => {
      if (off || document.visibilityState !== 'visible') return;
      const cfg = await settings();
      if (!cfg.keepAwake) return;
      try { lock = await navigator.wakeLock.request('screen'); } catch { /* اختیاری */ }
    };
    take();
    document.addEventListener('visibilitychange', take);
    return () => { off = true; document.removeEventListener('visibilitychange', take); lock?.release?.().catch(() => {}); };
  }, [active]);
}
