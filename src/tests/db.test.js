import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, prune, setPruneAck, setKV, getKV, exportAll, wipeAll, countPrunable } from '../db.js';
import { addDays, dateKey } from '../util.js';

const NOW = new Date(2026, 5, 15);
const TODAY = dateKey(NOW);

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function seed() {
  await db.habits.add({ title: 'پیاده‌روی' });
  await db.goals.add({ title: 'هدف', status: 'active' });
  await db.habitLogs.bulkAdd([
    { habitId: 1, date: addDays(TODAY, -61), status: 'done' },
    { habitId: 1, date: addDays(TODAY, -60), status: 'done' },
    { habitId: 1, date: addDays(TODAY, -59), status: 'done' },
  ]);
  await db.tasks.bulkAdd([
    { title: 'قدیمی', date: addDays(TODAY, -90) },
    { title: 'بدون زمان', date: 'someday' },
  ]);
  await setKV('profile', { name: 'نمونه' });
}

describe('prune', () => {
  it('رکورد ۶۱ روزه پاک می‌شود و ۵۹ روزه می‌ماند، تعریف‌ها دست‌نخورده', async () => {
    await seed();
    await setPruneAck();
    const r = await prune(NOW);
    expect(r.status).toBe('done');
    const dates = (await db.habitLogs.toArray()).map((l) => l.date).sort();
    expect(dates).toEqual([addDays(TODAY, -60), addDays(TODAY, -59)]);
    expect((await db.tasks.toArray()).map((t) => t.date)).toEqual(['someday']);
    expect(await db.habits.count()).toBe(1);
    expect(await db.goals.count()).toBe(1);
    expect(await getKV('profile')).toEqual({ name: 'نمونه' });
  });

  it('پیش از اطلاع کاربر چیزی حذف نمی‌شود', async () => {
    await seed();
    expect(await countPrunable(NOW)).toBe(2);
    const r = await prune(NOW);
    expect(r).toEqual({ status: 'needs-ack', count: 2 });
    expect(await db.habitLogs.count()).toBe(3);
  });

  it('در هر روز حداکثر یک بار اجرا می‌شود', async () => {
    await seed();
    await setPruneAck();
    await prune(NOW);
    expect((await prune(NOW)).status).toBe('skipped');
  });

  it('مدت نگه‌داری قابل‌تغییر است', async () => {
    await seed();
    await setPruneAck();
    await setKV('retention', 30);
    await prune(NOW);
    expect(await db.habitLogs.count()).toBe(0);
  });

  it('پیشنهاد معلق پاک نمی‌شود ولی پیشنهاد ردشدهٔ قدیمی پاک می‌شود', async () => {
    await setPruneAck();
    await db.suggestions.bulkAdd([
      { status: 'pending', date: addDays(TODAY, -100), ukey: 'a' },
      { status: 'rejected', date: addDays(TODAY, -100), ukey: 'b' },
    ]);
    await prune(NOW);
    expect((await db.suggestions.toArray()).map((s) => s.ukey)).toEqual(['a']);
  });
});

describe('exportAll / wipeAll', () => {
  it('همهٔ جدول‌ها را خروجی می‌دهد و wipeAll همه را پاک می‌کند', async () => {
    await seed();
    const out = await exportAll();
    expect(Object.keys(out.tables)).toContain('habitLogs');
    expect(out.tables.habits).toHaveLength(1);
    await wipeAll();
    expect(await db.habits.count()).toBe(0);
    expect(await db.kv.count()).toBe(0);
  });
});
