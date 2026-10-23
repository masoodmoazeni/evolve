import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { fmtDuration, goalTimeStats, sessionGoalId } from '../goalTime.js';
import { buildCoachExport } from '../coachExport.js';

const TODAY = '2026-06-15';
const goal = { id: 1, title: 'یادگیری آلمانی', status: 'active', type: 'daily', startDate: '2026-06-01' };
const tasks = [
  { id: 10, title: 'درس ۱', date: '2026-06-10', goalId: 1, done: true },
  { id: 11, title: 'درس ۲', date: '2026-06-12', goalId: 1, done: false },
  { id: 12, title: 'کار دیگر', date: '2026-06-12', goalId: 2, done: true },
  { id: 13, title: 'بدون هدف', date: '2026-06-12', goalId: null, done: true },
];
const focus = [
  { date: '2026-06-10', actual: 30, taskId: 10, title: 'درس ۱' },
  { date: '2026-06-10', actual: 20, taskId: 10, title: 'درس ۱' },
  { date: '2026-06-12', actual: 45, taskId: 11, title: 'درس ۲' },
  { date: '2026-06-13', actual: 25, taskId: null, goalId: 1, title: 'لغت' },
  { date: '2026-06-13', actual: 60, taskId: 12, title: 'x' },
  { date: '2026-06-14', actual: 15, taskId: 13, title: 'y' },
];

describe('goalTimeStats', () => {
  const s = goalTimeStats(goal, focus, tasks, TODAY);
  it('جلسه از راه کار یا مستقیم به هدف می‌رسد', () => {
    const m = new Map(tasks.map((t) => [t.id, t]));
    expect(sessionGoalId(focus[0], m)).toBe(1);
    expect(sessionGoalId(focus[3], m)).toBe(1);
    expect(sessionGoalId(focus[4], m)).toBe(2);
    expect(sessionGoalId(focus[5], m)).toBe(null);
  });
  it('جمع دقیقه و روزهای فعال', () => {
    expect(s.totalMin).toBe(120);
    expect(s.sessions).toBe(4);
    expect(s.activeDays).toBe(3);
  });
  it('زمان هر کار و کار آزاد', () => {
    expect(s.tasks.find((t) => t.taskId === 10).minutes).toBe(50);
    expect(s.tasks.find((t) => t.taskId === 11).done).toBe(false);
    expect(s.tasks.find((t) => t.title === 'لغت').minutes).toBe(25);
    expect(s.tasksDone).toBe(1);
    expect(s.tasksTotal).toBe(2);
  });
  it('روز بدون ثبت null است و هفته‌ها جمع می‌شوند', () => {
    expect(s.perDay[0].date).toBe('2026-06-01');
    expect(s.perDay.at(-1).date).toBe(TODAY);
    expect(s.perDay.find((d) => d.date === '2026-06-11').minutes).toBeNull();
    expect(s.perWeek.reduce((a, w) => a + w.minutes, 0)).toBe(120);
  });
  it('هدف بدون جلسه خالی است', () => {
    const e = goalTimeStats({ id: 9 }, focus, tasks, TODAY);
    expect(e.totalMin).toBe(0);
    expect(e.perDay).toEqual([]);
  });
  it('قالب مدت', () => {
    expect(fmtDuration(90)).toBe('۱ ساعت و ۳۰ دقیقه');
    expect(fmtDuration(45)).toBe('۴۵ دقیقه');
    expect(fmtDuration(120)).toBe('۲ ساعت');
  });
});

describe('buildCoachExport', () => {
  const tables = {
    goals: [goal], tasks, focus, habits: [], habitLogs: [], goalLogs: [], moods: [],
    notes: [{ date: '2026-06-14', text: 'راز خصوصی' }],
    reviews: [{ kind: 'day', date: '2026-06-14', good: 'متن مرور' }],
    kv: [{ key: 'profile', value: { name: 'مسعود' } }],
  };
  const now = new Date(2026, 5, 15);
  it('سرآیند دوزبانه و زمان هدف', () => {
    const t = buildCoachExport(tables, {}, now);
    expect(t).toContain('YOUR ROLE');
    expect(t).toContain('مربی');
    expect(t).toContain('یادگیری آلمانی');
    expect(t).toContain('زمان تمرکز: 120 دقیقه');
  });
  it('پیش‌فرض حریم‌دوست: بدون نام، یادداشت و مرور', () => {
    const t = buildCoachExport(tables, {}, now);
    expect(t).not.toContain('مسعود');
    expect(t).not.toContain('راز خصوصی');
    expect(t).not.toContain('متن مرور');
  });
  it('با روشن‌کردن گزینه‌ها وارد می‌شود', () => {
    const t = buildCoachExport(tables, { names: true, notes: true, reviews: true }, now);
    expect(t).toContain('مسعود');
    expect(t).toContain('راز خصوصی');
    expect(t).toContain('متن مرور');
  });
  it('بدون رگهٔ تنبیهی', () => {
    expect(buildCoachExport(tables, {}, now)).not.toMatch(/از دست/);
  });
});
