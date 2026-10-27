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
