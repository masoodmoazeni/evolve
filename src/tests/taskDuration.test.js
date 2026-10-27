import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, exportAll } from '../db.js';
import { DURATIONS } from '../data.js';
import { applyImport, parseBackup } from '../importLogic.js';

const read = (f) => readFileSync(new URL(`../screens/${f}`, import.meta.url), 'utf8');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('مدت کار', () => {
  it('گزینه‌های سریع نیم‌ساعت، یک و دو ساعت‌اند', () => {
    expect(DURATIONS.map((d) => d.min)).toEqual([30, 60, 120]);
  });

  it('مدت و زمان تمرکز کار در خروجی و ورودی می‌ماند', async () => {
    const id = await db.tasks.add({ title: 'گزارش', date: 'someday', minutes: 120, spent: 25, done: false });
    const backup = JSON.stringify(await exportAll());
    await db.tasks.clear();
    await applyImport(parseBackup(backup).backup, { mode: 'replace' });
    const t = await db.tasks.toArray();
    expect(t.find((x) => x.title === 'گزارش')).toMatchObject({ minutes: 120, spent: 25 });
    expect(id).toBeTruthy();
  });
});

describe('صفحه‌ها', () => {
  it('صفحه‌های حریم و داده راه بازگشت به اپ دارند', () => {
    for (const f of ['PrivacyScreens.jsx', 'DataScreens.jsx', 'CoachExport.jsx']) expect(read(f)).toContain('<BackToApp />');
  });
  it('تمرکز انتخاب اختیاری کار دارد و در پایان زمان را روی کار ثبت می‌کند', () => {
    const s = read('Focus.jsx');
    expect(s).toContain('بدون کار؛ فقط تمرکز');
    expect(s).toContain('spent');
  });
});
