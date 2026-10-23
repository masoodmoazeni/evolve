import { describe, expect, it } from 'vitest';
import { barValues, canAddPriority, emptyHabit, greeting, lastDays, splitTasks, toHabitRecord, validateHabit, weekBarValues } from '../screens/habitLogic.js';

describe('habitLogic', () => {
  it('lastDays و barValues: ثبت‌نشده null است', () => {
    const d = lastDays('2026-06-15', 3);
    expect(d).toEqual(['2026-06-13', '2026-06-14', '2026-06-15']);
    expect(barValues([{ date: '2026-06-14', status: 'partial' }, { date: '2026-06-15', status: 'done' }], d)).toEqual([null, 60, 100]);
  });

  it('اعتبارسنجی عادت', () => {
    expect(Object.keys(validateHabit({ ...emptyHabit(), title: ' ', days: [] }))).toEqual(['title', 'days']);
    expect(validateHabit({ ...emptyHabit(), title: 'ورزش', amount: '15', reminder: '07:30' })).toEqual({});
    expect(validateHabit({ ...emptyHabit(), title: 'ورزش', amount: '-3' }).amount).toBeTruthy();
  });

  it('toHabitRecord مقادیر را نرمال می‌کند و وضعیت قبلی را نگه می‌دارد', () => {
    const r = toHabitRecord({ ...emptyHabit(), title: ' ورزش ', amount: '20', days: [3, 1], goalId: '2' }, { id: 5, paused: true });
    expect(r).toMatchObject({ id: 5, title: 'ورزش', amount: 20, days: [1, 3], goalId: 2, reminder: null, paused: true, status: 'active' });
  });

  it('حداکثر ۳ اولویت', () => {
    const t = (priority) => ({ priority });
    expect(canAddPriority([t(true), t(true), t(false)])).toBe(true);
    expect(canAddPriority([t(true), t(true), t(true)])).toBe(false);
    const s = splitTasks([t(true), t(true), t(true), t(true), t(false)]);
    expect(s.priorities).toHaveLength(3);
    expect(s.others).toHaveLength(2);
  });

  it('weekBarValues: روز آینده و بدون ثبت null', () => {
    const dates = ['2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16'];
    const logs = [{ date: '2026-06-13', status: 'done' }, { date: '2026-06-13', status: 'partial' }, { date: '2026-06-15', status: 'skipped' }];
    expect(weekBarValues(logs, dates, '2026-06-15')).toEqual([1.5, null, 0.2, null]);
  });

  it('greeting', () => {
    expect([greeting(3), greeting(8), greeting(14), greeting(19), greeting(22)]).toEqual(['شب بخیر', 'صبح بخیر', 'روز بخیر', 'عصر بخیر', 'شب بخیر']);
  });
});
