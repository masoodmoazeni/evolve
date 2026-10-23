import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db.js';
import { addDays } from '../util.js';
import { buildCoach } from '../coachLogic.js';
import { HABIT_RULES, recoveryState } from '../coachRules.js';
import { applySuggestion } from '../coachApply.js';
import { computeMilestones, findReturn, hasEffortWeek } from '../milestoneLogic.js';

const TODAY = '2026-06-15';
const H = (o = {}) => ({ id: 1, title: 'مطالعه', amount: 30, days: [0, 1, 2, 3, 4, 5, 6], timeOfDay: 'morning', ...o });
const L = (i, status, extra = {}) => ({ habitId: 1, date: addDays(TODAY, -i), status, ...extra });
const ctx = (habits, habitLogs, history = []) => ({ habits, habitLogs, tasksTomorrow: [], today: TODAY, history });
const run = (id, c) => HABIT_RULES.find((r) => r.id === id).run(c);

beforeEach(async () => { await Promise.all(db.tables.map((t) => t.clear())); });

describe('قانون‌های مربی', () => {
  it('جلسهٔ بلند مکرر نیمه‌کاره → مقدار پیش‌فرض کوتاه‌تر با توضیح کامل', () => {
    const logs = [L(0, 'partial', { amount: 15 }), L(1, 'partial', { amount: 15 }), L(2, 'partial', { amount: 20 }), L(3, 'done')];
    const [s] = run('shorter-default', ctx([H()], logs));
    expect(s.patch).toEqual({ amount: 15 });
    for (const k of ['observed', 'change', 'why', 'tradeoff']) expect(s[k]).toBeTruthy();
  });
  it('زمان مکرراً ناموفق → زمان دیگر', () => {
    const logs = [0, 1, 2, 3].map((i) => L(i, 'skipped', { obstacle: 'time' }));
    expect(run('better-time', ctx([H()], logs))[0].patch).toEqual({ timeOfDay: 'noon' });
  });
  it('فراموشی مکرر → یادآور، و اگر یادآور دارد پیشنهادی نیست', () => {
    const logs = [L(0, 'skipped', { obstacle: 'forgot' }), L(1, 'skipped', { obstacle: 'forgot' }), L(2, 'done')];
    expect(run('stronger-cue', ctx([H()], logs))[0].patch.reminder).toBe('08:00');
    expect(run('stronger-cue', ctx([H({ reminder: '09:00' })], logs))).toHaveLength(0);
  });
  it('کمبود وقت → نسخهٔ حداقل کوچک‌تر', () => {
    const logs = [L(0, 'skipped', { obstacle: 'time' }), L(1, 'skipped', { obstacle: 'time' })];
    expect(run('smaller-minimum', ctx([H({ minVersion: '10' })], logs))[0].patch).toEqual({ minVersion: '5' });
    expect(run('smaller-minimum', ctx([H()], logs))[0].patch.minVersion).toContain('۵');
  });
  it('چند هفتهٔ آسان → افزایش تدریجی؛ با نیمه‌کاره یا نسخهٔ حداقل پیشنهاد نمی‌شود', () => {
    const easy = Array.from({ length: 9 }, (_, i) => L(i * 2, 'done'));
    expect(run('gradual-progress', ctx([H()], easy))[0].patch).toEqual({ amount: 35 });
    expect(run('gradual-progress', ctx([H()], [...easy, L(1, 'partial')]))).toHaveLength(0);
    expect(run('gradual-progress', ctx([H()], easy.map((l) => ({ ...l, usedMin: true }))))).toHaveLength(0);
  });
  it('برای هر عادت یک پیشنهاد و ردشده تکرار نمی‌شود', () => {
    const logs = [0, 1, 2, 3].map((i) => L(i, 'skipped', { obstacle: 'time' }));
    const base = { habits: [H()], habitLogs: logs, tasksTomorrow: [], focus: [], moods: [], suggestions: [], today: TODAY };
    const a = buildCoach(base).suggestions;
    expect(a.filter((s) => s.habitId === 1)).toHaveLength(1);
    expect(buildCoach({ ...base, suggestions: [{ ukey: a[0].ukey, status: 'rejected' }] }).suggestions.find((s) => s.ukey === a[0].ukey)).toBeUndefined();
  });
});

describe('اعمال پیشنهاد و نسخه‌بندی', () => {
  it('قبل از تغییر نسخه ثبت می‌شود و بازگردانی تاریخچه را حفظ می‌کند', async () => {
    const id = await db.habits.add({ title: 'مطالعه', amount: 30, timeOfDay: 'morning' });
    const s = { kind: 'habit', habitId: id, patch: { timeOfDay: 'noon' }, change: 'تغییر زمان', ukey: 'better-time:x' };
    const undo = await applySuggestion(s, TODAY);
    expect((await db.habits.get(id)).timeOfDay).toBe('noon');
    const revs = await db.habitRevisions.toArray();
    expect(revs).toHaveLength(1);
    expect(revs[0]).toMatchObject({ habitId: id, source: 'coach' });
    expect(revs[0].snapshot.timeOfDay).toBe('morning');
    await undo();
    expect((await db.habits.get(id)).timeOfDay).toBe('morning');
    expect(await db.habitRevisions.count()).toBe(2);
  });
});

describe('بازگشت پس از وقفه و نقاط عطف', () => {
  it('وضعیت سختی: دو روز بدون ثبت از سه روز اخیر', () => {
    const r = recoveryState({ habits: [H()], habitLogs: [L(1, 'done')], today: TODAY });
    expect(r.gaps).toBe(2);
    expect(recoveryState({ habits: [H()], habitLogs: [L(1, 'done'), L(2, 'partial')], today: TODAY })).toBeNull();
  });
  it('بازگشت پس از وقفه جشن گرفته می‌شود، نه رگه', () => {
    const logs = [L(10, 'done'), L(11, 'done'), L(0, 'partial')];
    expect(findReturn(['2026-06-04', '2026-06-05', TODAY], TODAY)).toMatchObject({ date: TODAY, gap: 9 });
    const m = computeMilestones({ habitLogs: logs, focus: [], today: TODAY });
    expect(m.map((x) => x.key)).toContain(`return:${TODAY}`);
    expect(computeMilestones({ habitLogs: logs, focus: [], today: TODAY, seen: [`return:${TODAY}`] }).map((x) => x.key)).not.toContain(`return:${TODAY}`);
  });
  it('اولین فعالیت و هفتهٔ تلاش', () => {
    expect(computeMilestones({ habitLogs: [L(0, 'done')], focus: [], today: TODAY }).map((x) => x.key)).toEqual(['first']);
    expect(hasEffortWeek([0, 1, 3, 4, 6].map((i) => addDays('2026-06-01', i)))).toBe(true);
    expect(hasEffortWeek([0, 1, 3, 4].map((i) => addDays('2026-06-01', i)))).toBe(false);
  });
});
