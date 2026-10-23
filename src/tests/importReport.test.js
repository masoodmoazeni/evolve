import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, exportAll, getKV, setKV, wipeAll } from '../db.js';
import { applyImport, parseBackup, previewImport } from '../importLogic.js';
import { buildReport, dailyCSV, jDate } from '../reportLogic.js';
import { addDays, dateKey } from '../util.js';

const NOW = new Date(2026, 5, 15);
const TODAY = dateKey(NOW);

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function seed() {
  const hid = await db.habits.add({ title: 'پیاده‌روی' });
  await db.habitLogs.bulkAdd([
    { habitId: hid, date: TODAY, status: 'done', amount: 20 },
    { habitId: hid, date: addDays(TODAY, -1), status: 'partial', amount: 10 },
    { habitId: hid, date: addDays(TODAY, -90), status: 'done' },
  ]);
  await db.moods.add({ date: TODAY, mood: 'calm', energy: 70, ts: 1 });
  await setKV('profile', { name: 'نمونه' });
}

describe('parseBackup', () => {
  it('فایل خراب یا غیرِاِوالو را رد می‌کند', () => {
    expect(parseBackup('{').ok).toBe(false);
    expect(parseBackup('{"app":"other","tables":{}}').ok).toBe(false);
    expect(parseBackup('{"app":"evolve","version":99,"tables":{}}').ok).toBe(false);
    expect(parseBackup('{"app":"evolve","tables":{"goals":5}}').ok).toBe(false);
    expect(parseBackup('{"app":"evolve","version":1,"tables":{}}').ok).toBe(true);
  });
});

describe('import', () => {
  it('پس از پاک شدن اپ، پشتیبان بازیابی می‌شود (جایگزینی)', async () => {
    await seed();
    const text = JSON.stringify(await exportAll());
    await wipeAll();
    const { backup } = parseBackup(text);
    const prev = await previewImport(backup, { mode: 'replace', skipOld: false }, NOW);
    expect(prev.find((p) => p.name === 'habitLogs').willAdd).toBe(3);
    await applyImport(backup, { mode: 'replace', skipOld: false }, NOW);
    expect(await db.habitLogs.count()).toBe(3);
    expect(await getKV('profile')).toEqual({ name: 'نمونه' });
  });

  it('رکوردهای قدیمی‌تر از مدت نگه‌داری وارد نمی‌شوند (ایمن در برابر prune)', async () => {
    await seed();
    const { backup } = parseBackup(JSON.stringify(await exportAll()));
    await db.habitLogs.clear();
    const prev = await previewImport(backup, { mode: 'merge', skipOld: true }, NOW);
    expect(prev.find((p) => p.name === 'habitLogs')).toMatchObject({ willAdd: 2, old: 1 });
    await applyImport(backup, { mode: 'merge', skipOld: true }, NOW);
    expect(await db.habitLogs.count()).toBe(2);
    expect(await getKV('lastPrune')).toBe(TODAY);
  });

  it('ادغام رکورد موجود را دست نمی‌زند و کلیدهای موقت را وارد نمی‌کند', async () => {
    await seed();
    const exp = await exportAll();
    exp.tables.kv.push({ key: 'focusRun', value: { x: 1 } });
    const first = (await db.habitLogs.toArray())[0].id;
    await db.habitLogs.update(first, { status: 'skipped' });
    await applyImport(exp, { mode: 'merge', skipOld: false }, NOW);
    expect((await db.habitLogs.get(first)).status).toBe('skipped');
    expect(await getKV('focusRun')).toBeUndefined();
  });

  it('جدول‌های ناشناخته (ماژول‌های آینده) نادیده گرفته می‌شوند', async () => {
    const backup = { app: 'evolve', version: 1, tables: { germanCards: [{ id: 1 }], goals: [{ id: 5, title: 'هدف' }] } };
    const prev = await previewImport(backup, { mode: 'merge', skipOld: false }, NOW);
    expect(prev.find((p) => p.name === 'germanCards').unknown).toBe(true);
    await applyImport(backup, { mode: 'merge', skipOld: false }, NOW);
    expect(await db.goals.count()).toBe(1);
  });
});

describe('report', () => {
  it('گزارش را از ثبت‌ها می‌سازد و تاریخ شمسی دارد', async () => {
    await seed();
    const r = buildReport((await exportAll()).tables, NOW);
    expect(r.habits[0]).toMatchObject({ title: 'پیاده‌روی', logged: 3, done: 2, partial: 1 });
    expect(r.moods.records).toBe(1);
    expect(r.daily.find((d) => d.date === TODAY)).toMatchObject({ habitsDone: 1, mood: 'calm', energy: 70 });
    expect(jDate('2026-03-21')).toBe('1405/01/01');
    expect(dailyCSV(r).split('\r\n')[0]).toContain('تاریخ_شمسی');
  });
});

import { completionRates } from '../logic.js';
describe('completionRates', () => {
  it('ثبت‌نشده را جدا نگه می‌دارد', () => {
    const r = completionRates(10, [{ status: 'done', usedMin: true }, { status: 'done' }, { status: 'partial' }, { status: 'skipped' }]);
    expect(r).toMatchObject({ recorded: 4, unrecorded: 6, done: 2, minDone: 1, rateOfRecorded: 0.5, rateOfScheduled: 0.2 });
    expect(completionRates(0, []).rateOfRecorded).toBeNull();
  });
});

import { obstacleRanking, scheduledDays, metricsByGoal, habitsCSV, obstaclesCSV, skillsCSV } from '../reportLogic.js';
describe('report extensions', () => {
  it('تعداد روزهای برنامه‌ریزی‌شده را از شروع تا امروز می‌شمارد', () => {
    const today = '2026-06-15'; // دوشنبه
    expect(scheduledDays({ days: [0, 1, 2, 3, 4, 5, 6] }, '2026-06-09', today)).toBe(7);
    expect(scheduledDays({ days: [] }, '2026-06-09', today)).toBe(0);
    expect(scheduledDays({ days: [0] }, null, today)).toBe(0);
  });

  it('مانع‌ها را فقط از ثبت‌های غیرانجام‌شده رتبه‌بندی می‌کند', () => {
    const r = obstacleRanking([
      { status: 'skipped', obstacle: 'time' }, { status: 'partial', obstacle: 'time' },
      { status: 'skipped', obstacle: 'energy' }, { status: 'done', obstacle: 'forgot' }, { status: 'skipped' },
    ]);
    expect(r).toEqual([{ key: 'time', label: 'کمبود وقت', count: 2 }, { key: 'energy', label: 'انرژی کم', count: 1 }]);
  });

  it('معیار مهارت را به‌تفکیک بعد خلاصه می‌کند', () => {
    const m = metricsByGoal([{ id: 1, title: 'آلمانی' }, { id: 2, title: 'بی‌معیار' }], [
      { goalId: 1, dimension: 'شنیدن', date: '2026-06-01', value: 2 },
      { goalId: 1, dimension: 'شنیدن', date: '2026-06-10', value: 4 },
    ]);
    expect(m).toHaveLength(1);
    expect(m[0].dimensions[0]).toMatchObject({ dimension: 'شنیدن', first: 2, last: 4, count: 2 });
  });

  it('گزارش کامل نرخ‌ها، مانع‌ها و نسخه‌ها را دارد و CSV می‌سازد', async () => {
    await db.habits.add({ title: 'ورزش', days: [0, 1, 2, 3, 4, 5, 6] });
    const hid = (await db.habits.toArray())[0].id;
    await db.habitLogs.bulkAdd([
      { habitId: hid, date: addDays(TODAY, -2), status: 'done', usedMin: true },
      { habitId: hid, date: addDays(TODAY, -1), status: 'skipped', obstacle: 'time' },
    ]);
    await db.habitRevisions.add({ habitId: hid, ts: 1, reason: 'کوتاه‌تر', snapshot: {} });
    await db.goals.add({ title: 'آلمانی', status: 'active' });
    const gid = (await db.goals.toArray())[0].id;
    await db.goalMetrics.add({ goalId: gid, date: TODAY, dimension: 'گفتار', value: 3 });
    const r = buildReport((await exportAll()).tables, NOW);
    expect(r.rates).toMatchObject({ recorded: 2, done: 1, minDone: 1, scheduled: 3, unrecorded: 1 });
    expect(r.habits[0].rates.unrecorded).toBe(1);
    expect(r.obstacles[0].key).toBe('time');
    expect(r.revisions.total).toBe(1);
    expect(r.skills[0].dimensions[0].dimension).toBe('گفتار');
    expect(habitsCSV(r)).toContain('درصد_انجام_از_برنامه');
    expect(obstaclesCSV(r)).toContain('کمبود وقت');
    expect(skillsCSV(r)).toContain('گفتار');
  });
});
