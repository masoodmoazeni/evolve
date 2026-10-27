import { describe, expect, it } from 'vitest';
import { LESSONS, WEEKS, buildPlan, defaultStart, dayMinutes } from '../german/plan.js';
import { weekdayIdx } from '../util.js';

describe('برنامهٔ آلمانی A1', () => {
  const plan = buildPlan('2026-11-07');
  it('۴۹ روز و هر ۱۲ درس دقیقاً در برنامه می‌آید', () => {
    expect(plan).toHaveLength(WEEKS * 7);
    const text = plan.flatMap((d) => d.items.map((i) => i.text)).join(' ');
    for (const l of LESSONS) expect(text).toContain(`درس ${l.n} ·`);
  });
  it('جمعه‌ها آزادند و روز کاری بیش از ۴۵ دقیقه نیست', () => {
    for (const d of plan) {
      expect(dayMinutes(d)).toBeLessThanOrEqual(45);
      if (d.slot === 6) expect(d.items[0].skill).toBe('rest');
    }
  });
  it('هفتهٔ آخر آزمون آزمایشی دارد', () => {
    expect(plan.filter((d) => d.week === 7).some((d) => d.items.some((i) => i.skill === 'exam'))).toBe(true);
  });
  it('شروع پیش‌فرض شنبه است', () => {
    expect(weekdayIdx(defaultStart('2026-10-27'))).toBe(0);
    expect(defaultStart('2026-11-07')).toBe('2026-11-07');
  });
});
