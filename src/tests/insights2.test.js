import { describe, expect, it } from 'vitest';
import { difficultyTrend, habitSlot, hasReliableData, obstacleRanking, periodStats, slotStats, weeklyTrend } from '../insightLogic.js';

const habits = [
  { id: 1, title: 'الف', days: [0, 1, 2, 3, 4, 5, 6], reminder: '07:30' },
  { id: 2, title: 'ب', days: [0, 1, 2, 3, 4, 5, 6], timeOfDay: 'night' },
];
const dates = ['2026-06-13', '2026-06-14', '2026-06-15']; // شنبه تا دوشنبه

describe('periodStats', () => {
  it('ثبت‌نشده جدا شمرده می‌شود و نرخ‌ها تفکیک‌اند', () => {
    const logs = [
      { habitId: 1, date: dates[0], status: 'done', amount: 20, usedMin: true },
      { habitId: 2, date: dates[0], status: 'partial', amount: 5 },
      { habitId: 1, date: dates[1], status: 'skipped', amount: 10 },
    ];
    const s = periodStats({ habits, habitLogs: logs, dates, today: dates[2] });
    expect(s).toMatchObject({ scheduled: 6, recorded: 3, unrecorded: 3, done: 1, partial: 1, skipped: 1, minDone: 1, minutes: 25 });
    expect(s.rateOfRecorded).toBeCloseTo(1 / 3);
    expect(s.rateOfScheduled).toBeCloseTo(1 / 6);
  });
  it('روزهای آینده برنامه‌ریزی‌شده حساب نمی‌شوند', () => {
    const s = periodStats({ habits, habitLogs: [], dates, today: dates[0] });
    expect(s.scheduled).toBe(2);
    expect(s.rateOfRecorded).toBeNull();
    expect(hasReliableData(s)).toBe(false);
  });
});

describe('obstacles, slots, trends', () => {
  it('رتبهٔ مانع‌ها فقط کلیدهای معتبر را می‌شمارد', () => {
    const r = obstacleRanking([{ obstacle: 'time' }, { obstacle: 'time' }, { obstacle: 'energy' }, { obstacle: 'zzz' }, {}]);
    expect(r.map((x) => [x.key, x.n])).toEqual([['time', 2], ['energy', 1]]);
    expect(r[0].label).toBe('کمبود وقت');
  });
  it('habitSlot از ساعت یادآور و بعد زمان انتخابی', () => {
    expect(habitSlot(habits[0])).toBe('morning');
    expect(habitSlot(habits[1])).toBe('night');
    expect(habitSlot({ timeOfDay: 'any' })).toBeNull();
  });
  it('slotStats زیر ۳ ثبت ردیف نمی‌دهد', () => {
    const mk = (status, i) => ({ habitId: 1, date: `2026-06-1${i}`, status });
    expect(slotStats(habits, [mk('done', 1), mk('done', 2)])).toEqual([]);
    const r = slotStats(habits, [mk('done', 1), mk('done', 2), mk('skipped', 3)]);
    expect(r[0]).toMatchObject({ slot: 'morning', n: 3, done: 2 });
  });
  it('difficultyTrend و weeklyTrend', () => {
    const logs = [{ habitId: 1, date: '2026-06-13', status: 'done', effort: 2 }, { habitId: 1, date: '2026-06-14', status: 'done', effort: 4 }];
    const t = difficultyTrend(logs, ['2026-06-13', '2026-06-20']);
    expect(t[0].avg).toBe(3);
    expect(t[1].avg).toBeNull();
    const w = weeklyTrend({ habits, habitLogs: logs, weekStarts: ['2026-06-13'], today: '2026-06-19' });
    expect(w[0]).toMatchObject({ scheduled: 14, recorded: 2, unrecorded: 12 });
  });
});
