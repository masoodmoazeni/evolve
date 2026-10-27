import { timeToMin } from './util.js';

export const MIN_TOTAL = 8;
export const MIN_IN_WINDOW = 2;
export const MIN_BANDS = 3;

const OUT = { done: 1, partial: 0.5, skip: 0 };
const quality = (f) => (OUT[f.outcome] ?? 0) * (f.energy != null ? f.energy / 100 : 0.7);

// بازه‌های ۲ساعتهٔ ساعت شروع؛ پنجرهٔ اوج = بیشترین میانگین کیفیت
export function peakWindow(focus) {
  const rows = focus.filter((f) => f.start && f.outcome);
  if (rows.length < MIN_TOTAL) return { enough: false, n: rows.length };
  const bands = new Map();
  rows.forEach((f) => {
    const b = Math.floor(timeToMin(f.start) / 120) * 2;
    const c = bands.get(b) ?? { from: b, sum: 0, n: 0 };
    c.sum += quality(f);
    c.n += 1;
    bands.set(b, c);
  });
  const ok = [...bands.values()].filter((c) => c.n >= MIN_IN_WINDOW);
  if (bands.size < MIN_BANDS || !ok.length) return { enough: false, n: rows.length };
  const best = ok.map((c) => ({ ...c, avg: c.sum / c.n })).sort((a, b) => b.avg - a.avg || b.n - a.n)[0];
  return { enough: true, n: rows.length, from: best.from, to: best.from + 2, count: best.n, start: `${String(best.from).padStart(2, '0')}:00` };
}

export const inWindow = (time, w) => !!time && w.enough && timeToMin(time) >= w.from * 60 && timeToMin(time) < w.to * 60;
