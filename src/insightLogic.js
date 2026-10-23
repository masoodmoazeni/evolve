import { OBSTACLES, completionRates, dayLevel, habitsForDate } from './logic.js';
import { WEEKDAYS, addDays, faNum, weekdayIdx } from './util.js';

export const MIN_DAYS = 7;

const pct = (r) => `${faNum(Math.round(r * 100))}٪`;

// برای هر تاریخ: تعداد ثبت‌ها و سطح نقشهٔ روزها (۰ = ثبت‌نشده)
export function dayMap({ habits, habitLogs, dates }) {
  const byDate = {};
  habitLogs.forEach((l) => (byDate[l.date] ??= []).push(l));
  return dates.map((date) => {
    const logs = byDate[date] ?? [];
    const planned = habitsForDate(habits, date).length;
    const done = logs.filter((l) => l.status === 'done').length;
    const total = Math.max(planned, logs.length);
    return { date, done, total, logged: logs.length, level: logs.length === 0 || total === 0 ? 0 : dayLevel(done, total) };
  });
}

export function indicators({ days, focus = [], moods = [] }) {
  const logged = days.filter((d) => d.logged > 0).length;
  const done = days.reduce((a, d) => a + d.done, 0);
  const entries = days.reduce((a, d) => a + d.logged, 0);
  return {
    loggedDays: logged,
    totalDays: days.length,
    doneShare: entries ? done / entries : null,
    focusMinutes: focus.reduce((a, f) => a + (f.actual || 0), 0),
    focusSessions: focus.length,
    moodDays: new Set(moods.map((m) => m.date)).size,
  };
}

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function bestWeekday(days) {
  const groups = {};
  days.filter((d) => d.logged > 0).forEach((d) => {
    const g = (groups[weekdayIdx(d.date)] ??= { done: 0, logged: 0, n: 0 });
    g.done += d.done;
    g.logged += d.logged;
    g.n += 1;
  });
  const rows = Object.entries(groups).filter(([, g]) => g.n >= 2).map(([i, g]) => ({ i: Number(i), r: g.done / g.logged, n: g.n }));
  if (rows.length < 3) return null;
  rows.sort((a, b) => b.r - a.r);
  const best = rows[0];
  const worst = rows[rows.length - 1];
  if (best.r - worst.r < 0.2) return null;
  return {
    id: 'weekday',
    text: `در روزهای ${WEEKDAYS[best.i]} بیشتر ثبت «انجام‌شده» داشته‌ای (${pct(best.r)} ثبت‌ها)؛ در ${WEEKDAYS[worst.i]} کمتر (${pct(worst.r)}).`,
    source: `ثبت‌های عادت‌ها · ${faNum(rows.reduce((a, r) => a + r.n, 0))} روز`,
    correlation: false,
  };
}

function focusVsEnergy(days, focus, moods) {
  const fMin = {};
  focus.forEach((f) => (fMin[f.date] = (fMin[f.date] || 0) + (f.actual || 0)));
  const en = {};
  moods.forEach((m) => {
    if (typeof m.energy === 'number') (en[m.date] ??= []).push(m.energy);
  });
  const hi = [];
  const lo = [];
  Object.entries(en).forEach(([date, xs]) => ((fMin[date] || 0) >= 25 ? hi : lo).push(avg(xs)));
  if (hi.length < 4 || lo.length < 4) return null;
  const diff = avg(hi) - avg(lo);
  if (Math.abs(diff) < 10) return null;
  return {
    id: 'focus-energy',
    text: `در روزهایی که دست‌کم ۲۵ دقیقه تمرکز ثبت کرده‌ای، انرژی ثبت‌شده به‌طور میانگین ${faNum(Math.round(Math.abs(diff)))} واحد ${diff > 0 ? 'بیشتر' : 'کمتر'} بوده است.`,
    source: `جلسه‌های تمرکز و ثبت‌های حال · ${faNum(hi.length + lo.length)} روز`,
    correlation: true,
  };
}

function topSkipReason(habitLogs) {
  const c = {};
  habitLogs.filter((l) => l.status === 'skipped' && l.reason).forEach((l) => (c[l.reason] = (c[l.reason] || 0) + 1));
  const [reason, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!reason || n < 3) return null;
  return {
    id: 'reason',
    text: `دلیلی که بیشتر برای ردکردن عمدی نوشته‌ای: «${reason}» (${faNum(n)} بار).`,
    source: `ثبت‌های ردشده با دلیل · ${faNum(n)} ثبت`,
    correlation: false,
  };
}

export function buildInsights({ days, habitLogs = [], focus = [], moods = [] }) {
  const logged = days.filter((d) => d.logged > 0).length;
  if (logged < MIN_DAYS) return { enough: false, needed: MIN_DAYS - logged, items: [] };
  const items = [bestWeekday(days), focusVsEnergy(days, focus, moods), topSkipReason(habitLogs)].filter(Boolean);
  return { enough: true, needed: 0, items };
}

// ---------- آمار دوره: نرخ‌ها جدا، ثبت‌نشده هرگز ساکت شمرده نمی‌شود ----------

export const MIN_RECORDED = 5;
export const SLOTS = { morning: 'صبح', noon: 'ظهر', evening: 'عصر', night: 'شب' };

const slotOfHour = (h) => (h < 5 || h >= 21 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'noon' : 'evening');

// بازهٔ زمانی عادت: ساعت یادآور در اولویت، بعد زمان انتخابی؛ «هر زمان» = نامشخص
export function habitSlot(h) {
  if (h?.reminder && /^\d\d:\d\d$/.test(h.reminder)) return slotOfHour(Number(h.reminder.slice(0, 2)));
  return SLOTS[h?.timeOfDay] ? h.timeOfDay : null;
}

export function periodStats({ habits, habitLogs, dates, today }) {
  const past = dates.filter((d) => !today || d <= today);
  const scheduled = past.reduce((a, d) => a + habitsForDate(habits, d).length, 0);
  const logs = habitLogs.filter((l) => past.includes(l.date));
  const rates = completionRates(scheduled, logs);
  const minutes = logs.filter((l) => l.status !== 'skipped').reduce((a, l) => a + (Number(l.amount) || 0), 0);
  return { ...rates, minutes, hasMinutes: logs.some((l) => Number(l.amount) > 0) };
}

// دلیل‌های مانع (کلیدهای OBSTACLES) به ترتیب فراوانی
export function obstacleRanking(habitLogs) {
  const c = {};
  habitLogs.forEach((l) => {
    if (l.obstacle && OBSTACLES[l.obstacle]) c[l.obstacle] = (c[l.obstacle] || 0) + 1;
  });
  return Object.entries(c).map(([key, n]) => ({ key, label: OBSTACLES[key], n })).sort((a, b) => b.n - a.n);
}

// نرخ انجام‌شده در هر بازهٔ روز، فقط میان ثبت‌های واقعی؛ زیر ۳ ثبت ردیف نمی‌آید
export function slotStats(habits, habitLogs) {
  const slotOf = Object.fromEntries(habits.map((h) => [h.id, habitSlot(h)]));
  const g = {};
  habitLogs.forEach((l) => {
    const s = slotOf[l.habitId];
    if (!s) return;
    const x = (g[s] ??= { slot: s, label: SLOTS[s], n: 0, done: 0 });
    x.n += 1;
    if (l.status === 'done') x.done += 1;
  });
  return Object.values(g).filter((x) => x.n >= 3).map((x) => ({ ...x, rate: x.done / x.n })).sort((a, b) => b.rate - a.rate);
}

// روند دشواری: میانگین تلاش (۱ تا ۵) هر هفته؛ هفتهٔ بدون ثبت تلاش = null
export function difficultyTrend(habitLogs, weekStarts) {
  return weekStarts.map((ws) => {
    const xs = habitLogs.filter((l) => l.date >= ws && l.date <= addDays(ws, 6) && typeof l.effort === 'number').map((l) => l.effort);
    return { weekStart: ws, n: xs.length, avg: xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null };
  });
}

// روند هفتگی: برنامه‌ریزی‌شده، انجام‌شده، ثبت‌نشده در هر هفته
export function weeklyTrend({ habits, habitLogs, weekStarts, today }) {
  return weekStarts.map((ws) => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return { weekStart: ws, ...periodStats({ habits, habitLogs, dates, today }) };
  });
}

export const hasReliableData = (stats) => stats.recorded >= MIN_RECORDED;
