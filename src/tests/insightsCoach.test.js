import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db.js';
import { addDays } from '../util.js';
import { buildCoach, lightenRule, reduceHabitRule } from '../coachLogic.js';
import { applySuggestion, rejectSuggestion } from '../coachApply.js';
import { buildInsights, dayMap, MIN_DAYS } from '../insightLogic.js';

const TODAY = '2026-06-15';
const allDays = [0, 1, 2, 3, 4, 5, 6];
const habit = { id: 1, title: 'مطالعه', amount: 30, days: allDays };

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('coach rules', () => {
  const logs = (...st) => st.map((status, i) => ({ habitId: 1, date: addDays(TODAY, -i), status }));

  it('با ۲ نیمه‌کاره در ۳ ثبت اخیر کاهش پیشنهاد می‌شود', () => {
    const r = reduceHabitRule([habit], logs('partial', 'done', 'skipped'));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ from: 30, to: 20, ukey: 'reduce:1:20' });
  });
  it('با کمتر از ۳ ثبت یا ۱ نیمه‌کاره پیشنهاد نمی‌شود', () => {
    expect(reduceHabitRule([habit], logs('partial', 'skipped'))).toHaveLength(0);
    expect(reduceHabitRule([habit], logs('partial', 'done', 'done'))).toHaveLength(0);
  });
  it('فردا با بیش از ۳ کار سبک می‌شود و اولویت‌ها می‌مانند', () => {
    const tasks = [1, 2, 3, 4, 5].map((id) => ({ id, title: `k${id}`, priority: id === 5 }));
    const [s] = lightenRule(tasks, '2026-06-16');
    expect(s.keep.map((t) => t.id)).toContain(5);
    expect(s.moving).toHaveLength(2);
    expect(lightenRule(tasks.slice(0, 3), 'x')).toHaveLength(0);
  });
  it('بدون داده، «داده کافی نیست» و بدون دسترسی هیچ پیشنهادی نمی‌آید', () => {
    const base = { habits: [habit], habitLogs: logs('partial', 'skipped', 'done'), tasksTomorrow: [], focus: [], moods: [], suggestions: [], today: TODAY };
    expect(buildCoach({ ...base, habitLogs: [], habits: [] }).enough).toBe(false);
    expect(buildCoach({ ...base, access: { habits: false } }).suggestions).toHaveLength(0);
    expect(buildCoach(base).suggestions).toHaveLength(1);
  });
  it('پیشنهاد ردشده تکرار نمی‌شود و لحن فقط جمله‌بندی را عوض می‌کند', () => {
    const base = { habits: [habit], habitLogs: logs('partial', 'skipped', 'done'), tasksTomorrow: [], focus: [], moods: [], today: TODAY };
    const a = buildCoach({ ...base, suggestions: [], tone: 'gentle' }).suggestions[0];
    const b = buildCoach({ ...base, suggestions: [], tone: 'direct' }).suggestions[0];
    expect(a.text).not.toBe(b.text);
    expect(a.ukey).toBe(b.ukey);
    expect(buildCoach({ ...base, suggestions: [{ ukey: a.ukey, status: 'rejected' }] }).suggestions).toHaveLength(0);
  });
});

describe('apply / reject', () => {
  it('اعمال مقدار عادت و بازگردانی', async () => {
    await db.habits.add({ ...habit });
    const s = { kind: 'reduce', habitId: 1, from: 30, to: 20, ukey: 'reduce:1:20' };
    const undo = await applySuggestion(s, TODAY);
    expect((await db.habits.get(1)).amount).toBe(20);
    expect(await db.suggestions.count()).toBe(1);
    await undo();
    expect((await db.habits.get(1)).amount).toBe(30);
    expect(await db.suggestions.count()).toBe(0);
  });
  it('سبک‌کردن فردا کارها را به someday می‌برد و رد کردن ukey را ثبت می‌کند', async () => {
    await db.tasks.bulkAdd([{ title: 'a', date: '2026-06-16' }, { title: 'b', date: '2026-06-16' }]);
    const s = { kind: 'lighten', moving: [{ id: 2, date: '2026-06-16' }], ukey: 'lighten:2026-06-16' };
    const undo = await applySuggestion(s, TODAY);
    expect((await db.tasks.get(2)).date).toBe('someday');
    await undo();
    expect((await db.tasks.get(2)).date).toBe('2026-06-16');
    await rejectSuggestion(s, TODAY);
    expect((await db.suggestions.toArray())[0]).toMatchObject({ status: 'rejected', ukey: s.ukey });
  });
});

describe('insights', () => {
  const dates = Array.from({ length: 28 }, (_, i) => addDays('2026-05-19', i));
  it('با داده کم صادقانه «داده کافی نیست» می‌دهد', () => {
    const days = dayMap({ habits: [habit], habitLogs: [], dates });
    expect(buildInsights({ days })).toMatchObject({ enough: false, needed: MIN_DAYS });
  });
  it('نقشهٔ روزها: روز بدون ثبت سطح ۰ دارد', () => {
    const days = dayMap({ habits: [habit], habitLogs: [{ habitId: 1, date: dates[1], status: 'done' }], dates: dates.slice(0, 3) });
    expect(days.map((d) => d.level)).toEqual([0, 4, 0]);
  });
  it('الگوی روز هفته با منبع و بدون ادعای علت', () => {
    // شنبه‌ها همه انجام، بقیه ردشده
    const logs = dates.map((date) => ({ habitId: 1, date, status: new Date(date + 'T12:00:00').getDay() === 6 ? 'done' : 'skipped' }));
    const days = dayMap({ habits: [habit], habitLogs: logs, dates });
    const r = buildInsights({ days, habitLogs: logs });
    expect(r.enough).toBe(true);
    const w = r.items.find((i) => i.id === 'weekday');
    expect(w.source).toContain('روز');
    expect(w.correlation).toBe(false);
  });
  it('همبستگی تمرکز و انرژی با تذکر علامت‌گذاری می‌شود', () => {
    const days = dayMap({ habits: [habit], habitLogs: dates.map((date) => ({ habitId: 1, date, status: 'done' })), dates });
    const focus = dates.filter((_, i) => i % 2).map((date) => ({ date, actual: 30 }));
    const moods = dates.map((date, i) => ({ date, energy: i % 2 ? 80 : 40 }));
    const r = buildInsights({ days, focus, moods });
    expect(r.items.find((i) => i.id === 'focus-energy').correlation).toBe(true);
  });
});

import { logsCSV, toCSV } from '../exportLogic.js';
describe('export', () => {
  it('CSV نقل‌قول و ویرگول را درست escape می‌کند', () => {
    expect(toCSV(['a', 'b'], [['x,y', 'q"r']])).toBe('a,b\r\n"x,y","q""r"');
  });
  it('CSV ثبت‌ها عنوان عادت را می‌گذارد و بر پایهٔ تاریخ مرتب است', () => {
    const csv = logsCSV({ habits: [{ id: 1, title: 'مطالعه' }], habitLogs: [{ habitId: 1, date: '2026-06-02', status: 'done' }, { habitId: 1, date: '2026-06-01', status: 'partial', amount: 10 }] });
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines[1]).toContain('2026-06-01');
    expect(lines[2]).toContain('مطالعه');
  });
});
