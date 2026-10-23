import { describe, expect, it } from 'vitest';
import { changedFields, emptyHabit, habitToForm, hasExtras, logExtra, snapshotSummary, splitCounts, toHabitRecord, validateHabit } from '../screens/habitLogic.js';

describe('habits v2', () => {
  it('فیلدهای جدید نرمال می‌شوند و فرم دوطرفه است', () => {
    const f = { ...emptyHabit(), title: 'آلمانی', amount: '20', minVersion: '۵ لغت', cue: ' بعد از صبحانه ', challengeMin: '30', difficulty: 2, prep: [' کتاب ', ''], obstaclesNote: ['خستگی'] };
    const r = toHabitRecord(f);
    expect(r).toMatchObject({ cue: 'بعد از صبحانه', challengeMin: 30, difficulty: 2, prep: ['کتاب'], obstaclesNote: ['خستگی'] });
    expect(habitToForm(r)).toMatchObject({ cue: 'بعد از صبحانه', challengeMin: '30', difficulty: 2 });
    expect(hasExtras(emptyHabit())).toBe(false);
    expect(hasExtras(habitToForm(r))).toBe(true);
  });

  it('اعتبارسنجی فیلدهای جدید', () => {
    const e = validateHabit({ ...emptyHabit(), title: 'x', challengeMin: '-1', difficulty: 7 });
    expect(Object.keys(e)).toEqual(['challengeMin', 'difficulty']);
    expect(validateHabit({ ...emptyHabit(), title: 'x' })).toEqual({});
  });

  it('عادت قدیمی بدون فیلدهای جدید هم کار می‌کند', () => {
    const old = { id: 1, title: 'ورزش', amount: 20, minVersion: '', days: [0], timeOfDay: 'any', reminder: null, goalId: null };
    expect(habitToForm(old)).toMatchObject({ cue: '', prep: [], difficulty: '' });
    expect(changedFields(old, toHabitRecord(habitToForm(old), old))).toEqual([]);
  });

  it('changedFields فقط تغییرهای واقعی را برمی‌گرداند', () => {
    const prev = { title: 'الف', amount: 20, minVersion: '', cue: '', prep: [] };
    expect(changedFields(prev, { ...prev, amount: 10, cue: 'بعد از چای' })).toEqual(['مقدار عادی', 'نشانهٔ شروع']);
    expect(snapshotSummary({ amount: 20, minVersion: 'کم', cue: 'چای' })).toBe('عادی ۲۰ دقیقه · حداقل: کم · نشانه: چای'.replace('۲۰', '20'));
  });

  it('نسخهٔ حداقل جدا از انجام کامل شمرده می‌شود', () => {
    const c = splitCounts([
      { status: 'done' }, { status: 'done', usedMin: true }, { status: 'partial' }, { status: 'partial', usedMin: true }, { status: 'skipped' },
    ]);
    expect(c).toEqual({ full: 1, minimum: 2, partial: 1, skipped: 1 });
  });

  it('logExtra فقط مقدارهای پرشده را می‌دهد', () => {
    expect(logExtra({ usedMin: false, effort: 0, energy: '', obstacle: '' })).toEqual({});
    expect(logExtra({ usedMin: true, effort: 3, energy: '70', obstacle: 'time' })).toEqual({ usedMin: true, effort: 3, energy: 70, obstacle: 'time' });
  });
});
