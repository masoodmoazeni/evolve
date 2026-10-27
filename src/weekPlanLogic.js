import { db, getKV, setKV } from './db.js';
import { MAX_PRIORITIES } from './data.js';
import { addDays } from './util.js';
import { capacityMin, loadState, plannedMin } from './capacityLogic.js';

export const weekKey = (weekStartKey) => `weekPlan:${weekStartKey}`;
export const MAX_OUTCOMES = 3;

export const emptyWeekPlan = () => ({ outcomes: [], note: '', createdAt: Date.now() });
export const loadWeekPlan = async (ws) => (await getKV(weekKey(ws))) ?? emptyWeekPlan();
export const saveWeekPlan = (ws, plan) => setKV(weekKey(ws), plan);

export function addOutcome(plan, title, goalId = null) {
  const t = title.trim();
  if (!t || plan.outcomes.length >= MAX_OUTCOMES) return plan;
  return { ...plan, outcomes: [...plan.outcomes, { id: `${Date.now()}${plan.outcomes.length}`, title: t, goalId, done: false }] };
}

// حداکثر ۳ هدف فعال که این هفته کم‌ثبت‌اند؛ فقط پیشنهاد است
export function suggestOutcomes(goals, weekDone = new Map()) {
  return goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ goal: g, done: weekDone.get(g.id) ?? 0 }))
    .sort((a, b) => a.done - b.done)
    .slice(0, MAX_OUTCOMES)
    .map((x) => x.goal);
}

export function weekLoad(ws, tasks, dayPlan, rest = []) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ws, i);
    const planned = plannedMin(tasks.filter((t) => t.date === date)).minutes;
    const capacity = capacityMin(dayPlan, date, rest);
    return { date, planned, capacity, state: loadState(planned, capacity) };
  });
}

export async function moveTask(task, date) {
  const prev = { date: task.date, priority: task.priority };
  const n = date === 'someday' ? MAX_PRIORITIES : await db.tasks.where('date').equals(date).filter((t) => t.priority).count();
  await db.tasks.update(task.id, { date, priority: !!task.priority && n < MAX_PRIORITIES && date !== 'someday' });
  return () => db.tasks.update(task.id, prev);
}

export const outcomeProgress = (plan, tasks) =>
  plan.outcomes.map((o) => {
    const mine = tasks.filter((t) => t.outcomeId === o.id);
    return { ...o, total: mine.length, doneCount: mine.filter((t) => t.done).length };
  });
