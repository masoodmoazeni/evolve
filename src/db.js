import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, dateKey } from './util.js';

export const DEFAULT_RETENTION = 60;

export const db = new Dexie('evolve');

db.version(1).stores({
  goals: '++id,status',
  goalLogs: '++id,goalId,date,[goalId+date]',
  habits: '++id,status',
  habitLogs: '++id,habitId,date,[habitId+date]',
  tasks: '++id,date',
  focus: '++id,date',
  notes: '++id,date',
  moods: '++id,date',
  reviews: '++id,kind,date',
  suggestions: '++id,status,ukey',
  kv: 'key',
});

// v2: نسخه‌بندی تغییر عادت‌ها و معیارهای پیشرفت مهارت (هیچ‌کدام پاک‌سازی نمی‌شوند)
db.version(2).stores({
  habitRevisions: '++id,habitId,ts',
  goalMetrics: '++id,goalId,date,[goalId+dimension]',
});

// v3: کارهای تکراری و قالب روز (تعریف‌اند، پاک‌سازی نمی‌شوند) + ایندکس کارِ ساخته‌شده از تکرار
db.version(3).stores({
  tasks: '++id,date,recurId',
  recurring: '++id,status',
  dayTemplates: '++id',
});

// v4: خلاصهٔ ماهانهٔ عددی؛ کلید = ماه شمسی 'yyyy-mm' و در DATED_TABLES نیست
db.version(4).stores({
  monthSummaries: 'month',
});

// رکوردهای روزانه که پاک‌سازی روی آن‌ها اجرا می‌شود
export const DATED_TABLES = ['habitLogs', 'goalLogs', 'tasks', 'focus', 'notes', 'moods', 'reviews'];

export async function getKV(key, fallback = undefined) {
  const row = await db.kv.get(key);
  return row ? row.value : fallback;
}

export function setKV(key, value) {
  return db.kv.put({ key, value });
}

// مقدار تا پایان بارگذاری `undefined` است؛ اگر کلید نباشد `fallback` برمی‌گردد
export function useKV(key, fallback) {
  const row = useLiveQuery(() => db.kv.get(key).then((r) => r ?? null), [key], undefined);
  const value = row === undefined ? undefined : row ? row.value : fallback;
  return [value, (v) => setKV(key, v)];
}

function cutoffFor(retention, today) {
  return addDays(today, -retention);
}

// تعداد رکوردهایی که پاک‌سازی حذف می‌کند (بدون حذف)
export async function countPrunable(now = new Date()) {
  const cutoff = cutoffFor(await getKV('retention', DEFAULT_RETENTION), dateKey(now));
  let count = 0;
  for (const t of DATED_TABLES) count += await db[t].where('date').below(cutoff).count();
  count += await db.suggestions.filter((s) => s.status !== 'pending' && !!s.date && s.date < cutoff).count();
  return count;
}

export async function setPruneAck() {
  await setKV('pruneAck', true);
}

/**
 * پاک‌سازی رکوردهای قدیمی‌تر از مدت نگه‌داری؛ حداکثر یک بار در روز.
 * پیش از اولین حذف واقعی باید کاربر مطلع شود: تا `setPruneAck()` حذفی انجام نمی‌شود
 * و `{status:'needs-ack', count}` برمی‌گردد.
 */
export async function prune(now = new Date()) {
  const today = dateKey(now);
  if ((await getKV('lastPrune')) === today) return { status: 'skipped', count: 0 };

  const count = await countPrunable(now);
  if (count > 0 && !(await getKV('pruneAck', false))) return { status: 'needs-ack', count };

  // خلاصهٔ عددی ماه‌های تمام‌شده پیش از حذف رکوردها ساخته می‌شود
  await (await import('./monthLogic.js')).rollupMonths(today).catch(() => {});

  const cutoff = cutoffFor(await getKV('retention', DEFAULT_RETENTION), today);
  await db.transaction('rw', [...DATED_TABLES, 'suggestions', 'kv'], async () => {
    await db.kv.filter((r) => r.key.startsWith('weekPlan:') && r.key.slice(9) < cutoff).delete();
    for (const t of DATED_TABLES) await db[t].where('date').below(cutoff).delete();
    await db.suggestions.filter((s) => s.status !== 'pending' && !!s.date && s.date < cutoff).delete();
    await setKV('lastPrune', today);
  });
  return { status: 'done', count };
}

export async function exportAll() {
  const out = { app: 'evolve', exportedAt: new Date().toISOString(), version: db.verno, tables: {} };
  for (const t of db.tables) out.tables[t.name] = await t.toArray();
  return out;
}

export async function wipeAll() {
  await db.delete();
  await db.open();
}
