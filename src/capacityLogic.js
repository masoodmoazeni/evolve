import { faNum, timeToMin, weekdayIdx } from './util.js';
import { isRest } from './restLogic.js';

export const DEFAULT_DAY_PLAN = { start: '08:00', end: '22:00', busy: [] };
export const SAFETY = 0.8;

// ظرفیت واقعی روز به دقیقه: (ساعت‌های در دسترس − مشغولی) × ۰٫۸، گرد به ۵؛ روز استراحت = ۰
export function capacityMin(dayPlan, date, rest = []) {
  if (isRest(date, rest)) return 0;
  const p = { ...DEFAULT_DAY_PLAN, ...(dayPlan ?? {}) };
  const wd = weekdayIdx(date);
  const busy = (p.busy ?? []).filter((b) => (b.days ?? []).includes(wd)).reduce((a, b) => a + Math.max(0, timeToMin(b.to) - timeToMin(b.from)), 0);
  const free = Math.max(0, timeToMin(p.end) - timeToMin(p.start) - busy);
  return Math.round((free * SAFETY) / 5) * 5;
}

export function plannedMin(tasks) {
  const open = tasks.filter((t) => !t.done);
  return { minutes: open.reduce((a, t) => a + (Number(t.minutes) > 0 ? Number(t.minutes) : 0), 0), unestimated: open.filter((t) => !(Number(t.minutes) > 0)).length };
}

// free ≤ ۷۰٪ · near تا ۱۰۰٪ · over بیشتر
export function loadState(planned, cap) {
  if (cap <= 0) return planned > 0 ? 'over' : 'free';
  const r = planned / cap;
  return r <= 0.7 ? 'free' : r <= 1 ? 'near' : 'over';
}

export function fmtMinutes(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return faNum(h && r ? `${h} ساعت و ${r} دقیقه` : h ? `${h} ساعت` : `${r} دقیقه`);
}

export function capacityText(state, planned, cap) {
  if (state === 'over') return 'این‌ها از ظرفیتی که گفتی بیشتر است. اگر خواستی یکی را به فردا ببریم.';
  if (state === 'near') return 'نزدیک ظرفیت امروزی است.';
  return `حدود ${fmtMinutes(Math.max(0, cap - planned))} جا داری.`;
}
