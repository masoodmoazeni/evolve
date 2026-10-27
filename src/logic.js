import { addDays, weekdayIdx, weekStart } from './util.js';
import { isRest } from './restLogic.js';
import { goalKrProgress } from './keyResultLogic.js';

export const weekDates = (today) => {
  const s = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

// عادت با «تعداد در هفته» هر روز نمایش داده می‌شود تا سهم هفته پر شود
export const habitsForDay = (habits, dayIdx) =>
  habits.filter((h) => h.status !== 'archived' && !h.paused && (h.weeklyTarget > 0 || (h.days ?? []).includes(dayIdx)));

// در روز استراحت هیچ عادتی برنامه‌ریزی‌شده نیست
export const habitsForDate = (habits, date, rest = []) => (isRest(date, rest) ? [] : habitsForDay(habits, weekdayIdx(date)));

// تعداد انجام/نیمه‌کاره در یک هفته؛ count ≥ target یعنی «این هفته کامل» (هنوز قابل‌ثبت)
export function weekCount(habitId, logs, weekStartKey) {
  const end = addDays(weekStartKey, 6);
  return logs.filter((l) => l.habitId === habitId && l.date >= weekStartKey && l.date <= end && (l.status === 'done' || l.status === 'partial')).length;
}
export const weekComplete = (habit, logs, weekStartKey) => habit.weeklyTarget > 0 && weekCount(habit.id, logs, weekStartKey) >= habit.weeklyTarget;

// پیشرفت هدف طبق قواعد CLAUDE.md؛ logs = ثبت‌های همین هفتهٔ هدف
export function goalProgress(goal, logs) {
  const done = logs.filter((l) => l.status === 'done').length;
  if (goal.type === 'milestones') {
    const ms = goal.milestones ?? [];
    const n = ms.filter((m) => m.done).length;
    return { ratio: ms.length ? n / ms.length : 0, label: `${n} از ${ms.length} نقطه‌عطف` };
  }
  if (goal.type === 'okr') {
    const r = goalKrProgress(goal);
    return { ratio: r, label: `${Math.round(r * 100)}٪ از نتایج کلیدی` };
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
