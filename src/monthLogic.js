import { db, getKV } from './db.js';
import { addDays, dateKey, jalali, diffDays } from './util.js';
import { focusByArea } from './areaLogic.js';
import { restCount } from './restLogic.js';

const pad = (n) => String(n).padStart(2, '0');
export const ymOf = (key) => { const j = jalali(key); return `${j.y}-${pad(j.m)}`; };

// اولین روز میلادیِ یک ماه شمسی 'yyyy-mm' و بازهٔ کامل آن
export function jalaliMonthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  let d = `${y + 621}-02-15`;
  for (let i = 0; i < 460; i += 1) {
    const j = jalali(d);
    if (j.y === y && j.m === m && j.d === 1) {
      let end = d;
      while (ymOf(addDays(end, 1)) === ym) end = addDays(end, 1);
      return { from: d, to: end, days: diffDays(end, d) + 1 };
    }
    d = addDays(d, 1);
  }
  return null;
}

export const prevMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; };

const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

// فقط عدد؛ هیچ عنوان یا متنی ذخیره نمی‌شود
export function buildSummary(ym, range, rows, { cutoff, rest = [], goals = [] }) {
  const inR = (r) => r.date >= range.from && r.date <= range.to;
  const focus = rows.focus.filter(inR);
  const habitLogs = rows.habitLogs.filter(inR);
  const moods = rows.moods.filter(inR);
  const dates = Array.from({ length: range.days }, (_, i) => addDays(range.from, i));
  const byArea = {};
  focusByArea(focus, goals, rows.tasks, range.to, range.days).rows.forEach((r) => { byArea[r.key] = r.minutes; });
  const covFrom = cutoff > range.from ? cutoff : range.from;
  const coverageDays = Math.max(0, Math.min(range.days, diffDays(range.to, covFrom) + 1));
  return {
    month: ym, from: range.from, to: range.to, days: range.days, coverageDays, partial: coverageDays < range.days,
    focusMin: focus.reduce((a, f) => a + (f.actual || 0), 0), sessions: focus.length,
    tasksDone: rows.tasks.filter((t) => t.done && inR(t)).length,
    habitDone: habitLogs.filter((l) => l.status === 'done').length,
    habitPartial: habitLogs.filter((l) => l.status === 'partial').length,
    habitSkipped: habitLogs.filter((l) => l.status === 'skipped').length,
    habitLoggedDays: new Set(habitLogs.map((l) => l.date)).size,
    moodAvg: null, energyAvg: avg(moods.filter((m) => m.energy != null).map((m) => m.energy)),
    reviews: rows.reviews.filter(inR).length, restDays: restCount(dates, rest), byArea, createdAt: Date.now(),
  };
}

async function loadRows() {
  const [focus, habitLogs, moods, tasks, reviews] = await Promise.all([db.focus.toArray(), db.habitLogs.toArray(), db.moods.toArray(), db.tasks.toArray(), db.reviews.toArray()]);
  return { focus, habitLogs, moods, tasks, reviews };
}

// برای هر ماه شمسیِ تمام‌شدهٔ بدون خلاصه که هنوز داده دارد، خلاصه می‌سازد؛ idempotent
export async function rollupMonths(today = dateKey()) {
  if ((await getKV('keepMonthly', true)) === false) return 0;
  const rows = await loadRows();
  const all = [...rows.focus, ...rows.habitLogs, ...rows.moods, ...rows.tasks.filter((t) => t.date !== 'someday'), ...rows.reviews].map((r) => r.date).filter(Boolean).sort();
  if (!all.length) return 0;
  const thisYm = ymOf(today);
  const have = new Set((await db.monthSummaries.toArray()).map((s) => s.month));
  const cutoff = addDays(today, -(await getKV('retention', 60)));
  const rest = (await getKV('rest', [])) ?? [];
  const goals = await db.goals.toArray();
  let made = 0;
  for (let ym = ymOf(all[0]), n = 0; ym < thisYm && n < 36; n += 1) {
    const range = jalaliMonthRange(ym);
    if (!range) break;
    if (!have.has(ym) && all.some((d) => d >= range.from && d <= range.to)) {
      await db.monthSummaries.put(buildSummary(ym, range, rows, { cutoff, rest, goals }));
      made += 1;
    }
    ym = ymOf(addDays(range.to, 1));
  }
  return made;
}

export function compareText(cur, prev) {
  if (!cur || !prev || !prev.focusMin) return '';
  const diff = Math.round(((cur.focusMin - prev.focusMin) / prev.focusMin) * 100);
  return diff === 0 ? 'تمرکز نسبت به ماه قبل تقریباً برابر بوده.' : `تمرکز ${diff > 0 ? 'بیشتر' : 'کمتر'} از ماه قبل بوده (${Math.abs(diff)}٪).`;
}
