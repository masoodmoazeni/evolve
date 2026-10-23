import { describe, expect, it } from 'vitest';
import { draftInsights, draftsToText, moodSummary, optionalAvg } from '../reflectLogic.js';

const habits = [{ id: 1, title: 'قدم‌زدن', days: [0, 1, 2, 3, 4, 5, 6] }];
const dates = ['2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];

describe('draftInsights', () => {
  it('با داده‌ی کم صادقانه می‌گوید کافی نیست', () => {
    const r = draftInsights({ habits, habitLogs: [{ habitId: 1, date: dates[0], status: 'done' }], dates, today: dates[6] });
    expect(r.enough).toBe(false);
    expect(r.items).toEqual([]);
  });
  it('نرخ، نسخهٔ حداقل، مانع و عادت سخت را توصیف می‌کند', () => {
    const logs = [
      { habitId: 1, date: dates[0], status: 'done', usedMin: true },
      { habitId: 1, date: dates[1], status: 'partial', obstacle: 'time' },
      { habitId: 1, date: dates[2], status: 'skipped', obstacle: 'time' },
      { habitId: 1, date: dates[3], status: 'partial' },
    ];
    const r = draftInsights({ habits, habitLogs: logs, dates, today: dates[6] });
    expect(r.enough).toBe(true);
    const ids = r.items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['rate', 'min', 'obstacle', 'hard']));
    expect(r.items.find((i) => i.id === 'rate').text).toContain('ثبت‌نشده');
    expect(draftsToText(r.items).startsWith('• ')).toBe(true);
  });
  it('روزهای آینده برنامه‌ریزی‌شده حساب نمی‌شوند', () => {
    const logs = [1, 2, 3].map((i) => ({ habitId: 1, date: dates[i], status: 'done' }));
    const r = draftInsights({ habits, habitLogs: logs, dates, today: dates[3] });
    expect(r.items[0].text).toContain('۴ برنامه‌ریزی‌شده');
  });
});

describe('check-in fields', () => {
  it('optionalAvg زیر ۳ ثبت null است', () => {
    expect(optionalAvg([{ focus: 3 }, { focus: 4 }], 'focus')).toBeNull();
    expect(optionalAvg([{ focus: 2 }, { focus: 4 }, { focus: 3 }, {}], 'focus')).toBe(3);
  });
  it('moodSummary با فیلدهای جدید سازگار می‌ماند', () => {
    const s = [1, 2, 3].map((i) => ({ date: `d${i}`, mood: 'calm', energy: 60 }));
    expect(moodSummary(s)).toMatchObject({ enough: true, avgEnergy: 60 });
  });
});
