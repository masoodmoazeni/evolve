import { Capacitor } from '@capacitor/core';
import { db, getKV } from './db.js';
import { faNum, timeToMin } from './util.js';

export const isNative = () => Capacitor.isNativePlatform();

const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

// 'granted' | 'denied' | 'web'
export async function requestPermission() {
  if (!isNative()) return 'web';
  const ln = await plugin();
  const r = await ln.requestPermissions();
  return r.display === 'granted' ? 'granted' : 'denied';
}

export async function permissionState() {
  if (!isNative()) return 'web';
  const r = await (await plugin()).checkPermissions();
  return r.display === 'granted' ? 'granted' : 'denied';
}

export const DEFAULT_NOTIF = { enabled: true, daily: true, habits: true, review: false, quietFrom: '22:00', quietTo: '07:00', cap: 5, sound: 'ding', volume: 0.7, vibrate: true, timerOnScreen: true, keepAwake: true, ongoing: true };

const inQuiet = (t, from, to) => {
  const m = timeToMin(t);
  const a = timeToMin(from);
  const b = timeToMin(to);
  return a > b ? m >= a || m < b : m >= a && m < b;
};

// سازنده‌ی فهرست اعلان‌ها (خالص و قابل‌آزمون)
export function buildSchedule(profile, habits, cfg) {
  if (!cfg.enabled) return [];
  const out = [];
  if (cfg.daily && profile?.remindAt) out.push({ key: 'daily', time: profile.remindAt, weekday: null, title: 'اِوالو', body: 'سلام، امروز چطوری؟ هر وقت آماده بودی نگاهی بینداز.' });
  if (cfg.habits) {
    habits.filter((h) => h.reminder && !h.paused).forEach((h) => {
      (h.days ?? []).forEach((d) => out.push({ key: `habit-${h.id}-${d}`, time: h.reminder, weekday: d === 0 ? 7 : d, title: h.title, body: 'دعوت ملایم برای امروز؛ هر مقدار که بشود خوب است.' }));
    });
  }
  const ok = out.filter((n) => !inQuiet(n.time, cfg.quietFrom, cfg.quietTo));
  return ok.slice(0, Math.max(1, cfg.cap) * 7);
}

const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2000000000, 7);

export async function rescheduleAll() {
  if (!isNative()) return;
  const ln = await plugin();
  await ln.createChannel({ id: 'evolve-reminders', name: 'یادآورها', description: 'یادآور روزانه و عادت‌ها', importance: 4, vibration: true }).catch(() => {});
  const pending = await ln.getPending();
  if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.filter((n) => n.extra?.evolve) });
  if ((await permissionState()) !== 'granted') return;
  const cfg = { ...DEFAULT_NOTIF, ...(await getKV('notif', {})) };
  const profile = await getKV('profile');
  const habits = await db.habits.toArray();
  const items = buildSchedule(profile, habits, cfg);
  if (!items.length) return;
  await ln.schedule({
    notifications: items.map((n) => {
      const [hour, minute] = n.time.split(':').map(Number);
      return { id: hash(n.key), title: n.title, body: n.body, channelId: 'evolve-reminders', extra: { evolve: true }, schedule: { on: { hour, minute, ...(n.weekday ? { weekday: n.weekday } : {}) }, allowWhileIdle: true } };
    }),
  });
}

const FOCUS_ID = 424242;
const ONGOING_ID = 424243;

// درخواست مجوز اعلان هنگام شروع تمرکز (اندروید ۱۳ به بعد مجوز جداگانه می‌خواهد)
export async function ensureNotifPermission() {
  if (!isNative()) return 'web';
  const ln = await plugin();
  const r = await ln.checkPermissions();
  if (r.display === 'granted') return 'granted';
  return (await ln.requestPermissions()).display === 'granted' ? 'granted' : 'denied';
}

// زمان‌بندی دقیق (اندروید ۱۲+) برای رسیدن اعلان سر وقت
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

export async function scheduleFocusEnd(atMs) {
  if (!isNative()) return;
  const ln = await plugin();
  if ((await ensureNotifPermission()) !== 'granted') return;
  await ln.createChannel({ id: 'evolve-focus', name: 'پایان تمرکز', description: 'صدای پایان جلسهٔ تمرکز', importance: 5, vibration: true, visibility: 1 }).catch(() => {});
  await ln.schedule({ notifications: [{ id: FOCUS_ID, title: 'اِوالو', body: 'جلسهٔ تمرکز تمام شد. چه حسی داشت؟', channelId: 'evolve-focus', schedule: { at: new Date(atMs), allowWhileIdle: true } }] });
}

// اعلان پایدار «تمرکز در جریان» با ساعت پایان؛ روی صفحهٔ قفل هم دیده می‌شود
export async function showFocusOngoing(title, endMs) {
  if (!isNative()) return;
  const cfg = { ...DEFAULT_NOTIF, ...(await getKV('notif', {})) };
  if (!cfg.enabled || !cfg.ongoing || (await permissionState()) !== 'granted') return;
  const ln = await plugin();
  await ln.createChannel({ id: 'evolve-focus-run', name: 'تمرکز در جریان', description: 'نمایش پایدار جلسهٔ تمرکز', importance: 3, vibration: false, visibility: 1 }).catch(() => {});
  const d = new Date(endMs);
  const hhmm = faNum(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  await ln.schedule({ notifications: [{ id: ONGOING_ID, title: 'تمرکز در جریان', body: `${title} · پایان ساعت ${hhmm}`, channelId: 'evolve-focus-run', ongoing: true, autoCancel: false }] });
}

export async function cancelFocusEnd() {
  if (!isNative()) return;
  await (await plugin()).cancel({ notifications: [{ id: FOCUS_ID }, { id: ONGOING_ID }] });
}
