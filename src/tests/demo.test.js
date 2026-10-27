import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db.js';
import { buildDemo } from '../demoData.js';
import { demoCount, removeDemoData, stripDemo } from '../demoLogic.js';
import { applyImport, parseBackup } from '../importLogic.js';

const real = { app: 'evolve', exportedAt: 'x', version: 2, tables: { tasks: [{ id: 1, title: 'واقعی', date: '2026-10-27', done: false }], kv: [{ key: 'profile', value: { name: 'م' } }] } };
const merged = () => {
  const b = structuredClone(real);
  for (const [n, rows] of Object.entries(buildDemo('2026-10-27'))) b.tables[n] = [...(b.tables[n] ?? []), ...rows];
  return JSON.stringify(b);
};

beforeEach(async () => { await Promise.all(db.tables.map((t) => t.clear())); });

describe('demo data', () => {
  it('imports, then removal leaves only real records and can be undone', async () => {
    const p = parseBackup(merged());
    expect(p.ok).toBe(true);
    await applyImport(p.backup, { mode: 'merge', skipOld: false }, new Date('2026-10-27T12:00:00'));
    expect(await demoCount()).toBeGreaterThan(50);
    const r = await removeDemoData();
    expect(await demoCount()).toBe(0);
    expect(await db.tasks.count()).toBe(1);
    expect((await db.kv.get('profile')).value.name).toBe('م');
    await r.undo();
    expect(await demoCount()).toBe(r.count);
  });
  it('strips demo rows from a backup file and ids never collide with real ones', () => {
    const b = JSON.parse(merged());
    const s = stripDemo(b);
    expect(s.tables.tasks).toEqual(real.tables.tasks);
    expect(s.tables.kv).toEqual(real.tables.kv);
    expect(Math.min(...b.tables.goals.map((g) => g.id))).toBeGreaterThan(100);
  });
  it('keeps references consistent', () => {
    const d = buildDemo('2026-10-27');
    const tasks = new Set(d.tasks.map((t) => t.id));
    expect(d.focus.filter((f) => f.taskId).every((f) => tasks.has(f.taskId))).toBe(true);
    const habits = new Set(d.habits.map((h) => h.id));
    expect(d.habits.every((h) => h.afterHabitId == null || habits.has(h.afterHabitId))).toBe(true);
  });
});
