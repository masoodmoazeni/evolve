import { Capacitor, registerPlugin } from '@capacitor/core';
import { db, getKV } from './db.js';
import { remainingMs } from './focusLogic.js';

export const isNative = () => Capacitor.isNativePlatform();

// تنظیمات هشدار: صدا و لرزش درون اپ + اعلان‌های سیستمی (پایان تمرکز، یادآور روزانه، ساعت عادت‌ها)
export const DEFAULT_NOTIF = { enabled: true, focusEnd: true, daily: false, dailyAt: '20:00', habits: true, sound: 'ding', volume: 0.7, vibrate: true, keepAwake: true };

// پلاگین کوچک بومی (android/.../EvolveSystemPlugin.java) برای باز کردن تنظیمات سیستم
const System = registerPlugin('EvolveSystem');
const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

// اگر پلاگین جواب ندهد صفحه برای همیشه در حالت بارگذاری نماند
const withTimeout = (p, ms, fallback) => Promise.race([p, new Promise((res) => setTimeout(() => res(fallback), ms))]);

export const CH_FOCUS = 'evolve-focus-end';
export const CH_REMIND = 'evolve-reminders';
const FOCUS_ID = 424242;
const TEST_ID = 424244;
const REMIND_ID_BASE = 500000000;

async function ensureChannels(ln) {
  await ln.createChannel({ id: CH_FOCUS, name: 'پایان تمرکز', description: 'اعلان پایان جلسهٔ تمرکز', importance: 5, visibility: 1, vibration: true }).catch(() => {});
  await ln.createChannel({ id: CH_REMIND, name: 'یادآورها', description: 'یادآور روزانه و ساعت عادت‌ها', importance: 4, visibility: 1, vibration: true }).catch(() => {});
}

// 'granted' | 'denied' | 'unavailable' (پلاگین در برنامهٔ نصب‌شده نیست) | 'web'
export async function permissionState() {
  if (!isNative()) return 'web';
  try {
    const r = await withTimeout((await plugin()).checkPermissions(), 4000, null);
    if (!r) return 'unavailable';
    return r.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requestPermission() {
  if (!isNative()) return 'web';
  try {
    const r = await withTimeout((await plugin()).requestPermissions(), 30000, null);
    if (!r) return 'unavailable';
    return r.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

// زمان‌بندی دقیق (اندروید ۱۲ به بعد): 'granted' | 'denied' | 'web'
export async function exactAlarmState() {
  if (!isNative()) return 'web';
  try {
    return (await (await plugin()).checkExactNotificationSetting()).exact_alarm === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'granted';
  }
}

export async function openExactAlarmSettings() {
  if (isNative()) await (await plugin()).changeExactNotificationSetting().catch(() => {});
}

export async function openNotificationSettings() {
  if (isNative()) await System.openNotificationSettings().catch(() => {});
}

export async function openBatterySettings() {
  if (isNative()) await System.openBatterySettings().catch(() => {});
}

export async function batteryUnrestricted() {
  if (!isNative()) return null;
  try {
    return (await System.isIgnoringBatteryOptimizations()).ignoring;
  } catch {
    return null;
  }
}

export async function pendingCount() {
  if (!isNative()) return null;
  try {
    return (await withTimeout((await plugin()).getPending(), 3000, { notifications: [] })).notifications.length;
  } catch {
    return null;
  }
}

// اعلان آزمایشی پنج ثانیه بعد؛ نتیجه: 'ok' | 'denied' | 'unavailable' | 'web'
export async function sendTestNotification() {
  if (!isNative()) return 'web';
  const perm = (await permissionState()) === 'granted' ? 'granted' : await requestPermission();
  if (perm !== 'granted') return perm;
  try {
    const ln = await plugin();
    await ensureChannels(ln);
    await ln.schedule({ notifications: [{ id: TEST_ID, title: 'اِوالو', body: 'اعلان آزمایشی؛ اگر این را می‌بینی اعلان‌ها درست کار می‌کنند.', channelId: CH_FOCUS, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true } }] });
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 400000000, 7);

// زمان پایان جلسهٔ تمرکز؛ null اگر جلسه در جریان نیست (مکث، پایان‌یافته یا تمام‌شده)
export function focusEndAt(run, now = Date.now()) {
  if (!run || run.pausedAt || run.endedAt) return null;
  const left = remainingMs(run, now);
  return left > 0 ? now + left : null;
}

// فهرست یادآورهای تکرارشونده (خالص و قابل‌آزمون)؛ weekday: یکشنبه=۱ … شنبه=۷
export function buildReminders(profile, habits, cfg) {
  if (!cfg.enabled) return [];
  const out = [];
  if (cfg.daily && /^\d\d:\d\d$/.test(cfg.dailyAt || '')) {
    out.push({ key: 'daily', time: cfg.dailyAt, weekday: null, title: 'اِوالو', body: `${profile?.name ? `${profile.name}، ` : ''}امروز چطوری؟ هر وقت آماده بودی نگاهی بینداز.` });
  }
  if (cfg.habits) {
    habits.filter((h) => h.reminder && !h.paused && h.status !== 'archived').forEach((h) => {
      (h.days ?? []).forEach((d) => out.push({ key: `habit-${h.id}-${d}`, time: h.reminder, weekday: ((d + 6) % 7) + 1, title: h.title, body: 'دعوتی ملایم برای امروز؛ هر مقدار که بشود خوب است.' }));
    });
  }
  return out;
}

// تنها نقطهٔ زمان‌بندی: هر بار که وضعیت تمرکز، تنظیمات یا عادت‌ها عوض شود دوباره صدا زده می‌شود
export async function syncNotifications(now = Date.now()) {
  if (!isNative()) return;
  try {
    if ((await permissionState()) !== 'granted') return;
    const ln = await plugin();
    await ensureChannels(ln);
    const cfg = { ...DEFAULT_NOTIF, ...(await getKV('notif', {})) };
    const pending = (await ln.getPending()).notifications.filter((n) => n.id === FOCUS_ID || n.id >= REMIND_ID_BASE);
    if (pending.length) await ln.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
    const notifications = [];
    const end = cfg.enabled && cfg.focusEnd ? focusEndAt((await db.kv.get('focusRun'))?.value, now) : null;
    if (end) {
      notifications.push({ id: FOCUS_ID, title: 'جلسهٔ تمرکز تمام شد', body: 'کارت عالی بود. هر وقت خواستی ثبتش کن.', channelId: CH_FOCUS, schedule: { at: new Date(end), allowWhileIdle: true } });
    }
    const habits = await db.habits.toArray();
    buildReminders(await getKV('profile'), habits, cfg).forEach((n) => {
      const [hour, minute] = n.time.split(':').map(Number);
      notifications.push({ id: REMIND_ID_BASE + hash(n.key), title: n.title, body: n.body, channelId: CH_REMIND, schedule: { on: { hour, minute, ...(n.weekday ? { weekday: n.weekday } : {}) }, allowWhileIdle: true } });
    });
    if (notifications.length) await ln.schedule({ notifications });
  } catch {
    // اعلان اختیاری است؛ اپ بدون آن کار می‌کند و وضعیتش در «صدا و هشدار» دیده می‌شود
  }
}

