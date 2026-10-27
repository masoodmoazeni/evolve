import { db } from './db.js';

// رکوردهای نمونه با `demo: true` علامت خورده‌اند؛ رکوردهای واقعی هرگز دست نمی‌خورند
const demoRows = (t) => t.filter((r) => r.demo === true).toArray();

export async function demoCount() {
  let n = 0;
  for (const t of db.tables) n += await t.filter((r) => r.demo === true).count();
  return n;
}

// حذف همهٔ نمونه‌ها؛ تابع بازگردانی برمی‌گرداند
export async function removeDemoData() {
  const saved = {};
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      const rows = await demoRows(t);
      if (!rows.length) continue;
      saved[t.name] = rows;
      await t.bulkDelete(rows.map((r) => (t.name === 'kv' ? r.key : r.id)));
    }
  });
  const count = Object.values(saved).reduce((a, r) => a + r.length, 0);
  return { count, undo: () => db.transaction('rw', db.tables, async () => { for (const [n, rows] of Object.entries(saved)) await db[n].bulkPut(rows); }) };
}

// برای فایل خروجی (بدون پایگاه‌داده): همهٔ رکوردهای نمونه را از پشتیبان بیرون می‌کشد
export function stripDemo(backup) {
  const tables = {};
  for (const [name, rows] of Object.entries(backup.tables)) tables[name] = rows.filter((r) => r?.demo !== true);
  return { ...backup, tables };
}
