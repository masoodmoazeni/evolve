import { describe, expect, it } from 'vitest';
import { buildGoal, newMilestone, toggleMilestone, validateGoal } from '../goalUtils.js';
import { goalProgress } from '../logic.js';

describe('validateGoal', () => {
  it('عنوان خالی خطا می‌دهد', () => expect(validateGoal({ title: ' ', type: 'daily' }).title).toBeTruthy());
  it('هدف هفتگی هدف بین ۱ تا ۷ لازم دارد', () => {
    expect(validateGoal({ title: 'a', type: 'weekly', target: 0 }).target).toBeTruthy();
    expect(validateGoal({ title: 'a', type: 'weekly', target: 3 })).toEqual({});
  });
  it('نقطه‌عطف‌محور دست‌کم یک مرحله می‌خواهد', () => {
    expect(validateGoal({ title: 'a', type: 'milestones', milestones: [newMilestone()] }).milestones).toBeTruthy();
  });
});

describe('buildGoal / milestones / progress', () => {
  it('مراحل خالی حذف می‌شوند', () => {
    const m = { ...newMilestone(), title: ' گام ' };
    const g = buildGoal({ title: ' t ', type: 'milestones', milestones: [m, newMilestone()] });
    expect(g.milestones).toHaveLength(1);
    expect(g.milestones[0].title).toBe('گام');
  });
  it('تغییر نقطه‌عطف پیشرفت را درست حساب می‌کند', () => {
    const g = { type: 'milestones', milestones: [{ id: 'a', title: 'x', done: false }, { id: 'b', title: 'y', done: false }] };
    const g2 = toggleMilestone(g, 'a', 123);
    expect(g2.milestones[0].doneAt).toBe(123);
    expect(goalProgress(g2, []).ratio).toBe(0.5);
    expect(toggleMilestone(g2, 'a').milestones[0].done).toBe(false);
  });
  it('پیشرفت روزانه و هفتگی', () => {
    const logs = [{ status: 'done' }, { status: 'done' }, { status: 'partial' }];
    expect(goalProgress({ type: 'daily' }, logs).ratio).toBeCloseTo(2 / 7);
    expect(goalProgress({ type: 'weekly', target: 2 }, logs).ratio).toBe(1);
  });
});
