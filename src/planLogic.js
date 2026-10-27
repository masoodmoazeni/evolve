import { db } from './db.js';
import { addDays } from './util.js';

// صندوق ورودی = کارهای «someday» که inbox: true دارند
export const isInbox = (t) => t.date === 'someday' && t.inbox === true && !t.done;
export const inboxItems = (tasks) => tasks.filter(isInbox).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

export async function addInbox(text, extra = {}) {
  const title = String(text ?? '').trim();
  if (!title) return null;
  const id = await db.tasks.add({ title, date: 'someday', time: null, minutes: null, priority: false, goalId: null, done: false, inbox: true, createdAt: Date.now(), ...extra });
  return { id, undo: () => db.tasks.delete(id) };
}

// action: today | tomorrow | date | someday | delete ؛ تابع بازگردانی برمی‌گرداند
export async function triage(task, action, { today, date } = {}) {
  const prev = { ...task };
  if (action === 'delete') {
    await db.tasks.delete(task.id);
    return () => db.tasks.put(prev);
  }
  const target = { today, tomorrow: today && addDays(today, 1), date, someday: 'someday' }[action];
  if (!target) throw new Error('bad triage action');
  const patch = action === 'someday' ? { inbox: false } : { date: target, inbox: false };
  await db.tasks.update(task.id, patch);
  return () => db.tasks.put(prev);
}
