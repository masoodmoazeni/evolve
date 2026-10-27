import { faNum } from './util.js';

export const MIN_SESSIONS = 6;
const usable = (f) => (f.outcome === 'done' || f.outcome === 'partial') && (f.actual ?? 0) >= 5 && (f.planned ?? 0) > 0;
const ratioOf = (rows) => (rows.length ? rows.reduce((a, f) => a + f.actual, 0) / rows.reduce((a, f) => a + f.planned, 0) : null);

export function estimateStats(focus) {
  const rows = focus.filter(usable);
  if (rows.length < MIN_SESSIONS) return { enough: false, n: rows.length, needed: MIN_SESSIONS - rows.length };
  const bands = [
    { key: 's', label: 'تا ۲۵ دقیقه', rows: rows.filter((f) => f.planned <= 25) },
    { key: 'm', label: '۲۶ تا ۵۰ دقیقه', rows: rows.filter((f) => f.planned > 25 && f.planned <= 50) },
    { key: 'l', label: 'بیش از ۵۰ دقیقه', rows: rows.filter((f) => f.planned > 50) },
  ].map((b) => ({ key: b.key, label: b.label, n: b.rows.length, ratio: ratioOf(b.rows) }));
  return { enough: true, n: rows.length, ratio: ratioOf(rows), bands };
}

export function estimateText(stats) {
  if (!stats.enough) return `هنوز داده کافی نیست؛ ${faNum(stats.needed)} جلسهٔ دیگر لازم است.`;
  const r = stats.ratio;
  const fa = faNum(Math.round(r * 10) / 10);
  if (r > 1.15) return `تخمین‌هایت معمولاً کمی کوتاه‌اند؛ میانگین، ${fa} برابر.`;
  if (r < 0.85) return 'معمولاً زودتر از برآوردت تمام می‌کنی.';
  return 'برآوردهایت نزدیک واقعیت است.';
}

const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

// فقط کارهای فردایی که minutes دارند؛ بدون ratio معنادار پیشنهادی نیست
export function estimateSuggestions(stats, tasksTomorrow) {
  if (!stats.enough || stats.ratio <= 1.15) return [];
  return tasksTomorrow
    .filter((t) => !t.done && Number(t.minutes) > 0)
    .map((t) => ({ task: t, to: round5(t.minutes * stats.ratio) }))
    .filter((x) => x.to > x.task.minutes);
}
