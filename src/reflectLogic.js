import { addDays, faNum } from './util.js';
import { OBSTACLES, completionRates, habitsForDate, weekDates } from './logic.js';
import { obstacleRanking } from './insightLogic.js';

// برچسب‌ها را از متن آزاد جدا می‌کند (جداکننده: ویرگول فارسی/انگلیسی یا فاصله)
export function parseTags(str = '') {
  const out = [];
  str
    .split(/[,،\s]+/)
    .map((t) => t.replace(/^#+/, '').trim())
    .forEach((t) => {
      if (t && !out.includes(t)) out.push(t);
    });
  return out;
}

export function allTags(notes) {
  const set = new Set();
  notes.forEach((n) => (n.tags ?? []).forEach((t) => set.add(t)));
  return [...set];
}

export function filterNotes(notes, query = '', tag = null) {
  const q = query.trim();
  return notes
    .filter((n) => !tag || (n.tags ?? []).includes(tag))
    .filter((n) => !q || `${n.title ?? ''} ${n.text ?? ''} ${(n.tags ?? []).join(' ')}`.includes(q))
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
}

export const noteTitle = (n) => n.title?.trim() || (n.text ?? '').trim().split('\n')[0].slice(0, 40) || 'یادداشت';

// آخرین ثبت حال هر روز در `days` روز منتهی به امروز؛ روز بی‌ثبت = null
export function moodSeries(moods, today, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1) + i);
    const rec = moods.filter((m) => m.date === date).sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))[0];
    return { date, mood: rec?.mood ?? null, energy: rec ? rec.energy : null };
  });
}

// خلاصهٔ توصیفی؛ با کمتر از ۳ ثبت صادقانه «کافی نیست»
export function moodSummary(series) {
  const rec = series.filter((s) => s.mood);
  if (rec.length < 3) return { enough: false, count: rec.length };
  const withEnergy = rec.filter((s) => typeof s.energy === 'number');
  const avgEnergy = withEnergy.length ? Math.round(withEnergy.reduce((a, s) => a + s.energy, 0) / withEnergy.length) : null;
  const counts = {};
  rec.forEach((s) => {
    counts[s.mood] = (counts[s.mood] ?? 0) + 1;
  });
  return { enough: true, count: rec.length, avgEnergy, counts };
}

// میانگین یک فیلد اختیاری (مثل focus یا stress) روی ثبت‌های دارای آن؛ زیر ۳ ثبت = null
export function optionalAvg(moods, field) {
  const xs = moods.filter((m) => typeof m[field] === 'number').map((m) => m[field]);
  return xs.length >= 3 ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
}

// تعداد «انجام‌شده» هر روز؛ روز بدون هیچ ثبتی = null (داده نیست)
export function dayValues(dates, habitLogs) {
  return dates.map((d) => {
    const logs = habitLogs.filter((l) => l.date === d);
    return logs.length ? logs.filter((l) => l.status === 'done').length : null;
  });
}

export function weekSummaryText(c) {
  const total = c.done + c.partial + c.skipped;
  if (!total) return 'این هفته ثبتی از عادت‌ها نداری. اشکالی ندارد؛ «ثبت‌نشده» یعنی داده نیست، نه کم‌کاری.';
  const parts = [`${faNum(c.done)} انجام‌شده`];
  if (c.partial) parts.push(`${faNum(c.partial)} نیمه‌کاره`);
  if (c.skipped) parts.push(`${faNum(c.skipped)} ردشدهٔ عمدی`);
  return `از ثبت‌های تو: ${parts.join('، ')}.`;
}

// کلیدهای هر مرور: تاریخ ذخیره، تاریخ قدم بعدی و روزهای بازه
export function reviewKeys(kind, today) {
  if (kind === 'week') {
    const dates = weekDates(today);
    return { date: dates[0], nextDate: addDays(dates[0], 7), dates };
  }
  return { date: today, nextDate: addDays(today, 1), dates: [today] };
}

export const REALISTIC = [
  { key: 'light', label: 'سبک بود' },
  { key: 'fit', label: 'واقع‌بینانه بود' },
  { key: 'heavy', label: 'کمی زیاد بود' },
  { key: 'tooMuch', label: 'خیلی زیاد بود' },
];

// پیش‌نویس بینش‌های مرور هفتگی؛ فقط قانون‌های ساده و قابل‌توضیح، بدون هیچ تغییری در برنامه
export function draftInsights({ habits, habitLogs, dates, today }) {
  const past = dates.filter((d) => d <= today);
  const logs = habitLogs.filter((l) => past.includes(l.date));
  const scheduled = past.reduce((a, d) => a + habitsForDate(habits, d).length, 0);
  const r = completionRates(scheduled, logs);
  if (r.recorded < 3) {
    return { enough: false, items: [], note: 'ثبت‌های این هفته برای پیش‌نویس کافی نیست؛ اشکالی ندارد، می‌توانی از حافظه‌ات بنویسی.' };
  }
  const items = [];
  items.push({ id: 'rate', source: 'ثبت‌های عادت‌ها', text: `از ${faNum(r.scheduled)} برنامه‌ریزی‌شده، ${faNum(r.recorded)} مورد ثبت شده و ${faNum(r.done)} مورد کامل انجام شده است؛ ${faNum(r.unrecorded)} مورد ثبت‌نشده (داده نیست).` });
  if (r.minDone) items.push({ id: 'min', source: 'نسخهٔ حداقل', text: `${faNum(r.minDone)} بار با نسخهٔ حداقل جلو رفتی؛ این هم قدم واقعی است و جدا از انجام کامل شمرده می‌شود.` });
  const top = obstacleRanking(logs)[0];
  if (top && top.n >= 2) items.push({ id: 'obstacle', source: 'مانع‌های ثبت‌شده', text: `مانعی که بیشتر ثبت کرده‌ای: «${OBSTACLES[top.key]}» (${faNum(top.n)} بار).` });
  const per = {};
  logs.forEach((l) => {
    const x = (per[l.habitId] ??= { n: 0, hard: 0 });
    x.n += 1;
    if (l.status === 'partial' || l.status === 'skipped') x.hard += 1;
  });
  const hard = Object.entries(per).filter(([, x]) => x.n >= 3 && x.hard / x.n >= 0.5).map(([id]) => habits.find((h) => String(h.id) === id)).filter(Boolean)[0];
  if (hard) items.push({ id: 'hard', source: 'ثبت‌های همین هفته', text: `«${hard.title}» در بیشتر ثبت‌های این هفته نیمه‌کاره یا ردشده بوده؛ شاید زمان یا اندازه‌اش را بتوان سبک‌تر کرد. تصمیمش با خودت است.` });
  const byDay = {};
  logs.filter((l) => l.status === 'done').forEach((l) => (byDay[l.date] = (byDay[l.date] || 0) + 1));
  const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] >= 2) items.push({ id: 'bestday', source: 'ثبت‌های انجام‌شده', text: `پربارترین روز تو ${faNum(best[1])} عادت انجام‌شده داشت.` });
  return { enough: true, items, note: '' };
}

export const draftsToText = (items) => items.map((i) => `• ${i.text}`).join('\n');
