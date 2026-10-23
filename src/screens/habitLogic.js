import { addDays } from '../util.js';
import { MAX_PRIORITIES } from '../data.js';

export const TIME_OF_DAY = [
  { key: 'any', label: 'هر زمان' },
  { key: 'morning', label: 'صبح' },
  { key: 'noon', label: 'ظهر' },
  { key: 'evening', label: 'عصر' },
  { key: 'night', label: 'شب' },
];

export const lastDays = (today, n) => Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));

// ارتفاع ستون در نمودار؛ ثبت‌نشده = null (ستون نقطه‌چین)
const WEIGHT = { done: 100, partial: 60, skipped: 30 };
export function barValues(logs, dates) {
  const by = new Map(logs.map((l) => [l.date, l.status]));
  return dates.map((d) => WEIGHT[by.get(d)] ?? null);
}

export const DIFFICULTY = [
  { key: 1, label: 'آسان' },
  { key: 2, label: 'متوسط' },
  { key: 3, label: 'چالشی' },
];

export const emptyHabit = () => ({
  title: '', amount: '', minVersion: '', days: [0, 1, 2, 3, 4, 5, 6], timeOfDay: 'any', reminder: '', goalId: '',
  cue: '', challengeMin: '', difficulty: '', prep: [], obstaclesNote: [],
});

export function habitToForm(h) {
  return {
    title: h.title ?? '',
    amount: h.amount == null ? '' : String(h.amount),
    minVersion: h.minVersion ?? '',
    days: [...(h.days ?? [])],
    timeOfDay: h.timeOfDay ?? 'any',
    reminder: h.reminder ?? '',
    goalId: h.goalId == null ? '' : String(h.goalId),
    cue: h.cue ?? '',
    challengeMin: h.challengeMin == null ? '' : String(h.challengeMin),
    difficulty: h.difficulty ?? '',
    prep: [...(h.prep ?? [])],
    obstaclesNote: [...(h.obstaclesNote ?? [])],
  };
}

// آیا فیلدهای اختیاری فرم پر است؟ (برای باز بودن بخش «گزینه‌های بیشتر»)
export const hasExtras = (f) => !!(f.cue || f.challengeMin || f.difficulty || f.prep?.length || f.obstaclesNote?.length);

export function validateHabit(f) {
  const e = {};
  if (!f.title.trim()) e.title = 'یک نام کوتاه برای عادت بنویس.';
  if (!f.days.length) e.days = 'دست‌کم یک روز هفته را انتخاب کن.';
  if (f.amount !== '' && !(Number(f.amount) >= 0)) e.amount = 'مقدار را به‌صورت عدد بنویس.';
  if (f.challengeMin !== '' && f.challengeMin != null && !(Number(f.challengeMin) >= 0)) e.challengeMin = 'مقدار را به‌صورت عدد بنویس.';
  if (f.difficulty !== '' && f.difficulty != null && ![1, 2, 3].includes(Number(f.difficulty))) e.difficulty = 'یکی از سه سطح را انتخاب کن.';
  if (f.reminder && !/^\d\d:\d\d$/.test(f.reminder)) e.reminder = 'ساعت را مثل ۰۷:۳۰ انتخاب کن.';
  return e;
}

const cleanList = (l) => (l ?? []).map((x) => String(x).trim()).filter(Boolean);

export function toHabitRecord(f, prev) {
  return {
    ...prev,
    title: f.title.trim(),
    amount: f.amount === '' ? null : Number(f.amount),
    minVersion: f.minVersion.trim(),
    days: [...f.days].sort((a, b) => a - b),
    timeOfDay: f.timeOfDay,
    reminder: f.reminder || null,
    goalId: f.goalId === '' ? null : Number(f.goalId),
    cue: (f.cue ?? '').trim(),
    challengeMin: f.challengeMin === '' || f.challengeMin == null ? null : Number(f.challengeMin),
    difficulty: f.difficulty === '' || f.difficulty == null ? null : Number(f.difficulty),
    prep: cleanList(f.prep),
    obstaclesNote: cleanList(f.obstaclesNote),
    paused: prev?.paused ?? false,
    status: prev?.status ?? 'active',
  };
}

const FIELD_LABELS = {
  title: 'نام', amount: 'مقدار عادی', minVersion: 'نسخهٔ حداقل', challengeMin: 'نسخهٔ چالشی', days: 'روزها', timeOfDay: 'زمان روز',
  reminder: 'یادآور', goalId: 'هدف', cue: 'نشانهٔ شروع', difficulty: 'سختی', prep: 'آماده‌سازی', obstaclesNote: 'موانع',
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const blank = (v) => (v === '' || v == null || (Array.isArray(v) && v.length === 0) ? null : v);

// نام فیلدهای تغییرکرده بین دو نسخهٔ عادت (برای ثبت تاریخچه)
export function changedFields(prev, next) {
  return Object.keys(FIELD_LABELS).filter((k) => !same(blank(prev?.[k]), blank(next?.[k]))).map((k) => FIELD_LABELS[k]);
}

// خلاصهٔ متنی یک نسخهٔ قدیمی عادت
export function snapshotSummary(s) {
  return [
    s.amount ? `عادی ${s.amount} دقیقه` : '',
    s.minVersion ? `حداقل: ${s.minVersion}` : '',
    s.challengeMin ? `چالشی ${s.challengeMin} دقیقه` : '',
    s.cue ? `نشانه: ${s.cue}` : '',
  ].filter(Boolean).join(' · ');
}

// شمارش جدا: انجام عادی، نسخهٔ حداقل (هرگز انجام کامل حساب نمی‌شود)، نیمه‌کاره، ردشده
export function splitCounts(logs) {
  const c = { full: 0, minimum: 0, partial: 0, skipped: 0 };
  logs.forEach((l) => {
    if ((l.status === 'done' || l.status === 'partial') && l.usedMin) c.minimum += 1;
    else if (l.status === 'done') c.full += 1;
    else if (l.status === 'partial') c.partial += 1;
    else if (l.status === 'skipped') c.skipped += 1;
  });
  return c;
}

// فقط فیلدهای پرشدهٔ اختیاری ثبت
export function logExtra({ usedMin, effort, energy, obstacle }) {
  const x = {};
  if (usedMin) x.usedMin = true;
  if (effort) x.effort = effort;
  if (energy != null && energy !== '') x.energy = Number(energy);
  if (obstacle) x.obstacle = obstacle;
  return x;
}

export const canAddPriority = (tasks) => tasks.filter((t) => t.priority).length < MAX_PRIORITIES;

// حداکثر ۳ اولویت؛ بقیه «کارهای دیگر»
export function splitTasks(tasks) {
  const priorities = tasks.filter((t) => t.priority).slice(0, MAX_PRIORITIES);
  const set = new Set(priorities);
  return { priorities, others: tasks.filter((t) => !set.has(t)) };
}

// مقدار هر روز هفته برای نمودار: انجام‌شده + نیمی از نیمه‌کاره؛ بدون ثبت یا روز آینده = null
export function weekBarValues(logs, dates, today) {
  return dates.map((d) => {
    if (d > today) return null;
    const day = logs.filter((l) => l.date === d);
    if (!day.length) return null;
    return day.reduce((s, l) => s + (l.status === 'done' ? 1 : l.status === 'partial' ? 0.5 : 0), 0) || 0.2;
  });
}

export const greeting = (hour) => (hour < 5 ? 'شب بخیر' : hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : hour < 21 ? 'عصر بخیر' : 'شب بخیر');
