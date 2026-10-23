import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { db } from '../db.js';
import { GOAL_EXAMPLES, HABIT_EXAMPLES, addGoalExample, addHabitExample } from '../examples.js';

describe('examples', () => {
  it('adds every goal and habit example as an editable record', async () => {
    for (const g of GOAL_EXAMPLES) await addGoalExample(g);
    for (const h of HABIT_EXAMPLES) await addHabitExample(h);
    const goals = await db.goals.toArray();
    const habits = await db.habits.toArray();
    expect(goals).toHaveLength(GOAL_EXAMPLES.length);
    expect(habits).toHaveLength(HABIT_EXAMPLES.length);
    expect(goals.every((g) => g.title && g.status === 'active')).toBe(true);
    expect(habits.every((h) => h.days.length > 0)).toBe(true);
  });
});
