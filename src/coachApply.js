import { db } from './db.js';
import { recordRevision } from './data.js';

// هر تغییر عادت پیش از اعمال نسخه‌بندی می‌شود تا تاریخچه بازنویسی نشود
async function patchHabit(habitId, patch, reason, source = 'coach') {
  const cur = await db.habits.get(habitId);
  if (!cur) return null;
  await recordRevision(cur, reason, source);
  await db.habits.update(habitId, patch);
  const prev = Object.fromEntries(Object.keys(patch).map((k) => [k, cur[k]]));
  return async () => {
    const now = await db.habits.get(habitId);
    if (now) await recordRevision(now, 'بازگردانی پیشنهاد مربی', 'user');
    await db.habits.update(habitId, prev);
  };
}

// پیشنهاد را اعمال می‌کند و تابع بازگردانی برمی‌گرداند
export async function applySuggestion(s, today) {
  let undo;
  if (s.kind === 'reduce') {
    undo = await patchHabit(s.habitId, { amount: s.to }, 'کاهش مقدار (پیشنهاد مربی)');
  } else if (s.kind === 'habit') {
    undo = await patchHabit(s.habitId, s.patch, s.change ?? s.rule);
  } else {
    const prev = s.moving.map((t) => ({ id: t.id, date: t.date }));
    await Promise.all(prev.map((t) => db.tasks.update(t.id, { date: 'someday' })));
    undo = () => Promise.all(prev.map((t) => db.tasks.update(t.id, { date: t.date })));
  }
  const id = await db.suggestions.add({ ukey: s.ukey, kind: s.kind, status: 'accepted', date: today, ts: Date.now() });
  return async () => {
    if (undo) await undo();
    await db.suggestions.delete(id);
  };
}

export async function rejectSuggestion(s, today) {
  const id = await db.suggestions.add({ ukey: s.ukey, kind: s.kind, status: 'rejected', date: today, ts: Date.now() });
  return () => db.suggestions.delete(id);
}
