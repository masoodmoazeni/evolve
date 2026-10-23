import { describe, expect, it } from 'vitest';
import { actualMinutes, dailyMinutes, elapsedMs, finishRun, fmtClock, pauseRun, remainingMs, resumeRun, startRun, summarize } from '../focusLogic.js';
import { buildMonth, dayBlocks, monthLength, monthStart, shiftMonth } from '../calendarLogic.js';
import { jalali, weekdayIdx } from '../util.js';

const T0 = new Date(2026, 5, 15, 9, 0).getTime();
const MIN = 60000;

describe('focusLogic', () => {
  it('زمان از اختلاف Date.now و startedAt محاسبه می‌شود', () => {
    const run = startRun({ planned: 25 }, T0);
    expect(run.start).toBe('09:00');
    expect(elapsedMs(run, T0 + 10 * MIN)).toBe(10 * MIN);
    expect(remainingMs(run, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it('مکث و ادامه زمان مکث را حساب نمی‌کند', () => {
    let run = startRun({ planned: 25 }, T0);
    run = pauseRun(run, T0 + 5 * MIN);
    expect(elapsedMs(run, T0 + 20 * MIN)).toBe(5 * MIN);
    run = resumeRun(run, T0 + 20 * MIN);
    expect(elapsedMs(run, T0 + 25 * MIN)).toBe(10 * MIN);
  });

  it('پایان زودهنگام مجاز است و زمان ثابت می‌ماند', () => {
    const run = finishRun(startRun({ planned: 25 }, T0), T0 + 7 * MIN);
    expect(actualMinutes(run, T0 + 99 * MIN)).toBe(7);
    const paused = finishRun(pauseRun(startRun({ planned: 25 }, T0), T0 + 4 * MIN), T0 + 30 * MIN);
    expect(actualMinutes(paused)).toBe(4);
  });

  it('ساعت با ارقام فارسی و گرد به بالا', () => {
    expect(fmtClock(25 * MIN)).toBe('۲۵:۰۰');
    expect(fmtClock(61 * 1000 - 1)).toBe('۰۱:۰۱');
    expect(fmtClock(-5)).toBe('۰۰:۰۰');
  });

  it('روز بدون جلسه null است و خلاصه درست می‌شود', () => {
    const rows = [
      { date: 'a', actual: 20, outcome: 'done' },
      { date: 'a', actual: 10, outcome: 'partial' },
      { date: 'c', actual: 30, outcome: 'skip' },
    ];
    expect(dailyMinutes(rows, ['a', 'b', 'c'])).toEqual([30, null, 30]);
    expect(summarize(rows)).toMatchObject({ count: 3, minutes: 60, avg: 20, done: 1, partial: 1, skip: 1 });
  });
});

describe('calendarLogic', () => {
  it('اول فروردین ۱۴۰۵ برابر ۲۱ مارس ۲۰۲۶ و ماه ۳۱ روزه است', () => {
    expect(jalali('2026-03-21')).toEqual({ y: 1405, m: 1, d: 1 });
    expect(monthStart('2026-04-10')).toBe('2026-03-21');
    expect(monthLength('2026-03-21')).toBe(31);
  });

  it('شبکهٔ ماه از شنبه شروع می‌شود و هفته‌ها ۷ خانه‌اند', () => {
    const g = buildMonth('2026-10-21');
    expect(g.m).toBe(7);
    expect(g.weeks.every((w) => w.length === 7)).toBe(true);
    const first = g.weeks[0].findIndex(Boolean);
    expect(first).toBe(weekdayIdx(g.start));
    expect(g.weeks.flat().filter(Boolean)).toHaveLength(g.len);
  });

  it('جابه‌جایی ماه به جلو و عقب', () => {
    expect(shiftMonth('2026-03-25', 1)).toBe('2026-04-21');
    expect(shiftMonth('2026-03-25', -1)).toBe('2026-02-20');
    expect(jalali(shiftMonth('2026-03-25', -1)).d).toBe(1);
  });

  it('خط زمانی مرتب است و کارهای بدون ساعت جداست', () => {
    const b = dayBlocks(
      [{ id: 1, title: 'الف', time: '14:00', done: true }, { id: 2, title: 'ب' }],
      [{ id: 1, title: 'تمرکز', start: '08:30', actual: 25 }]
    );
    expect(b.timed.map((x) => x.kind)).toEqual(['focus', 'real']);
    expect(b.untimed).toHaveLength(1);
  });
});
