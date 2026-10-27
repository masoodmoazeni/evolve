import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db.js';
import { addInbox, inboxItems, triage } from '../planLogic.js';
import { ifThenSentence, validateIfThen } from '../ifThenLogic.js';
import { emptyHabit, habitToForm, toHabitRecord, validateHabit } from '../screens/habitLogic.js';

beforeEach(async () => {
  await db.tasks.clear();
});

describe('inbox', () => {
  it('adds, lists and ignores blanks', async () => {
    expect(await addInbox('  ')).toBeNull();
    const r = await addInbox('زنگ به بیمه');
    const items = inboxItems(await db.tasks.toArray());
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe('someday');
    await r.undo();
    expect(await db.tasks.count()).toBe(0);
  });
  it('triage moves and can be undone, never sets priority', async () => {
    await addInbox('الف');
    const t = (await db.tasks.toArray())[0];
    const undo = await triage(t, 'tomorrow', { today: '2026-10-27' });
    const moved = await db.tasks.get(t.id);
    expect(moved.date).toBe('2026-10-28');
    expect(moved.priority).toBe(false);
    expect(inboxItems(await db.tasks.toArray())).toHaveLength(0);
    await undo();
    expect(inboxItems(await db.tasks.toArray())).toHaveLength(1);
  });
  it('delete and someday', async () => {
    await addInbox('ب');
    const t = (await db.tasks.toArray())[0];
    const undo = await triage(t, 'delete');
    expect(await db.tasks.count()).toBe(0);
    await undo();
    expect(await db.tasks.count()).toBe(1);
    await triage(t, 'someday');
    expect(inboxItems(await db.tasks.toArray())).toHaveLength(0);
  });
});

describe('if-then', () => {
  it('builds sentence, falls back to legacy cue, handles anchors', () => {
    expect(ifThenSentence({ cue: 'بعد از صبحانه' })).toBe('وقتی بعد از صبحانه.');
    expect(ifThenSentence({ cue: '' })).toBe('');
    const h = { ifThen: { when: 'قهوه ریختم', then: 'مطالعه می‌کنم' } };
    expect(ifThenSentence(h)).toBe('وقتی قهوه ریختم، مطالعه می‌کنم.');
    const map = new Map([[2, { id: 2, title: 'مسواک شب' }]]);
    expect(ifThenSentence({ ...h, afterHabitId: 2 }, map)).toBe('بعد از «مسواک شب»، مطالعه می‌کنم.');
    map.get(2).paused = true;
    expect(ifThenSentence({ ...h, afterHabitId: 2 }, map)).toBe('وقتی قهوه ریختم، مطالعه می‌کنم.');
  });
  it('rejects then without when', () => {
    expect(validateIfThen({ thenDo: 'x', cue: '', afterHabitId: '' })).not.toBe('');
    expect(validateIfThen({ thenDo: 'x', cue: 'y', afterHabitId: '' })).toBe('');
    expect(validateHabit({ ...emptyHabit(), title: 't', thenDo: 'x' }).thenDo).toBeTruthy();
  });
  it('form round trip keeps old habits working', () => {
    const f = habitToForm({ title: 'a', cue: 'قدیمی', days: [0] });
    expect(f.cue).toBe('قدیمی');
    const rec = toHabitRecord({ ...f, thenDo: 'کاری', afterHabitId: '3' });
    expect(rec.ifThen).toEqual({ when: 'قدیمی', then: 'کاری' });
    expect(rec.afterHabitId).toBe(3);
    expect(toHabitRecord(f).ifThen).toBeNull();
  });
});

import { buildCoach } from '../coachLogic.js';
import { applySuggestion } from '../coachApply.js';

describe('coach plan rules', () => {
  const today = '2026-10-27';
  const focusAll = Array.from({ length: 8 }, (_, i) => ({ date: '2026-10-2' + (i % 5), start: ['09:00', '14:00', '20:00', '10:00'][i % 4], planned: 30, actual: 45, outcome: i % 4 === 1 || i % 4 === 2 ? 'partial' : 'done', energy: 80 }));
  const base = { habits: [], habitLogs: [], moods: [], suggestions: [], today, focus: focusAll, focusAll, access: { habits: true, focus: true } };
  it('suggests longer estimates and heavy-in-peak, with undo', async () => {
    await db.tasks.clear();
    const id = await db.tasks.add({ title: 'گزارش', date: '2026-10-28', minutes: 30, effort: 'heavy', time: '15:00', done: false });
    const tasksTomorrow = await db.tasks.toArray();
    const r = buildCoach({ ...base, tasksTomorrow });
    const kinds = r.suggestions.filter((s) => s.kind === 'task').map((s) => s.rule);
    expect(kinds).toEqual(expect.arrayContaining(['estimate', 'peak']));
    const est = r.suggestions.find((s) => s.rule === 'estimate');
    expect(est.patch.minutes).toBe(45);
    expect(est.before).toBeTruthy();
    const undo = await applySuggestion(est, today);
    expect((await db.tasks.get(id)).minutes).toBe(45);
    await undo();
    expect((await db.tasks.get(id)).minutes).toBe(30);
  });
  it('does not repeat a rejected ukey', () => {
    const tasksTomorrow = [{ id: 1, title: 'x', date: '2026-10-28', minutes: 30 }];
    const first = buildCoach({ ...base, tasksTomorrow }).suggestions[0];
    const again = buildCoach({ ...base, tasksTomorrow, suggestions: [{ ukey: first.ukey, status: 'rejected' }] });
    expect(again.suggestions.find((s) => s.ukey === first.ukey)).toBeUndefined();
  });
});
