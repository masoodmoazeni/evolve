import { db } from './db.js';

// ثبت (یا پاک‌کردن) وضعیت یک روز؛ تابع بازگردانی را برمی‌گرداند
export async function setLog(table, field, id, date, status, extra = {}) {
  const prev = await db[table].where(`[${field}+date]`).equals([id, date]).first();
  if (status === 'none') {
    if (prev) await db[table].delete(prev.id);
  } else {
    const rec = { [field]: id, date, status, amount: null, reason: '', ...extra, ts: Date.now() };
    if (prev) await db[table].update(prev.id, rec);
    else await db[table].add(rec);
  }
  return async () => {
    const cur = await db[table].where(`[${field}+date]`).equals([id, date]).first();
    if (cur) await db[table].delete(cur.id);
    if (prev) await db[table].add({ ...prev });
  };
}

export const setHabitLog = (habitId, date, status, extra) => setLog('habitLogs', 'habitId', habitId, date, status, extra);
export const setGoalLog = (goalId, date, status, extra) => setLog('goalLogs', 'goalId', goalId, date, status, extra);

export const MAX_PRIORITIES = 3;

// نسخه‌بندی تغییر عادت: عکس لحظه‌ای از تعریف عادت پیش از/بعد از تغییر
export async function recordRevision(habit, reason, source = 'user') {
  const { id, ...snapshot } = habit;
  await db.habitRevisions.add({ habitId: habit.id ?? id, ts: Date.now(), reason, source, snapshot });
}

// مدت‌های پیشنهادی برای کار (دقیقه)
export const DURATIONS = [
  { min: 30, label: '۳۰ دقیقه' },
  { min: 60, label: 'یک ساعت' },
  { min: 120, label: 'دو ساعت' },
];
