import { dateKey, nowTime, faNum } from './util.js';

// جلسهٔ تمرکز: زمان همیشه از اختلاف Date.now() و startedAt محاسبه می‌شود
export function startRun({ title = '', taskId = null, intent = '', planned = 25 }, now = Date.now()) {
  const d = new Date(now);
  return { startedAt: now, planned, pausedAt: null, pausedTotal: 0, endedAt: null, title, taskId, intent, date: dateKey(d), start: nowTime(d) };
}

export const elapsedMs = (run, now = Date.now()) =>
  Math.max(0, (run.endedAt ?? run.pausedAt ?? now) - run.startedAt - run.pausedTotal);

export const remainingMs = (run, now = Date.now()) => run.planned * 60000 - elapsedMs(run, now);

export const progressRatio = (run, now = Date.now()) => Math.min(1, elapsedMs(run, now) / (run.planned * 60000));

export const pauseRun = (run, now = Date.now()) => (run.pausedAt || run.endedAt ? run : { ...run, pausedAt: now });

export const resumeRun = (run, now = Date.now()) =>
  run.pausedAt ? { ...run, pausedTotal: run.pausedTotal + (now - run.pausedAt), pausedAt: null } : run;

// پایان زودهنگام همیشه مجاز است؛ اگر مکث بود، زمان مکث حساب نمی‌شود
export const finishRun = (run, now = Date.now()) => (run.endedAt ? run : { ...run, endedAt: run.pausedAt ?? now });

export const actualMinutes = (run, now = Date.now()) => Math.round(elapsedMs(run, now) / 60000);

// 00:00 با ارقام فارسی؛ شمارش معکوس به بالا گرد می‌شود
export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return faNum(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
}

// جمع دقیقهٔ هر روز؛ روز بدون جلسه null است (ثبت‌نشده، نه صفر)
export function dailyMinutes(rows, days) {
  return days.map((d) => {
    const r = rows.filter((x) => x.date === d);
    return r.length ? r.reduce((a, x) => a + (x.actual || 0), 0) : null;
  });
}

export function summarize(rows) {
  const out = { count: rows.length, minutes: 0, avg: 0, done: 0, partial: 0, skip: 0 };
  rows.forEach((r) => {
    out.minutes += r.actual || 0;
    if (out[r.outcome] != null) out[r.outcome] += 1;
  });
  out.avg = rows.length ? Math.round(out.minutes / rows.length) : 0;
  return out;
}

export const OUTCOME_LABEL = { done: 'انجام شد', partial: 'نیمه‌کاره', skip: 'کنار گذاشتم' };

// جلسهٔ رهاشده: بیش از ۶ ساعت از پایان زمانش گذشته یا بیش از ۳ ساعت در مکث مانده است
export function staleRun(run, now = Date.now()) {
  if (!run || run.endedAt) return false;
  if (run.pausedAt) return now - run.pausedAt > 3 * 3600000;
  return -remainingMs(run, now) > 6 * 3600000;
}
