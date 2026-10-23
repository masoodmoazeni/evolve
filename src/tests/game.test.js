import { describe, expect, it } from 'vitest';
import { BADGES, activeDaysLast7, earnedBadges, hasComeback, levelInfo, questsFor, totalsForRows, weeklyChallenge, dayStats } from '../gameLogic.js';

const rows = {
  focus: [{ date: '2026-06-15', actual: 30, start: '08:00' }, { date: '2026-06-14', actual: 600, start: '10:00' }],
  tasks: [{ date: '2026-06-15', done: true }, { date: '2026-06-15', done: false }],
  habitLogs: [{ date: '2026-06-15', status: 'done' }, { date: '2026-06-15', status: 'skipped' }],
  notes: [], reviews: [{ date: '2026-06-15' }], moods: [],
};

describe('game logic', () => {
  it('computes XP with chest and per-day cap', () => {
    // روز ۱۵: ۳۰ دقیقه=۱۲ + کار ۱۰ + عادت ۵ + مرور ۱۰ + صندوقچه ۱۵ = ۵۲؛ روز ۱۴: سقف ۲۴۰ دقیقه = ۹۶
    const t = totalsForRows(rows, 240);
    expect(t.xp).toBe(52 + 96);
    expect(t.focusMin).toBe(630);
    expect(t.morning).toBe(1);
  });
  it('never gives XP for skipped habits or open tasks', () => {
    expect(totalsForRows({ tasks: [{ date: 'a', done: false }], habitLogs: [{ date: 'a', status: 'skipped' }] }).xp).toBe(0);
  });
  it('level thresholds', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, name: 'جوانه', need: 100 });
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(299).level).toBe(2);
    expect(levelInfo(300)).toMatchObject({ level: 3, name: 'ساقه' });
    expect(levelInfo(100000).name).toBe('درخت');
  });
  it('quests and light day', () => {
    const s = dayStats(rows, '2026-06-15');
    expect(questsFor(s).map((q) => q.done)).toEqual([true, true, true]);
    expect(questsFor(dayStats({}, 'x'), true)).toHaveLength(1);
  });
  it('active days and comeback', () => {
    expect(activeDaysLast7(rows, '2026-06-15')).toBe(2);
    const r = { tasks: [{ date: '2026-06-01', done: true }, { date: '2026-06-10', done: true }] };
    expect(hasComeback(r, '2026-06-12')).toBe(true);
    expect(hasComeback({ tasks: [{ date: '2026-06-10', done: true }] }, '2026-06-12')).toBe(false);
  });
  it('badges', () => {
    const ids = earnedBadges({ sessions: 1, focusMin: 700, morning: 0, tasksDone: 0, habitDone: 0, reviews: 0 }, { comeback: true });
    expect(ids).toEqual(['first', 'f10', 'back']);
    expect(BADGES.length).toBe(8);
  });
  it('weekly challenge target', () => {
    expect(weeklyChallenge({}, '2026-06-15')).toEqual({ target: 150, done: 0, hasHistory: false });
    const w = weeklyChallenge({ focus: [{ date: '2026-06-08', actual: 400 }] }, '2026-06-15');
    expect(w.hasHistory).toBe(true);
    expect(w.target % 30).toBe(0);
  });
});
