import { addDays, diffDays } from './util.js';

export const BREAK_DAYS = 3; // دست‌کم این‌قدر روز بدون فعالیت یعنی «وقفه»

const uniqSorted = (xs) => [...new Set(xs)].sort();

// تاریخ‌های دارای فعالیت: عادت انجام/نیمه‌کاره و جلسهٔ تمرکز (رگهٔ پشت‌سرهم معیار نیست)
export function activityDates({ habitLogs = [], focus = [] }) {
  return uniqSorted([
    ...habitLogs.filter((l) => l.status === 'done' || l.status === 'partial').map((l) => l.date),
    ...focus.filter((f) => f.outcome !== 'skip').map((f) => f.date),
  ]);
}

// بازگشت پس از وقفه: امروز/دیروز فعالیتی هست و پیش از آن دست‌کم BREAK_DAYS روز بی‌فعالیت بوده، در حالی که قبل‌تر فعالیت داشته
export function findReturn(dates, today) {
  const recent = dates.filter((d) => d >= addDays(today, -1) && d <= today);
  if (!recent.length) return null;
  const first = recent[0];
  const before = dates.filter((d) => d < first);
  if (!before.length) return null;
  const gap = diffDays(first, before[before.length - 1]) - 1;
  return gap >= BREAK_DAYS ? { date: first, gap } : null;
}

// «هفتهٔ اول تلاش»: ۵ روز فعالیت در هر بازهٔ ۷ روزه
export function hasEffortWeek(dates) {
  for (let i = 0; i < dates.length; i += 1) {
    const end = addDays(dates[i], 6);
    if (dates.filter((d) => d >= dates[i] && d <= end).length >= 5) return true;
  }
  return false;
}

// فهرست نقاط عطفِ قابل‌نمایش؛ هر کدام کلید یکتا دارد تا بعد از «دیدم» تکرار نشود
export function computeMilestones({ habitLogs, focus, today, seen = [] }) {
  const dates = activityDates({ habitLogs, focus });
  const out = [];
  const ret = findReturn(dates, today);
  if (ret) out.push({ key: `return:${ret.date}`, title: 'خوش برگشتی', text: 'بعد از یک وقفه دوباره سراغ مسیرت آمدی؛ برگشتن همان چیزی است که مهم است، نه کامل‌بودن.' });
  if (dates.length >= 1 && dates.length <= 2) out.push({ key: 'first', title: 'اولین قدم برداشته شد', text: 'اولین ثبت فعالیتت انجام شد. همین شروع کافی و ارزشمند است.' });
  if (hasEffortWeek(dates)) out.push({ key: 'week1', title: 'یک هفتهٔ تلاش', text: 'در یک هفته دست‌کم پنج روز فعالیت داشتی. این یعنی ریتمی دارد شکل می‌گیرد، نه اینکه باید بی‌وقفه ادامه بدهی.' });
  return out.filter((m) => !seen.includes(m.key));
}
