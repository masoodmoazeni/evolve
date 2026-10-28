import { timeToMin } from './util.js';
import { DEFAULT_DAY_PLAN } from './capacityLogic.js';

export const minToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const DEFAULT_DISPLAY_MIN = 30;
export const MIN_GAP = 30;

// بلوک‌های روز، جاهای خالی ≥۳۰ دقیقه و کارهای بدون ساعت. بیش از ۲ لِین هم‌زمان به «conflicts» می‌رود.
export function layoutDay({ tasks, focus = [], dayPlan, date }) {
  const p = { ...DEFAULT_DAY_PLAN, ...(dayPlan ?? {}) };
  const timed = tasks.filter((t) => t.time);
  const unscheduled = tasks.filter((t) => !t.time);
  const raw = [
    ...timed.map((t) => ({ id: `t${t.id}`, kind: 'task', taskId: t.id, start: timeToMin(t.time), len: Number(t.minutes) > 0 ? Number(t.minutes) : DEFAULT_DISPLAY_MIN, title: t.title, done: !!t.done, effort: t.effort ?? null })),
    ...focus.filter((f) => f.date === date && f.start).map((f) => ({ id: `f${f.id}`, kind: 'focus', start: timeToMin(f.start), len: Math.max(5, f.actual || f.planned || DEFAULT_DISPLAY_MIN), title: f.title || 'تمرکز', done: true })),
  ].sort((a, b) => a.start - b.start || b.len - a.len);

  const laneEnd = [];
  const blocks = [];
  const conflicts = [];
  raw.forEach((b) => {
    const end = Math.min(24 * 60, b.start + b.len);
    let lane = laneEnd.findIndex((e) => e <= b.start);
    if (lane < 0) lane = laneEnd.length;
    if (lane >= 2) return conflicts.push({ ...b, end });
    laneEnd[lane] = end;
    blocks.push({ ...b, end, lane });
  });

  const gaps = [];
  let cur = timeToMin(p.start);
  const endDay = timeToMin(p.end);
  [...blocks].sort((a, b) => a.start - b.start).forEach((b) => {
    if (b.start - cur >= MIN_GAP && b.start <= endDay) gaps.push({ start: cur, end: Math.min(b.start, endDay) });
    cur = Math.max(cur, b.end);
  });
  if (endDay - cur >= MIN_GAP) gaps.push({ start: cur, end: endDay });
  return { blocks, gaps: gaps.map((g) => ({ ...g, minutes: g.end - g.start })), unscheduled, conflicts };
}

// بازهٔ ساعتی نمایش: ساعت‌های برنامهٔ روز، گسترده تا هر بلوکی که بیرون از آن افتاده (مثلاً تمرکز ۰۷:۳۰) بیرون کادر نماند.
export function dayBounds(blocks, dayPlan) {
  const p = { ...DEFAULT_DAY_PLAN, ...(dayPlan ?? {}) };
  let from = Math.floor(timeToMin(p.start) / 60);
  let to = Math.ceil(timeToMin(p.end) / 60);
  blocks.forEach((b) => {
    from = Math.min(from, Math.floor(b.start / 60));
    to = Math.max(to, Math.ceil(b.end / 60));
  });
  return { from, to };
}
