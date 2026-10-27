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

// انرژی کار؛ تعداد خط نشان = وزن
export const EFFORT = [
  { key: 'heavy', label: 'سنگین', weight: 3 },
  { key: 'medium', label: 'متوسط', weight: 2 },
  { key: 'light', label: 'سبک', weight: 1 },
];

// حوزه‌های زندگی (اختیاری)
export const AREAS = [
  { key: 'health', label: 'سلامت' },
  { key: 'learning', label: 'یادگیری' },
  { key: 'work', label: 'کار' },
  { key: 'people', label: 'رابطه‌ها' },
  { key: 'money', label: 'مالی' },
  { key: 'self', label: 'خودمراقبتی' },
];
