import { addDays, diffDays, faNum, weekStart } from './util.js';

const hasGoal = (id) => id !== null && id !== undefined && id !== '';

// جلسهٔ تمرکز مال هدف است اگر مستقیم به آن وصل شده باشد، یا از راه کاری که به هدف وصل است
export function sessionGoalId(session, taskById) {
  if (hasGoal(session.goalId)) return Number(session.goalId);
  const t = session.taskId != null ? taskById.get(session.taskId) : null;
  return t && hasGoal(t.goalId) ? Number(t.goalId) : null;
}

const sumMin = (rows) => rows.reduce((a, r) => a + (r.actual || 0), 0);

/**
 * زمان و کارهای یک هدف، فقط از ثبت‌های خود کاربر.
 * خروجی: جمع دقیقه، دقیقهٔ هر روز و هفته در بازهٔ هدف، و کارها به‌همراه زمان هرکدام.
 */
export function goalTimeStats(goal, focusRows, tasks, today) {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const sessions = focusRows.filter((s) => sessionGoalId(s, taskById) === goal.id);
  const linked = tasks.filter((t) => hasGoal(t.goalId) && Number(t.goalId) === goal.id);

  const byTask = linked.map((t) => {
    const rows = sessions.filter((s) => s.taskId === t.id);
    return { taskId: t.id, title: t.title, done: !!t.done, date: t.date, minutes: sumMin(rows), sessions: rows.length };
  });
  // جلسه‌هایی که به کاری وصل نیستند (تمرکز آزاد برای این هدف) بر پایهٔ عنوان گروه می‌شوند
  const loose = new Map();
  sessions.filter((s) => !linked.some((t) => t.id === s.taskId)).forEach((s) => {
    const k = s.title || 'تمرکز آزاد';
    const cur = loose.get(k) ?? { taskId: null, title: k, done: null, date: null, minutes: 0, sessions: 0 };
    cur.minutes += s.actual || 0;
    cur.sessions += 1;
    loose.set(k, cur);
  });
  const tasksOut = [...byTask, ...loose.values()].sort((a, b) => b.minutes - a.minutes);

  const dates = sessions.map((s) => s.date).sort();
  const first = dates[0] ?? null;
  const last = dates[dates.length - 1] ?? null;
  const start = goal.startDate && (!first || goal.startDate < first) ? goal.startDate : first;
  const cap = goal.targetDate || goal.deadline;
  let end = null;
  if (start) {
    end = today;
    if (cap && cap < today) end = last && last > cap ? last : cap;
    if (last && last > end) end = last;
    if (end < start) end = start;
  }

  const perDay = [];
  if (start && end) {
    const len = Math.min(diffDays(end, start), 400);
    for (let i = 0; i <= len; i += 1) {
      const d = addDays(start, i);
      const rows = sessions.filter((s) => s.date === d);
      perDay.push({ date: d, minutes: rows.length ? sumMin(rows) : null });
    }
  }
  const weeks = new Map();
  perDay.forEach((d) => {
    const w = weekStart(d.date);
    const cur = weeks.get(w) ?? { weekStart: w, minutes: 0, days: 0 };
    if (d.minutes != null) {
      cur.minutes += d.minutes;
      cur.days += 1;
    }
    weeks.set(w, cur);
  });

  return {
    totalMin: sumMin(sessions),
    sessions: sessions.length,
    activeDays: new Set(sessions.map((s) => s.date)).size,
    start,
    end,
    perDay,
    perWeek: [...weeks.values()],
    tasks: tasksOut,
    tasksDone: byTask.filter((t) => t.done).length,
    tasksTotal: byTask.length,
  };
}

// ۹۰ دقیقه → «۱ ساعت و ۳۰ دقیقه»
export function fmtDuration(min) {
  const m = Math.round(min || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${faNum(r)} دقیقه`;
  return r ? `${faNum(h)} ساعت و ${faNum(r)} دقیقه` : `${faNum(h)} ساعت`;
}
