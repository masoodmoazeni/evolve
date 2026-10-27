import { describe, expect, it } from 'vitest';
import { buildReminders, focusEndAt, DEFAULT_NOTIF } from '../notify.js';
import { startRun, pauseRun, finishRun } from '../focusLogic.js';

describe('focusEndAt', () => {
  const t0 = 1_700_000_000_000;
  it('پایان جلسهٔ در جریان را برمی‌گرداند', () => {
    const run = startRun({ planned: 25 }, t0);
    expect(focusEndAt(run, t0 + 5 * 60000)).toBe(t0 + 25 * 60000);
  });
  it('با مکث، پایان‌یافته یا تمام‌شده null است', () => {
    const run = startRun({ planned: 25 }, t0);
    expect(focusEndAt(pauseRun(run, t0 + 1000), t0 + 2000)).toBeNull();
    expect(focusEndAt(finishRun(run, t0 + 1000), t0 + 2000)).toBeNull();
    expect(focusEndAt(run, t0 + 26 * 60000)).toBeNull();
    expect(focusEndAt(null, t0)).toBeNull();
  });
});

describe('buildReminders', () => {
  const cfg = { ...DEFAULT_NOTIF, daily: true, dailyAt: '20:30' };
  it('روز هفته را به قرارداد اندروید (یکشنبه=۱ … شنبه=۷) برمی‌گرداند', () => {
    const habits = [{ id: 1, title: 'ورزش', reminder: '07:30', days: [0, 1, 6], paused: false }];
    const out = buildReminders({ name: 'علی' }, habits, cfg);
    expect(out.filter((n) => n.key.startsWith('habit')).map((n) => n.weekday)).toEqual([7, 1, 6]);
    expect(out[0]).toMatchObject({ key: 'daily', time: '20:30', weekday: null });
  });
  it('عادت متوقف، بدون ساعت یا اعلان خاموش چیزی نمی‌سازد', () => {
    const habits = [{ id: 1, title: 'الف', reminder: '07:30', days: [0], paused: true }, { id: 2, title: 'ب', reminder: null, days: [0] }];
    expect(buildReminders(null, habits, { ...cfg, daily: false })).toEqual([]);
    expect(buildReminders(null, [{ id: 3, title: 'ج', reminder: '08:00', days: [1] }], { ...cfg, enabled: false })).toEqual([]);
  });
});
