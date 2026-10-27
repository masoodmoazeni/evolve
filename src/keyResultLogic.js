import { addDays } from './util.js';
import { sessionGoalId } from './goalTime.js';

export const MAX_KR = 3;
export const MAX_COMPUTED_DAYS = 60;
export const PERIOD_DAYS = { week: 7, month: 30, '30d': 30, '60d': 60 };
export const SOURCES = [
  { key: 'manual', label: 'دستی' },
  { key: 'focusMin', label: 'از جلسه‌های تمرکز' },
  { key: 'tasksDone', label: 'از کارهای انجام‌شده' },
  { key: 'habit', label: 'از ثبت یک عادت' },
];

export const newKR = () => ({ id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, title: '', unit: '', start: 0, target: 1, current: 0, source: 'manual', period: null, doneAt: null });

export function validateKR(kr) {
  if (!kr.title?.trim()) return 'برای نتیجهٔ کلیدی یک عنوان بنویس.';
  if (!(Number(kr.target) > Number(kr.start))) return 'عدد هدف باید از نقطهٔ شروع بیشتر باشد.';
  if (kr.source !== 'manual') {
    if (!PERIOD_DAYS[kr.period]) return 'برای منبع محاسبه‌ای یک بازه (حداکثر ۶۰ روز) انتخاب کن.';
    if (PERIOD_DAYS[kr.period] > MAX_COMPUTED_DAYS) return 'بازهٔ محاسبه‌ای حداکثر ۶۰ روز است.';
    if (kr.source === 'habit' && !kr.habitId) return 'یک عادت را انتخاب کن.';
  }
  return '';
}

export const krProgress = (kr) => {
  const span = Number(kr.target) - Number(kr.start);
  return span > 0 ? Math.max(0, Math.min(1, (Number(kr.current) - Number(kr.start)) / span)) : 0;
};

// مقدار جاری منبع‌های محاسبه‌ای؛ فقط داخل بازه
export function krCurrent(kr, { goal, focus = [], tasks = [], habitLogs = [] }, today) {
  if (kr.source === 'manual') return Number(kr.current) || 0;
  const from = addDays(today, -(PERIOD_DAYS[kr.period] ?? 30) + 1);
  const inRange = (r) => r.date >= from && r.date <= today;
  if (kr.source === 'focusMin') {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const mins = focus.filter(inRange).filter((s) => sessionGoalId(s, byId) === goal.id).reduce((a, s) => a + (s.actual || 0), 0);
    return Math.round((mins / 60) * 10) / 10;
  }
  if (kr.source === 'tasksDone') return tasks.filter((t) => t.done && inRange(t) && Number(t.goalId) === goal.id).length;
  return habitLogs.filter((l) => l.habitId === Number(kr.habitId) && inRange(l) && (l.status === 'done' || l.status === 'partial')).length;
}

export const goalKrProgress = (goal) => {
  const krs = goal.keyResults ?? [];
  return krs.length ? krs.reduce((a, k) => a + krProgress(k), 0) / krs.length : 0;
};

export const krLabel = (p) => (p >= 0.7 ? 'پیشرفت خوب' : p > 0 ? 'در مسیر' : 'شروع نشده');
