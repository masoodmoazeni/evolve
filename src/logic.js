import { addDays, weekdayIdx, weekStart } from './util.js';

export const weekDates = (today) => {
  const s = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const habitsForDay = (habits, dayIdx) =>
  habits.filter((h) => h.status !== 'archived' && !h.paused && (h.days ?? []).includes(dayIdx));

export const habitsForDate = (habits, date) => habitsForDay(habits, weekdayIdx(date));

// پیشرفت هدف طبق قواعد CLAUDE.md؛ logs = ثبت‌های همین هفتهٔ هدف
export function goalProgress(goal, logs) {
  const done = logs.filter((l) => l.status === 'done').length;
  if (goal.type === 'milestones') {
    const ms = goal.milestones ?? [];
    const n = ms.filter((m) => m.done).length;
    return { ratio: ms.length ? n / ms.length : 0, label: `${n} از ${ms.length} نقطه‌عطف` };
  }
  if (goal.type === 'weekly') {
    const t = Math.max(1, goal.target || 1);
    return { ratio: Math.min(1, done / t), label: `${done} از ${t} بار در این هفته` };
  }
  return { ratio: Math.min(1, done / 7), label: `${done} از ۷ روز این هفته` };
}

export const statusCounts = (logs) => {
  const c = { done: 0, partial: 0, skipped: 0 };
  logs.forEach((l) => {
    if (c[l.status] != null) c[l.status] += 1;
  });
  return c;
};

// خانهٔ نقشهٔ روزها: ۰ (ثبت‌نشده) تا ۴
export function dayLevel(done, total) {
  if (!total) return 0;
  const r = done / total;
  return r === 0 ? 1 : r < 0.5 ? 2 : r < 1 ? 3 : 4;
}

export const MOODS = {
  calm: { label: 'آرام', color: '#C9DACE' },
  good: { label: 'خوب', color: '#7C9885' },
  ok: { label: 'معمولی', color: '#E3EFEE' },
  tired: { label: 'خسته', color: '#F0E8D9' },
  hard: { label: 'سخت', color: '#EAE7F4' },
};

export const FACTORS = ['خواب', 'کار', 'خانواده', 'ورزش', 'تغذیه', 'ارتباطات', 'استراحت'];

export const OBSTACLES = {
  time: 'کمبود وقت',
  energy: 'انرژی کم',
  forgot: 'فراموش کردم',
  planning: 'برنامه‌ریزی ضعیف',
  interruption: 'وقفهٔ ناگهانی',
  hard: 'برایم سخت بود',
  motivation: 'انگیزه نداشتم',
  distraction: 'حواس‌پرتی محیط',
  other: 'چیز دیگر',
};

// نرخ‌ها را جدا می‌کند: «ثبت‌نشده» هرگز ساکت جزو انجام یا انجام‌نشده شمرده نمی‌شود
export function completionRates(scheduledCount, logs) {
  const done = logs.filter((l) => l.status === 'done').length;
  const partial = logs.filter((l) => l.status === 'partial').length;
  const skipped = logs.filter((l) => l.status === 'skipped').length;
  const minDone = logs.filter((l) => (l.status === 'done' || l.status === 'partial') && l.usedMin).length;
  const recorded = done + partial + skipped;
  const unrecorded = Math.max(0, scheduledCount - recorded);
  return {
    scheduled: scheduledCount, recorded, unrecorded, done, partial, skipped, minDone,
    rateOfRecorded: recorded ? done / recorded : null,
    rateOfScheduled: scheduledCount ? done / scheduledCount : null,
  };
}
