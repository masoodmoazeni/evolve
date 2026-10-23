import { addDays, jalali, weekdayIdx, timeToMin } from './util.js';

// نخستین روز ماه شمسیِ شامل کلید داده‌شده
export function monthStart(key) {
  let k = key;
  while (jalali(k).d !== 1) k = addDays(k, -1);
  return k;
}

export function monthLength(startKey) {
  const m = jalali(startKey).m;
  let n = 1;
  let k = addDays(startKey, 1);
  while (jalali(k).m === m) {
    n += 1;
    k = addDays(k, 1);
  }
  return n;
}

// شبکهٔ ماه: هفته‌ها از شنبه شروع می‌شوند؛ خانهٔ خالی = null
export function buildMonth(refKey) {
  const start = monthStart(refKey);
  const len = monthLength(start);
  const j = jalali(start);
  const cells = Array(weekdayIdx(start)).fill(null);
  for (let i = 0; i < len; i += 1) cells.push({ key: addDays(start, i), d: i + 1 });
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { y: j.y, m: j.m, start, end: addDays(start, len - 1), len, weeks };
}

export function shiftMonth(refKey, delta) {
  let k = monthStart(refKey);
  for (let i = 0; i < Math.abs(delta); i += 1) k = delta > 0 ? addDays(k, monthLength(k)) : monthStart(addDays(k, -1));
  return k;
}

// بلوک‌های خط زمانی یک روز: کار ساعت‌دار، جلسهٔ تمرکز و کارهای بدون ساعت
export function dayBlocks(tasks, focusRows) {
  const timed = [];
  tasks.filter((t) => t.time).forEach((t) =>
    timed.push({ kind: t.done ? 'real' : 'plan', time: t.time, title: t.title, minutes: t.minutes || null, id: t.id })
  );
  focusRows.filter((f) => f.start).forEach((f) =>
    timed.push({ kind: 'focus', time: f.start, title: f.title || 'تمرکز', minutes: f.actual || null, id: `f${f.id}` })
  );
  timed.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
  return { timed, untimed: tasks.filter((t) => !t.time) };
}
