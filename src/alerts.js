import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKV } from './db.js';
import { DEFAULT_NOTIF, syncNotifications } from './notify.js';
import { playSound } from './sound.js';
import { remainingMs, staleRun } from './focusLogic.js';

export const BANNER_EVENT = 'evolve:banner';

async function settings() {
  return { ...DEFAULT_NOTIF, ...(await getKV('notif', {})) };
}

// هشدار فوری: صدا + لرزش + بنر داخل اپ (وقتی اپ باز است)
export async function alertNow({ title = 'اِوالو', body = '', sticky = false, to = null }) {
  const cfg = await settings();
  playSound(cfg.sound, cfg.volume);
  if (cfg.vibrate) navigator.vibrate?.([200, 100, 200]);
  window.dispatchEvent(new CustomEvent(BANNER_EVENT, { detail: { title, body, sticky, to } }));
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

// پایان جلسهٔ تمرکز از هر صفحه‌ای: بنر ماندگار + صدا + لرزش (فقط یک بار برای هر جلسه)
export async function checkFocusEnd(now = Date.now()) {
  const row = await db.kv.get('focusRun');
  const run = row?.value;
  if (staleRun(run, now)) {
    await db.kv.delete('focusRun');
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
    run();
    const id = setInterval(run, 1000);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
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

// اعلان‌های سیستمی را با تمرکز در جریان، تنظیمات و ساعت عادت‌ها همگام نگه می‌دارد
export function useNotifSync() {
  const sig = useLiveQuery(async () => {
    const [run, notif, profile, habits] = await Promise.all([db.kv.get('focusRun'), db.kv.get('notif'), db.kv.get('profile'), db.habits.toArray()]);
    return JSON.stringify([run?.value, notif?.value, profile?.value?.name, habits.map((h) => [h.id, h.reminder, h.days, h.paused, h.status, h.title])]);
  }, [], '');
  useEffect(() => {
    syncNotifications().catch(() => {});
    const onShow = () => document.visibilityState === 'visible' && syncNotifications().catch(() => {});
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [sig]);
}
