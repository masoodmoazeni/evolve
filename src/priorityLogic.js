import { MAX_PRIORITIES } from './data.js';
import { diffDays } from './util.js';

// «سه کار فردا»: حداکثر ۳ کار، rank = ترتیب انتخاب؛ بقیه اولویت نیستند
export function pickTomorrow(tasks, ids) {
  const chosen = ids.slice(0, MAX_PRIORITIES);
  return tasks.map((t) => {
    const i = chosen.indexOf(t.id);
    return i >= 0 ? { id: t.id, patch: { priority: true, rank: i + 1 } } : { id: t.id, patch: { priority: false, rank: null } };
  });
}

export const byRank = (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || (a.id ?? 0) - (b.id ?? 0);

export const FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'important', label: 'مهم و بدون مهلت' },
  { key: 'soon', label: 'نزدیک مهلت' },
];

// ماتریس ۴خانه‌ای نمایش داده نمی‌شود؛ فقط این دو فیلتر
export function matchesFilter(task, key, today) {
  if (key === 'important') return !!task.important && !task.deadline;
  if (key === 'soon') return !!task.deadline && diffDays(task.deadline, today) <= 3;
  return true;
}

export function moveInList(ids, id, dir) {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
