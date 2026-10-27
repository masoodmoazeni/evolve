import { addDays } from './util.js';

// داده‌های نمونه برای دیدن ویژگی‌های جدید؛ همه `demo: true` دارند و با «حذف داده‌های نمونه» پاک می‌شوند
export const DEMO_PREFIX = 'نمونه · ';
const P = (s) => `${DEMO_PREFIX}${s}`;
const BASE = 1000;
const at = (date, hm = '12:00') => new Date(`${date}T${hm}:00`).getTime();

function withIds(rows) {
  return rows.map((r, i) => ({ ...r, id: r.id ?? BASE + i + 1, demo: true }));
}

// الگوی ثبت: هر ردیف یک روز به عقب از امروز؛ null = ثبت‌نشده (رکوردی ساخته نمی‌شود)
function logs(habitId, today, pattern, partialAmount) {
  const out = [];
  pattern.forEach((st, i) => {
    if (!st) return;
    const date = addDays(today, -(pattern.length - 1 - i));
    out.push({ habitId, date, status: st, amount: st === 'done' ? null : st === 'partial' ? partialAmount : null, reason: st === 'skipped' ? 'امروز عمداً کنار گذاشتم' : '', ts: at(date, '20:00') });
  });
  return out;
}

export function buildDemo(today) {
  const d = (n) => addDays(today, n);
  const goals = withIds([
    { title: P('حرکت روزانه'), why: 'انرژی بیشتر در طول روز', type: 'daily', target: null, deadline: null, milestones: [], priority: 2, status: 'active' },
    { title: P('مطالعهٔ هفتگی'), why: 'خواندن منظم و بدون فشار', type: 'weekly', target: 4, deadline: null, milestones: [], priority: 1, status: 'active' },
    {
      title: P('راه‌اندازی یک سایت کوچک'), why: 'ساختن یک پروژهٔ شخصی', type: 'milestones', target: null, deadline: d(21), priority: 1, status: 'active',
      milestones: [
        { id: 'demo-m1', title: 'انتخاب دامنه', done: true, doneAt: at(d(-8)) },
        { id: 'demo-m2', title: 'نصب روی سرور', done: true, doneAt: at(d(-3)) },
        { id: 'demo-m3', title: 'طراحی صفحهٔ اول', done: false, doneAt: null },
        { id: 'demo-m4', title: 'انتشار', done: false, doneAt: null },
      ],
    },
  ]).map((g, i) => ({ ...g, id: BASE + i + 1, description: '', baseline: '', targetOutcome: '', startDate: null, targetDate: null, obstacles: [], metrics: [], unit: '', baselineValue: null, targetValue: null }));
  const [gMove, gRead, gSite] = goals.map((g) => g.id);

  const base = { amount: 10, minVersion: '2', days: [0, 1, 2, 3, 4, 5, 6], timeOfDay: 'any', reminder: null, goalId: null, cue: '', challengeMin: null, difficulty: null, prep: [], obstaclesNote: [], paused: false, status: 'active', afterHabitId: null, ifThen: null };
  const habits = [
    { ...base, title: P('یک لیوان آب'), amount: 2, minVersion: '1', timeOfDay: 'morning', ifThen: { when: 'از خواب بیدار شدم', then: 'یک لیوان آب می‌نوشم' } },
    { ...base, title: P('ده دقیقه مطالعه'), goalId: gRead, afterHabitId: BASE + 1, ifThen: { when: '', then: 'دو صفحه می‌خوانم' } },
    { ...base, title: P('پیاده‌روی کوتاه'), amount: 20, minVersion: '5', days: [0, 2, 4, 6], goalId: gMove, cue: 'کفش ورزشی‌ام را پوشیدم' },
  ].map((h, i) => ({ ...h, id: BASE + i + 1, demo: true }));
  const [hWater, hRead, hWalk] = habits.map((h) => h.id);

  const habitLogs = withIds([
    ...logs(hWater, today, ['done', 'done', 'done', null, 'done', 'done', 'partial', 'done', 'done', 'skipped', 'done', 'done', 'done', 'done'], 1),
    ...logs(hRead, today, ['done', null, 'done', 'partial', 'done', null, 'done', 'done', 'partial', 'done', null, 'done', 'done', 'done'], 5),
    ...logs(hWalk, today, ['done', null, 'done', null, 'partial', null, 'done', null, 'skipped', null, 'partial', null, 'partial', 'skipped'], 8),
  ]);

  const goalLogs = withIds([-6, -5, -3, -2, 0].map((n) => ({ goalId: gMove, date: d(n), status: n === -3 ? 'partial' : 'done', amount: n === -3 ? 10 : 20, reason: '', ts: at(d(n), '19:00') })));

  const tasks = withIds([
    { title: P('نوشتن طرح صفحهٔ اول سایت'), date: today, time: '10:00', minutes: 90, priority: true, goalId: gSite, done: false },
    { title: P('مرور یادداشت‌های هفته'), date: today, time: '16:30', minutes: 30, priority: true, goalId: null, done: false },
    { title: P('تماس با خانواده'), date: today, time: null, minutes: 15, priority: false, goalId: null, done: true },
    { title: P('تمیز کردن میز کار'), date: today, time: null, minutes: 20, priority: false, goalId: null, done: false },
    { title: P('خرید هفتگی'), date: d(1), time: '18:00', minutes: 60, priority: false, goalId: null, done: false },
    { title: P('ساخت فهرست مطالب مقاله'), date: d(1), time: null, minutes: 45, priority: true, goalId: gRead, done: false },
    { title: P('نوبت دندان‌پزشکی'), date: d(4), time: '11:00', minutes: 60, priority: false, goalId: null, done: false },
    { title: P('نصب افزونهٔ پشتیبان‌گیری'), date: d(-1), time: null, minutes: 40, priority: false, goalId: gSite, done: true },
    { title: P('پیاده‌سازی فرم تماس'), date: d(-2), time: '09:30', minutes: 120, priority: true, goalId: gSite, done: true },
    { title: P('مطالعهٔ فصل سوم'), date: d(-3), time: null, minutes: 45, priority: false, goalId: gRead, done: true },
    { title: P('پرداخت قبض‌ها'), date: d(-4), time: null, minutes: 15, priority: false, goalId: null, done: true },
    { title: P('ایدهٔ یک مقالهٔ کوتاه'), date: 'someday', time: null, minutes: null, priority: false, goalId: null, done: false },
    { title: P('بازدید از نمایشگاه کتاب'), date: 'someday', time: null, minutes: 120, priority: false, goalId: null, done: false },
    // صندوق ورودی (فقط نوشته شده، هنوز دسته‌بندی نشده)
    { title: P('زنگ به بیمه'), date: 'someday', time: null, minutes: null, priority: false, goalId: null, done: false, inbox: true, createdAt: at(today, '09:10') },
    { title: P('ایدهٔ رنگ‌های صفحهٔ اول'), date: 'someday', time: null, minutes: null, priority: false, goalId: null, done: false, inbox: true, createdAt: at(today, '11:40') },
    { title: P('کتابی که دوستم پیشنهاد داد'), date: 'someday', time: null, minutes: null, priority: false, goalId: null, done: false, inbox: true, fromFocus: true, createdAt: at(d(-1), '15:05') },
  ]);
  const tid = (title) => tasks.find((t) => t.title === P(title)).id;

  const f = (date, start, planned, actual, task, goalId, outcome, energy, note) => ({ date, start, planned, actual, taskId: task ? tid(task) : null, goalId, title: task ? P(task) : P('تمرکز آزاد'), intent: '', outcome, energy, note });
  const focus = withIds([
    f(d(-2), '09:35', 90, 85, 'پیاده‌سازی فرم تماس', gSite, 'done', 70, 'کار پیش رفت'),
    f(d(-2), '14:00', 25, 25, null, null, 'done', 60, ''),
    f(d(-3), '17:00', 45, 30, 'مطالعهٔ فصل سوم', gRead, 'partial', 50, 'خسته شدم'),
    f(d(-1), '10:00', 40, 40, 'نصب افزونهٔ پشتیبان‌گیری', gSite, 'done', 65, ''),
    f(d(-4), '08:15', 25, 25, null, null, 'done', 75, 'صبح خوب بود'),
    f(today, '08:30', 25, 22, null, gSite, 'done', 70, 'قبل از شروع روز'),
  ]);

  const mood = (n, mood_, energy, note) => ({ date: d(n), ts: at(d(n), '21:00'), mood: mood_, energy, factors: [], note, focus: 3, stress: 2, availMin: 120 });
  const moods = withIds([mood(-6, 'good', 70, ''), mood(-5, 'ok', 55, ''), mood(-4, 'good', 75, 'صبح پرانرژی'), mood(-3, 'tired', 35, 'کم‌خوابی'), mood(-2, 'good', 68, ''), mood(-1, 'calm', 60, ''), mood(0, 'good', 72, '')]);

  const notes = withIds([
    { date: d(-3), text: 'فکر می‌کنم صبح‌ها برای کار عمیق بهترین زمان من است.', tags: ['نمونه'], title: '', ts: at(d(-3), '22:00') },
    { date: d(-1), text: 'برای سایت بهتر است اول متن‌ها نوشته شود، بعد طراحی.', tags: ['نمونه'], title: '', ts: at(d(-1), '22:10') },
  ]);

  const reviews = withIds([
    { kind: 'day', date: d(-1), good: 'افزونه نصب شد و کار پیش رفت.', hard: 'عصر انرژی کم بود.', learned: '', keep: '', stop: '', change: '', drafts: '', realistic: '', obstacles: [], tomorrow: 'نوشتن طرح صفحهٔ اول', intent: 'کار عمیق صبح', accepted: [], ts: at(d(-1), '22:30') },
  ]);

  const kv = [{ key: `intent:${today}`, value: P('اول طرح صفحهٔ اول، بعد بقیهٔ کارها'), demo: true }];

  return { goals, habits, goalLogs, habitLogs, tasks, focus, notes, moods, reviews, kv };
}
