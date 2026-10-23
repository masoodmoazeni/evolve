import { addDays, dateKey, diffDays, jalali, weekdayIdx } from './util.js';
import { OBSTACLES, completionRates } from './logic.js';
import { toCSV } from './exportLogic.js';

const pad = (n) => String(n).padStart(2, '0');
// تاریخ شمسی با ارقام لاتین (مناسب Excel و تحلیل): 1405/07/29
export const jDate = (key) => {
  if (!key || key === 'someday') return '';
  const j = jalali(key);
  return `${j.y}/${pad(j.m)}/${pad(j.d)}`;
};

const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const count = (xs, f) => xs.filter(f).length;
const by = (rows, key) => {
  const m = new Map();
  rows.forEach((r) => m.set(r[key], [...(m.get(r[key]) ?? []), r]));
  return m;
};
const dates = (rows) => rows.map((r) => r.date).filter(Boolean).sort();

// تعداد روزهای برنامه‌ریزی‌شدهٔ یک عادت از شروع (تاریخ ساخت یا اولین ثبت) تا امروز
export function scheduledDays(habit, firstLog, today) {
  const ca = habit.createdAt ? (typeof habit.createdAt === 'number' ? dateKey(new Date(habit.createdAt)) : String(habit.createdAt).slice(0, 10)) : null;
  const start = ca && (!firstLog || ca < firstLog) ? ca : firstLog;
  if (!start || start > today || !(habit.days ?? []).length) return 0;
  let n = 0;
  const len = Math.min(diffDays(today, start), 400);
  for (let i = 0; i <= len; i += 1) if (habit.days.includes(weekdayIdx(addDays(start, i)))) n += 1;
  return n;
}

// رتبه‌بندی موانع گزارش‌شده در ثبت‌های ردشده/نیمه‌کاره (فقط داده‌ای که کاربر خودش ثبت کرده)
export function obstacleRanking(logs) {
  const m = new Map();
  logs.filter((l) => l.obstacle && l.status !== 'done').forEach((l) => m.set(l.obstacle, (m.get(l.obstacle) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, label: OBSTACLES[key] ?? key, count: n }));
}

// معیارهای مهارت هر هدف به‌تفکیک بعد؛ اولین و آخرین مقدار و تعداد ثبت
export function metricsByGoal(goals, metrics) {
  return goals
    .map((g) => {
      const rows = metrics.filter((x) => x.goalId === g.id);
      const dims = [...by(rows, 'dimension')].map(([dimension, list]) => {
        const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
        return { dimension, count: sorted.length, first: num(sorted[0].value), last: num(sorted[sorted.length - 1].value), lastDate: sorted[sorted.length - 1].date };
      });
      return { goalId: g.id, title: g.title, dimensions: dims };
    })
    .filter((g) => g.dimensions.length);
}

// گزارش تحلیلی فقط توصیف داده‌های ثبت‌شده است
export function buildReport(tables, now = new Date()) {
  const today = dateKey(now);
  const t = (n) => tables[n] ?? [];
  const hLogs = by(t('habitLogs'), 'habitId');
  const gLogs = by(t('goalLogs'), 'goalId');

  const habits = t('habits').map((h) => {
    const l = hLogs.get(h.id) ?? [];
    const d = dates(l);
    return {
      id: h.id, title: h.title, paused: !!h.paused, logged: l.length,
      done: count(l, (x) => x.status === 'done'), partial: count(l, (x) => x.status === 'partial'), skipped: count(l, (x) => x.status === 'skipped'),
      avgAmount: avg(l.filter((x) => x.amount != null).map((x) => num(x.amount))),
      first: d[0] ?? null, last: d[d.length - 1] ?? null,
    };
  });

  const goals = t('goals').map((g) => {
    const l = gLogs.get(g.id) ?? [];
    const ms = g.milestones ?? [];
    return {
      id: g.id, title: g.title, type: g.type, status: g.status, deadline: g.deadline ?? null,
      logged: l.length, done: count(l, (x) => x.status === 'done'),
      milestonesDone: count(ms, (m) => m.done), milestonesTotal: ms.length,
    };
  });

  const f = t('focus');
  const focus = {
    sessions: f.length,
    plannedMin: f.reduce((a, x) => a + num(x.planned), 0),
    actualMin: f.reduce((a, x) => a + num(x.actual), 0),
    done: count(f, (x) => x.outcome === 'done'), partial: count(f, (x) => x.outcome === 'partial'), skip: count(f, (x) => x.outcome === 'skip'),
    avgEnergy: avg(f.filter((x) => x.energy != null).map((x) => num(x.energy))),
  };

  const m = t('moods');
  const moods = {
    records: m.length,
    byMood: Object.fromEntries([...by(m, 'mood')].map(([k, v]) => [k, v.length])),
    avgEnergy: avg(m.filter((x) => x.energy != null).map((x) => num(x.energy))),
    factors: Object.fromEntries([...by(m.flatMap((x) => (x.factors ?? []).map((fa) => ({ fa }))), 'fa')].map(([k, v]) => [k, v.length])),
  };

  const tasks = t('tasks');

  // نرخ‌ها: ثبت‌نشده جدا شمرده می‌شود و هرگز ساکت «انجام» یا «انجام‌نشده» حساب نمی‌شود
  const logsByHabit = (id) => hLogs.get(id) ?? [];
  const scheduledTotal = t('habits').reduce((a, h) => a + scheduledDays(h, dates(logsByHabit(h.id))[0], today), 0);
  habits.forEach((h, i) => {
    const src = t('habits')[i];
    h.rates = completionRates(scheduledDays(src, h.first, today), logsByHabit(h.id));
  });
  const rates = completionRates(scheduledTotal, t('habitLogs'));
  const obstacles = obstacleRanking([...t('habitLogs'), ...t('goalLogs')]);
  const minVersion = { done: rates.minDone, ofLogs: t('habitLogs').filter((l) => l.usedMin).length };
  const revisions = { total: t('habitRevisions').length, byHabit: Object.fromEntries([...by(t('habitRevisions'), 'habitId')].map(([k, v]) => [k, v.length])) };
  const skills = metricsByGoal(goals, t('goalMetrics'));

  // ردیف روزانه (هر روزی که چیزی ثبت شده)
  const days = new Map();
  const day = (d) => {
    if (!d || d === 'someday') return null;
    if (!days.has(d)) days.set(d, { date: d, jalali: jDate(d), habitsDone: 0, habitsPartial: 0, habitsSkipped: 0, focusMin: 0, focusSessions: 0, tasksTotal: 0, tasksDone: 0, mood: '', energy: '' });
    return days.get(d);
  };
  t('habitLogs').forEach((x) => { const r = day(x.date); if (r && r[`habits${{ done: 'Done', partial: 'Partial', skipped: 'Skipped' }[x.status]}`] !== undefined) r[`habits${{ done: 'Done', partial: 'Partial', skipped: 'Skipped' }[x.status]}`] += 1; });
  f.forEach((x) => { const r = day(x.date); if (r) { r.focusMin += num(x.actual); r.focusSessions += 1; } });
  tasks.forEach((x) => { const r = day(x.date); if (r) { r.tasksTotal += 1; if (x.done) r.tasksDone += 1; } });
  [...m].sort((a, b) => num(a.ts) - num(b.ts)).forEach((x) => { const r = day(x.date); if (r) { r.mood = x.mood ?? ''; r.energy = x.energy ?? ''; } });
  const daily = [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  const all = daily.map((d) => d.date);
  return {
    generatedAt: now.toISOString(),
    range: { from: all[0] ?? null, to: all[all.length - 1] ?? null, days: daily.length },
    habits, goals, focus, moods, rates, obstacles, minVersion, revisions, skills,
    tasks: { total: tasks.length, done: count(tasks, (x) => x.done) },
    daily,
  };
}

const pct = (v) => (v == null ? '' : Math.round(v * 100));

export const dailyCSV = (r) =>
  '﻿' + toCSV(
    ['تاریخ', 'تاریخ_شمسی', 'عادت_انجام', 'عادت_نیمه', 'عادت_ردشده', 'تمرکز_دقیقه', 'جلسه_تمرکز', 'کار_کل', 'کار_انجام', 'حال', 'انرژی'],
    r.daily.map((d) => [d.date, d.jalali, d.habitsDone, d.habitsPartial, d.habitsSkipped, d.focusMin, d.focusSessions, d.tasksTotal, d.tasksDone, d.mood, d.energy])
  );

export const habitsCSV = (r) =>
  '﻿' + toCSV(
    ['عادت', 'متوقف', 'برنامه‌ریزی‌شده', 'ثبت', 'ثبت‌نشده', 'انجام', 'نیمه', 'ردشده', 'انجام_با_نسخه_حداقل', 'درصد_انجام_از_ثبت‌شده', 'درصد_انجام_از_برنامه', 'میانگین_مقدار', 'اولین_ثبت_شمسی', 'آخرین_ثبت_شمسی'],
    r.habits.map((h) => [h.title, h.paused ? 1 : 0, h.rates.scheduled, h.logged, h.rates.unrecorded, h.done, h.partial, h.skipped, h.rates.minDone, pct(h.rates.rateOfRecorded), pct(h.rates.rateOfScheduled), h.avgAmount, jDate(h.first), jDate(h.last)])
  );

export const obstaclesCSV = (r) => '\ufeff' + toCSV(['مانع', 'تعداد'], r.obstacles.map((o) => [o.label, o.count]));

export const skillsCSV = (r) =>
  '\ufeff' + toCSV(
    ['هدف', 'بعد', 'تعداد_ثبت', 'اولین_مقدار', 'آخرین_مقدار', 'آخرین_تاریخ_شمسی'],
    r.skills.flatMap((g) => g.dimensions.map((d) => [g.title, d.dimension, d.count, d.first, d.last, jDate(d.lastDate)]))
  );
