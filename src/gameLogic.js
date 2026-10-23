import { addDays, weekStart } from './util.js';

// منطق خالص امتیاز و سطح؛ همه‌چیز از ثبت‌های موجود محاسبه می‌شود و فقط روزهای قدیمی در «بانک» جمع می‌شوند
export const DEFAULT_GAME = { enabled: true, capMin: 240 };
export const FOLD_AFTER_DAYS = 14;
export const LEVEL_NAMES = ['جوانه', 'نهال', 'ساقه', 'برگ', 'شاخه', 'درخت'];
export const QUEST_FOCUS_MIN = 20;
export const CHEST_XP = 15;
export const EMPTY_TOTALS = { xp: 0, focusMin: 0, sessions: 0, morning: 0, tasksDone: 0, habitDone: 0, reviews: 0 };

const ok = (l) => l.status === 'done' || l.status === 'partial';

export function sumTotals(a, b) {
  const out = { ...EMPTY_TOTALS };
  Object.keys(out).forEach((k) => { out[k] = (a?.[k] || 0) + (b?.[k] || 0); });
  return out;
}

// فعالیت هر روز: دقیقهٔ تمرکز، کار انجام‌شده، عادت یا یادداشت
export function dayStats(rows, date) {
  const f = (rows.focus || []).filter((x) => x.date === date);
  const focusMin = f.reduce((a, x) => a + (x.actual || 0), 0);
  const tasksDone = (rows.tasks || []).filter((x) => x.date === date && x.done).length;
  const habitDone = (rows.habitLogs || []).filter((x) => x.date === date && ok(x)).length;
  const notes = (rows.notes || []).filter((x) => x.date === date).length;
  const reviews = (rows.reviews || []).filter((x) => x.date === date).length;
  return { focusMin, sessions: f.length, morning: f.filter((x) => x.start && x.start < '09:00').length, tasksDone, habitDone, notes, reviews };
}

export const activeDay = (s) => s.focusMin > 0 || s.tasksDone > 0 || s.habitDone > 0 || s.notes > 0 || s.reviews > 0;

export function questsFor(s, light = false) {
  if (light) return [{ id: 'light', title: 'یک قدم کوچک: یک کار، یک عادت یا ۱۰ دقیقه تمرکز', done: s.tasksDone > 0 || s.habitDone > 0 || s.focusMin >= 10 }];
  return [
    { id: 'focus', title: `${String(QUEST_FOCUS_MIN).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])} دقیقه تمرکز`, done: s.focusMin >= QUEST_FOCUS_MIN },
    { id: 'task', title: 'یک کار از لیست امروز را تمام کن', done: s.tasksDone > 0 },
    { id: 'habit', title: 'یک عادت یا یادداشت ثبت کن', done: s.habitDone > 0 || s.notes > 0 },
  ];
}

// جمع امتیاز و شمارنده‌ها برای هر روزی که در rows دارد
export function totalsForRows(rows, capMin = DEFAULT_GAME.capMin) {
  const dates = new Set();
  ['focus', 'tasks', 'habitLogs', 'notes', 'reviews', 'moods'].forEach((k) => (rows[k] || []).forEach((x) => x.date && dates.add(x.date)));
  const t = { ...EMPTY_TOTALS };
  dates.forEach((d) => {
    const s = dayStats(rows, d);
    const counted = Math.min(s.focusMin, capMin);
    const moods = (rows.moods || []).filter((x) => x.date === d).length;
    t.xp += Math.floor(counted / 5) * 2 + s.tasksDone * 10 + s.habitDone * 5 + s.notes * 3 + s.reviews * 10 + Math.min(moods, 1) * 2;
    if (questsFor(s).every((q) => q.done)) t.xp += CHEST_XP;
    t.focusMin += s.focusMin;
    t.sessions += s.sessions;
    t.morning += s.morning;
    t.tasksDone += s.tasksDone;
    t.habitDone += s.habitDone;
    t.reviews += s.reviews;
  });
  return t;
}

// سطح n از 50·n·(n−1) امتیاز شروع می‌شود: ۰، ۱۰۰، ۳۰۰، ۶۰۰ ...
export function levelInfo(xp) {
  let level = 1;
  while (xp >= 50 * (level + 1) * level) level += 1;
  const from = 50 * level * (level - 1);
  const to = 50 * (level + 1) * level;
  return { level, name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)], xp, into: xp - from, need: to - from, ratio: (xp - from) / (to - from) };
}

// روزهای فعال در ۷ روز اخیر (بدون شکستن زنجیره)
export function activeDaysLast7(rows, today) {
  let n = 0;
  for (let i = 0; i < 7; i += 1) if (activeDay(dayStats(rows, addDays(today, -i)))) n += 1;
  return n;
}

// برگشتن: فعالیت بعد از وقفهٔ حداقل ۳ روزه
export function hasComeback(rows, today, span = 60) {
  const days = [];
  for (let i = span; i >= 0; i -= 1) days.push(activeDay(dayStats(rows, addDays(today, -i))));
  let gap = 0;
  let seen = false;
  for (const a of days) {
    if (a) { if (seen && gap >= 3) return true; seen = true; gap = 0; } else gap += 1;
  }
  return false;
}

export const BADGES = [
  { id: 'first', title: 'اولین جلسه', text: 'اولین جلسهٔ تمرکز را ثبت کردی.', test: (t) => t.sessions >= 1 },
  { id: 'f10', title: '۱۰ ساعت تمرکز', text: 'مجموع تمرکز به ۱۰ ساعت رسید.', test: (t) => t.focusMin >= 600 },
  { id: 'f100', title: '۱۰۰ ساعت تمرکز', text: 'مجموع تمرکز به ۱۰۰ ساعت رسید.', test: (t) => t.focusMin >= 6000 },
  { id: 'early', title: 'سحرخیز', text: '۵ جلسهٔ تمرکز پیش از ساعت ۹ صبح.', test: (t) => t.morning >= 5 },
  { id: 'tasks', title: 'کارراه‌انداز', text: '۲۵ کار را تمام کردی.', test: (t) => t.tasksDone >= 25 },
  { id: 'habits', title: 'عادت‌ساز', text: '۵۰ بار عادت ثبت کردی.', test: (t) => t.habitDone >= 50 },
  { id: 'review', title: 'مرورکننده', text: '۷ مرور ثبت کردی.', test: (t) => t.reviews >= 7 },
  { id: 'back', title: 'برگشتن', text: 'بعد از چند روز وقفه برگشتی؛ همین ارزشمند است.', test: (t, x) => x.comeback },
];

export const earnedBadges = (totals, extra) => BADGES.filter((b) => b.test(totals, extra)).map((b) => b.id);

// چالش هفته: ۱۰٪ بالاتر از میانگین ۴ هفتهٔ پیش، گرد به ۳۰ دقیقه (حداقل ۶۰، پیش‌فرض ۱۵۰)
export function weeklyChallenge(rows, today) {
  const ws = weekStart(today);
  const minutes = (from) => {
    let m = 0;
    for (let i = 0; i < 7; i += 1) m += dayStats(rows, addDays(from, i)).focusMin;
    return m;
  };
  const prev = [1, 2, 3, 4].map((i) => minutes(addDays(ws, -7 * i)));
  const avg = prev.reduce((a, b) => a + b, 0) / 4;
  const target = avg > 0 ? Math.min(1500, Math.max(60, Math.round((avg * 1.1) / 30) * 30)) : 150;
  return { target, done: minutes(ws), hasHistory: avg > 0 };
}

// دقیقهٔ تمرکز امروز که از سقف روزانه گذشته است
export const overCap = (focusMin, capMin) => focusMin > capMin;
