import { describe, expect, it } from 'vitest';
import { addDays } from '../util.js';
import { allTags, dayValues, filterNotes, moodSeries, moodSummary, noteTitle, parseTags, reviewKeys, weekSummaryText } from '../reflectLogic.js';

describe('notes', () => {
  const notes = [
    { id: 1, text: 'پیاده‌روی خوب بود', tags: ['ورزش'], ts: 1 },
    { id: 2, title: 'ایده', text: 'کتاب', tags: ['کار', 'ورزش'], ts: 2 },
  ];
  it('parseTags جداکننده‌ها و تکراری‌ها را حل می‌کند', () => {
    expect(parseTags('#کار، ورزش  کار,خواب')).toEqual(['کار', 'ورزش', 'خواب']);
    expect(parseTags('')).toEqual([]);
  });
  it('filterNotes جستجو و برچسب', () => {
    expect(filterNotes(notes, 'کتاب').map((n) => n.id)).toEqual([2]);
    expect(filterNotes(notes, '', 'ورزش').map((n) => n.id)).toEqual([2, 1]);
    expect(allTags(notes).sort()).toEqual(['ورزش', 'کار']);
  });
  it('noteTitle', () => {
    expect(noteTitle(notes[0])).toBe('پیاده‌روی خوب بود');
    expect(noteTitle(notes[1])).toBe('ایده');
  });
});

describe('mood', () => {
  const today = '2026-06-15';
  it('آخرین ثبت هر روز را برمی‌دارد', () => {
    const s = moodSeries([{ date: today, mood: 'ok', energy: 40, ts: 1 }, { date: today, mood: 'good', energy: 70, ts: 2 }], today, 14);
    expect(s).toHaveLength(14);
    expect(s[13]).toMatchObject({ mood: 'good', energy: 70 });
    expect(s[0].mood).toBeNull();
  });
  it('با کمتر از ۳ ثبت کافی نیست', () => {
    const s = moodSeries([{ date: today, mood: 'ok', energy: 40, ts: 1 }], today);
    expect(moodSummary(s).enough).toBe(false);
  });
  it('با ۳ ثبت میانگین و شمارش', () => {
    const m = ['2026-06-13', '2026-06-14', '2026-06-15'].map((date, i) => ({ date, mood: i ? 'good' : 'ok', energy: 60, ts: i }));
    expect(moodSummary(moodSeries(m, today))).toMatchObject({ enough: true, count: 3, avgEnergy: 60, counts: { good: 2, ok: 1 } });
  });
});

describe('review', () => {
  it('dayValues: بدون ثبت = null', () => {
    const logs = [{ date: 'a', status: 'done' }, { date: 'a', status: 'partial' }, { date: 'b', status: 'skipped' }];
    expect(dayValues(['a', 'b', 'c'], logs)).toEqual([1, 0, null]);
  });
  it('reviewKeys برای روز و هفته', () => {
    expect(reviewKeys('day', '2026-06-15')).toMatchObject({ date: '2026-06-15', nextDate: '2026-06-16' });
    const w = reviewKeys('week', '2026-06-15');
    expect(w.dates).toHaveLength(7);
    expect(w.nextDate).toBe(addDays(w.dates[0], 7));
  });
  it('متن هفته بدون سرزنش', () => {
    expect(weekSummaryText({ done: 0, partial: 0, skipped: 0 })).toContain('داده نیست');
    expect(weekSummaryText({ done: 3, partial: 1, skipped: 0 })).toBe('از ثبت‌های تو: ۳ انجام‌شده، ۱ نیمه‌کاره.');
  });
});
