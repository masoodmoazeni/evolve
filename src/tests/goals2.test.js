import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { db } from '../db.js';
import { buildGoal, measureProgress, metricSummary, newMetric, parseMetricValue, sortGoals, validateGoal, SKILL_PRESETS } from '../goalUtils.js';

describe('buildGoal فیلدهای اختیاری', () => {
  it('هدف ساده بدون فیلد اختیاری ساخته می‌شود و پیش‌فرض‌ها درست‌اند', () => {
    const g = buildGoal({ title: 'آلمانی', type: 'daily' });
    expect(g).toMatchObject({ priority: 2, obstacles: [], metrics: [], baselineValue: null, targetValue: null, deadline: null, status: 'active' });
  });
  it('تاریخ هدف با deadline قدیمی هم‌خوان می‌ماند', () => {
    expect(buildGoal({ title: 'a', type: 'daily', targetDate: '2026-12-01' }).deadline).toBe('2026-12-01');
    expect(buildGoal({ title: 'a', type: 'daily', deadline: '2026-11-01' }).targetDate).toBe('2026-11-01');
  });
  it('موانع و معیارهای خالی حذف می‌شوند', () => {
    const g = buildGoal({ title: 'a', type: 'daily', obstacles: [' کار ', ''], metrics: [newMetric(' شنیدن '), { key: 'x', label: ' ', scale: '1-5' }], baselineValue: '70', targetValue: '65' });
    expect(g.obstacles).toEqual(['کار']);
    expect(g.metrics).toHaveLength(1);
    expect(g.metrics[0].label).toBe('شنیدن');
    expect(g.baselineValue).toBe(70);
  });
  it('اعتبارسنجی اولویت، عدد و بازهٔ تاریخ', () => {
    expect(validateGoal({ title: 'a', type: 'daily', priority: 5 }).priority).toBeTruthy();
    expect(validateGoal({ title: 'a', type: 'daily', baselineValue: 'abc' }).baselineValue).toBeTruthy();
    expect(validateGoal({ title: 'a', type: 'daily', startDate: '2026-05-02', targetDate: '2026-05-01' }).targetDate).toBeTruthy();
    expect(validateGoal({ title: 'a', type: 'daily', priority: 1, baselineValue: '' })).toEqual({});
  });
});

describe('sortGoals', () => {
  it('بر پایهٔ اولویت و سپس تازه‌ترین', () => {
    const gs = [{ id: 1, priority: 3 }, { id: 2 }, { id: 3, priority: 1 }];
    expect(sortGoals(gs).map((g) => g.id)).toEqual([3, 2, 1]);
    expect(sortGoals(gs, 'recent').map((g) => g.id)).toEqual([3, 2, 1]);
  });
});

describe('معیارهای مهارت', () => {
  it('مقدار مقیاس ۱ تا ۵ اعتبارسنجی می‌شود', () => {
    const m = newMetric('گرامر');
    expect(parseMetricValue(m, '4')).toEqual({ ok: true, value: 4 });
    expect(parseMetricValue(m, '6').ok).toBe(false);
    expect(parseMetricValue(m, '2.5').ok).toBe(false);
    expect(parseMetricValue({ scale: 'number' }, '72.5').value).toBe(72.5);
    expect(parseMetricValue({ scale: 'number' }, '').ok).toBe(false);
  });
  it('خلاصه: کمتر از ۳ ثبت یعنی داده کافی نیست', () => {
    expect(metricSummary([{ date: '2026-01-01', value: 2 }, { date: '2026-01-02', value: 3 }]).enough).toBe(false);
    const s = metricSummary([{ date: '2026-01-03', value: 4 }, { date: '2026-01-01', value: 2 }, { date: '2026-01-02', value: 3 }]);
    expect(s).toMatchObject({ enough: true, first: 2, latest: 4, count: 3 });
  });
  it('پیشرفت اندازه‌پذیر از مبدأ تا مقصد (حتی کاهشی)', () => {
    expect(measureProgress({ baselineValue: 70, targetValue: 65 }, 67.5)).toBeCloseTo(0.5);
    expect(measureProgress({ baselineValue: 0, targetValue: 10 }, 15)).toBe(1);
    expect(measureProgress({ baselineValue: 5, targetValue: 5 }, 5)).toBeNull();
    expect(measureProgress({ baselineValue: 1, targetValue: 2 }, null)).toBeNull();
  });
  it('پیش‌فرض‌های آلمانی و ذخیره در goalMetrics', async () => {
    expect(SKILL_PRESETS).toContain('تلفظ');
    const id = await db.goalMetrics.add({ goalId: 9, date: '2026-01-01', dimension: 'm1', value: 3, note: '' });
    expect((await db.goalMetrics.where('goalId').equals(9).toArray())[0].id).toBe(id);
  });
});
