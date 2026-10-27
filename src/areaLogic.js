import { AREAS } from './data.js';
import { sessionGoalId } from './goalTime.js';
import { addDays } from './util.js';

// دقیقهٔ تمرکز به تفکیک حوزه (بدون حوزه = none)؛ فقط توصیف، بدون «ایده‌آل»
export function focusByArea(focus, goals, tasks, today, days = 28) {
  const from = addDays(today, -days + 1);
  const byGoal = new Map(goals.map((g) => [g.id, g]));
  const byTask = new Map(tasks.map((t) => [t.id, t]));
  const totals = { none: 0 };
  AREAS.forEach((a) => { totals[a.key] = 0; });
  focus.filter((f) => f.date >= from && f.date <= today).forEach((f) => {
    const gid = sessionGoalId(f, byTask);
    const area = gid != null ? byGoal.get(gid)?.area : null;
    totals[area && totals[area] != null ? area : 'none'] += f.actual || 0;
  });
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  const rows = [...AREAS, { key: 'none', label: 'بدون حوزه' }].map((a) => ({ key: a.key, label: a.label, minutes: totals[a.key], share: sum ? totals[a.key] / sum : 0 }));
  return { total: sum, rows: rows.filter((r) => r.minutes > 0) };
}
