import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, prune, setKV } from '../db.js';
import { addDays, dateKey, jalali, weekStart } from '../util.js';
import { occursOn, generateRecurring, skipInstance, applyTemplate, saveDayAsTemplate } from '../recurLogic.js';
import { capacityMin, loadState, plannedMin } from '../capacityLogic.js';
import { isRest, validateRest } from '../restLogic.js';
import { layoutDay } from '../timelineLogic.js';
import { pickTomorrow, matchesFilter, moveInList } from '../priorityLogic.js';
import { estimateStats, estimateText, estimateSuggestions } from '../estimateLogic.js';
import { krProgress, krCurrent, validateKR, goalKrProgress } from '../keyResultLogic.js';
import { focusByArea } from '../areaLogic.js';
import { peakWindow } from '../energyLogic.js';
import { needsBackupNudge } from '../backupLogic.js';
import { jalaliMonthRange, rollupMonths, ymOf } from '../monthLogic.js';
import { weekLoad, suggestOutcomes, moveTask, addOutcome, emptyWeekPlan } from '../weekPlanLogic.js';

const TODAY = '2026-10-27'; // سه‌شنبه ۵ آبان ۱۴۰۵

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('recurrence', () => {
  it('weekly and monthly rules', () => {
    expect(occursOn({ type: 'weekly', days: [4] }, '2026-10-28')).toBe(true); // چهارشنبه
    expect(occursOn({ type: 'daily' }, TODAY)).toBe(true);
    expect(occursOn({ type: 'weekdays', days: [0, 1] }, TODAY)).toBe(false);
    const j = jalali(TODAY);
    expect(occursOn({ type: 'monthly', dom: j.d }, TODAY)).toBe(true);
  });
  it('monthly 31 clamps to last day of a 30-day month', () => {
    // آخرین روز آبان ۱۴۰۵ = ۳۰ آبان
    let d = TODAY;
    while (jalali(d).d !== 30 || jalali(d).m !== 8) d = addDays(d, 1);
    expect(occursOn({ type: 'monthly', dom: 31 }, d)).toBe(true);
    expect(occursOn({ type: 'monthly', dom: 31 }, addDays(d, -1))).toBe(false);
  });
  it('generation is idempotent and skip survives deletion', async () => {
    const id = await db.recurring.add({ title: 'ورزش', rule: { type: 'daily' }, startDate: TODAY, status: 'active', skip: [], priority: true });
    expect(await generateRecurring(TODAY, 1)).toBe(2);
    expect(await generateRecurring(TODAY, 1)).toBe(0);
    const t = await db.tasks.where('date').equals(TODAY).first();
    const undo = await skipInstance(t);
    await db.tasks.delete(t.id);
    expect(await generateRecurring(TODAY, 1)).toBe(0);
    await undo();
    expect((await db.recurring.get(id)).skip).toEqual([]);
  });
  it('respects priority cap and rest days', async () => {
    for (let i = 0; i < 4; i += 1) await db.recurring.add({ title: `r${i}`, rule: { type: 'daily' }, startDate: TODAY, status: 'active', skip: [], priority: true });
    await generateRecurring(TODAY, 0);
    expect((await db.tasks.toArray()).filter((t) => t.priority)).toHaveLength(3);
    await db.tasks.clear();
    expect(await generateRecurring(TODAY, 0, [{ from: TODAY, to: TODAY }])).toBe(0);
  });
  it('templates apply and undo', async () => {
    await db.tasks.add({ title: 'الف', date: TODAY, minutes: 10, done: false });
    await saveDayAsTemplate(TODAY, 'روز کاری');
    const tpl = (await db.dayTemplates.toArray())[0];
    const undo = await applyTemplate(tpl, '2026-10-30');
    expect(await db.tasks.where('date').equals('2026-10-30').count()).toBe(1);
    await undo();
    expect(await db.tasks.where('date').equals('2026-10-30').count()).toBe(0);
  });
});

describe('capacity and rest', () => {
  it('computes with busy blocks, safety margin and rest', () => {
    expect(capacityMin({}, TODAY)).toBe(670); // ۸۴۰×۰٫۸=۶۷۲ → ۶۷۰
    const plan = { start: '08:00', end: '18:00', busy: [{ days: [3], from: '09:00', to: '13:00' }] };
    expect(capacityMin(plan, TODAY)).toBe(290);
    expect(capacityMin({}, TODAY, [{ from: TODAY, to: TODAY }])).toBe(0);
  });
  it('states at the boundaries', () => {
    expect(loadState(70, 100)).toBe('free');
    expect(loadState(71, 100)).toBe('near');
    expect(loadState(100, 100)).toBe('near');
    expect(loadState(101, 100)).toBe('over');
  });
  it('tasks without minutes are counted separately', () => {
    expect(plannedMin([{ minutes: 30 }, { minutes: null }, { minutes: 20, done: true }])).toEqual({ minutes: 30, unestimated: 1 });
  });
  it('rest validation', () => {
    expect(validateRest({ from: '2026-10-10', to: '2026-10-09' })).toBeTruthy();
    expect(validateRest({ from: '2026-10-01', to: '2026-12-30' })).toBeTruthy();
    expect(validateRest({ from: '2026-10-10', to: '2026-10-14' }, [{ id: 'x', from: '2026-10-12', to: '2026-10-20' }])).toBeTruthy();
    expect(validateRest({ from: '2026-10-10', to: '2026-10-14' })).toBe('');
    expect(isRest('2026-10-14', [{ from: '2026-10-10', to: '2026-10-14' }])).toBe(true);
  });
});

describe('timeline', () => {
  it('lays out overlap, gaps and unscheduled', () => {
    const r = layoutDay({
      date: TODAY, dayPlan: { start: '08:00', end: '14:00' },
      tasks: [{ id: 1, title: 'a', time: '09:00', minutes: 90 }, { id: 2, title: 'b', time: '09:30', minutes: 30 }, { id: 3, title: 'c', time: '09:45', minutes: 30 }, { id: 4, title: 'd' }],
      focus: [],
    });
    expect(r.blocks.map((b) => b.lane)).toEqual([0, 1]);
    expect(r.conflicts).toHaveLength(1);
    expect(r.unscheduled).toHaveLength(1);
    expect(r.gaps[0]).toMatchObject({ start: 480, end: 540 });
    expect(r.gaps.at(-1).end).toBe(840);
  });
  it('defaults untimed length to 30 for display', () => {
    expect(layoutDay({ date: TODAY, tasks: [{ id: 1, title: 'a', time: '10:00' }], dayPlan: {} }).blocks[0].end).toBe(630);
  });
});

describe('priorities', () => {
  it('caps at three and ranks by choice', () => {
    const out = pickTomorrow([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], [3, 1, 2, 4]);
    expect(out.filter((x) => x.patch.priority)).toHaveLength(3);
    expect(out.find((x) => x.id === 3).patch.rank).toBe(1);
    expect(out.find((x) => x.id === 4).patch.priority).toBe(false);
    expect(moveInList([1, 2, 3], 3, -1)).toEqual([1, 3, 2]);
  });
  it('filters', () => {
    expect(matchesFilter({ important: true }, 'important', TODAY)).toBe(true);
    expect(matchesFilter({ important: true, deadline: TODAY }, 'important', TODAY)).toBe(false);
    expect(matchesFilter({ deadline: addDays(TODAY, 2) }, 'soon', TODAY)).toBe(true);
    expect(matchesFilter({ deadline: addDays(TODAY, 9) }, 'soon', TODAY)).toBe(false);
  });
});

describe('week plan', () => {
  it('weekLoad, outcomes cap, moveTask undo', async () => {
    const ws = weekStart(TODAY);
    const load = weekLoad(ws, [{ date: TODAY, minutes: 700, done: false }], {});
    expect(load).toHaveLength(7);
    expect(load.find((d) => d.date === TODAY).state).toBe('over');
    let p = emptyWeekPlan();
    ['a', 'b', 'c', 'd'].forEach((t) => { p = addOutcome(p, t); });
    expect(p.outcomes).toHaveLength(3);
    expect(suggestOutcomes([{ id: 1, status: 'active' }, { id: 2, status: 'active' }, { id: 3, status: 'archived' }])).toHaveLength(2);
    const id = await db.tasks.add({ title: 't', date: TODAY, priority: true, done: false });
    const t = await db.tasks.get(id);
    const undo = await moveTask(t, '2026-10-29');
    expect((await db.tasks.get(id)).date).toBe('2026-10-29');
    await undo();
    expect((await db.tasks.get(id)).date).toBe(TODAY);
  });
  it('prune removes stale week plans only', async () => {
    await setKV('weekPlan:2020-01-04', {});
    await setKV('weekPlan:2026-10-24', {});
    await setKV('pruneAck', true);
    await prune(new Date(2026, 9, 27));
    expect(await db.kv.get('weekPlan:2020-01-04')).toBeUndefined();
    expect(await db.kv.get('weekPlan:2026-10-24')).toBeTruthy();
  });
});

describe('estimates', () => {
  const mk = (planned, actual) => ({ outcome: 'done', planned, actual });
  it('needs 6 sessions', () => {
    expect(estimateStats(Array(5).fill(mk(30, 40))).enough).toBe(false);
    const s = estimateStats(Array(6).fill(mk(30, 40)));
    expect(s.enough).toBe(true);
    expect(s.ratio).toBeCloseTo(1.33, 1);
    expect(estimateText(s)).toContain('کوتاه');
    expect(estimateSuggestions(s, [{ id: 1, minutes: 30 }, { id: 2 }])[0].to).toBe(40);
  });
  it('ignores skipped and very short sessions; near-accurate text', () => {
    const s = estimateStats([...Array(6).fill(mk(30, 31)), { outcome: 'skip', planned: 30, actual: 50 }, mk(30, 2)]);
    expect(s.n).toBe(6);
    expect(estimateText(s)).toContain('نزدیک');
    expect(estimateSuggestions(s, [{ id: 1, minutes: 30 }])).toEqual([]);
  });
});

describe('key results', () => {
  it('progress, computed sources, validation', () => {
    expect(krProgress({ start: 0, target: 12, current: 7 })).toBeCloseTo(0.58, 2);
    expect(krProgress({ start: 0, target: 12, current: 30 })).toBe(1);
    const kr = { source: 'focusMin', period: '30d', start: 0, target: 12 };
    const focus = [{ date: TODAY, actual: 120, goalId: 1 }, { date: addDays(TODAY, -40), actual: 600, goalId: 1 }];
    expect(krCurrent(kr, { goal: { id: 1 }, focus }, TODAY)).toBe(2);
    expect(validateKR({ title: 'x', start: 0, target: 5, source: 'focusMin', period: 'year' })).toBeTruthy();
    expect(validateKR({ title: 'x', start: 0, target: 5, source: 'focusMin', period: '60d' })).toBe('');
    expect(goalKrProgress({})).toBe(0);
    expect(goalKrProgress({ keyResults: [{ start: 0, target: 10, current: 10 }, { start: 0, target: 10, current: 0 }] })).toBe(0.5);
  });
});

describe('areas and energy', () => {
  it('aggregates by area incl. none', () => {
    const r = focusByArea([{ date: TODAY, actual: 60, goalId: 1 }, { date: TODAY, actual: 30 }], [{ id: 1, area: 'learning' }], [], TODAY);
    expect(r.total).toBe(90);
    expect(r.rows.find((x) => x.key === 'learning').minutes).toBe(60);
    expect(r.rows.find((x) => x.key === 'none').minutes).toBe(30);
  });
  it('peak window needs enough data', () => {
    const f = (start, outcome = 'done') => ({ start, outcome, energy: 80 });
    expect(peakWindow([f('09:00')]).enough).toBe(false);
    const rows = [f('09:00'), f('10:00'), f('09:30'), f('14:00', 'partial'), f('14:30', 'skip'), f('20:00', 'skip'), f('20:30', 'skip'), f('10:30')];
    const w = peakWindow(rows);
    expect(w.enough).toBe(true);
    expect(w.from).toBe(8);
    expect(w.start).toBe('08:00');
  });
});

describe('backup nudge', () => {
  it('boundaries', () => {
    expect(needsBackupNudge({ today: TODAY, firstUse: addDays(TODAY, -6) })).toBe(false);
    expect(needsBackupNudge({ today: TODAY, firstUse: addDays(TODAY, -7) })).toBe(true);
    expect(needsBackupNudge({ today: TODAY, lastExport: addDays(TODAY, -13) })).toBe(false);
    expect(needsBackupNudge({ today: TODAY, lastExport: addDays(TODAY, -14) })).toBe(true);
    expect(needsBackupNudge({ today: TODAY, lastExport: addDays(TODAY, -30), nudgeAt: addDays(TODAY, -2) })).toBe(false);
  });
});

describe('monthly summaries', () => {
  it('month ranges handle 31/30/29-day months', () => {
    expect(jalaliMonthRange('1405-01').days).toBe(31);
    expect(jalaliMonthRange('1405-08').days).toBe(30);
    expect([29, 30]).toContain(jalaliMonthRange('1405-12').days);
    expect(ymOf('2026-10-27')).toBe('1405-08');
  });
  it('rollup happens before prune and is idempotent; definitions survive', async () => {
    const now = new Date(2026, 9, 27);
    const old = '2026-08-10'; // مرداد ۱۴۰۵، ۷۸ روز پیش
    await db.focus.add({ date: old, actual: 50, planned: 50, outcome: 'done' });
    await db.focus.add({ date: '2026-10-26', actual: 20 });
    await db.goals.add({ title: 'g', status: 'active' });
    await setKV('pruneAck', true);
    expect((await prune(now)).status).toBe('done');
    expect(await db.focus.count()).toBe(1);
    const s = await db.monthSummaries.get(ymOf(old));
    expect(s.focusMin).toBe(50);
    expect(s.title).toBeUndefined();
    expect(await rollupMonths(dateKey(now))).toBe(0);
    expect(await db.goals.count()).toBe(1);
  });
  it('keepMonthly=false skips the rollup', async () => {
    await db.focus.add({ date: '2026-08-10', actual: 50 });
    await setKV('keepMonthly', false);
    await setKV('pruneAck', true);
    await prune(new Date(2026, 9, 27));
    expect(await db.monthSummaries.count()).toBe(0);
  });
});
