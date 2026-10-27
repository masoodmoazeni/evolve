import { db } from './db.js';
import { MAX_PRIORITIES } from './data.js';
import { addDays, jalali, weekdayIdx } from './util.js';
import { isRest } from './restLogic.js';

export const RULE_TYPES = [
  { key: 'none', label: 'بدون' },
  { key: 'daily', label: 'هر روز' },
  { key: 'weekdays', label: 'روزهای هفته' },
  { key: 'weekly', label: 'هفتگی' },
  { key: 'monthly', label: 'ماهانه' },
];

const jalaliMonthLen = (key) => {
  const j = jalali(key);
  if (j.m <= 6) return 31;
  if (j.m <= 11) return 30;
  // اسفند: ۲۹ یا ۳۰؛ روز اول فروردین سال بعد را بررسی می‌کنیم
  let d = key;
  for (let i = 0; i < 31; i += 1) {
    const n = addDays(d, 1);
    if (jalali(n).m === 1) return jalali(d).d;
    d = n;
  }
  return 29;
};

// آیا قاعده در این روز (کلید میلادی) رخ می‌دهد؟ روز ماهانه شمسی است و در ماه کوتاه به آخرین روز کلمپ می‌شود
export function occursOn(rule, key) {
  if (!rule) return false;
  if (rule.type === 'daily') return true;
  if (rule.type === 'weekdays' || rule.type === 'weekly') return (rule.days ?? []).includes(weekdayIdx(key));
  if (rule.type === 'monthly') {
    const j = jalali(key);
    const target = Math.min(rule.dom ?? 1, jalaliMonthLen(key));
    return j.d === target;
  }
  return false;
}

export function ruleSummary(rule, names) {
  if (!rule || rule.type === 'none') return '';
  if (rule.type === 'daily') return 'هر روز';
  if (rule.type === 'monthly') return `هر ماه، روز ${rule.dom} (شمسی)`;
  return (rule.days ?? []).map((d) => names[d]).join(' و ');
}

// کارهای روزهای [today … today+horizon] را می‌سازد؛ idempotent
let chain = Promise.resolve();
// فراخوانی‌های هم‌زمان (شروع اپ و صفحهٔ امروز) پشت سر هم اجرا می‌شوند تا کار تکراری ساخته نشود
export function generateRecurring(today, horizon = 1, rest = []) {
  const run = chain.then(() => generate(today, horizon, rest));
  chain = run.catch(() => {});
  return run;
}

async function generate(today, horizon, rest) {
  const rules = await db.recurring.where('status').equals('active').toArray();
  let made = 0;
  for (const r of rules) {
    for (let i = 0; i <= horizon; i += 1) {
      const d = addDays(today, i);
      if (d < r.startDate || (r.endDate && d > r.endDate) || isRest(d, rest) || (r.skip ?? []).includes(d) || !occursOn(r.rule, d)) continue;
      const exists = await db.tasks.where('recurId').equals(r.id).filter((t) => t.date === d).count();
      if (exists) continue;
      const nPri = r.priority ? await db.tasks.where('date').equals(d).filter((t) => t.priority).count() : 0;
      await db.tasks.add({
        title: r.title, date: d, time: r.time ?? '', minutes: r.minutes ?? null, priority: !!r.priority && nPri < MAX_PRIORITIES,
        goalId: r.goalId ?? null, effort: r.effort ?? null, done: false, recurId: r.id,
      });
      made += 1;
    }
  }
  return made;
}

// حذف یک نمونه: روز در skip ثبت می‌شود تا دوباره ساخته نشود؛ تابع بازگردانی برمی‌گرداند
export async function skipInstance(task) {
  if (task.recurId == null) return null;
  const r = await db.recurring.get(task.recurId);
  if (!r) return null;
  await db.recurring.update(r.id, { skip: [...new Set([...(r.skip ?? []), task.date])] });
  return () => db.recurring.update(r.id, { skip: (r.skip ?? []).filter((x) => x !== task.date) });
}

export async function applyTemplate(template, date) {
  const ids = [];
  for (const it of template.items) {
    ids.push(await db.tasks.add({ title: it.title, date, time: it.time ?? '', minutes: it.minutes ?? null, priority: false, goalId: it.goalId ?? null, effort: it.effort ?? null, done: false }));
  }
  return () => db.tasks.bulkDelete(ids);
}

export async function saveDayAsTemplate(date, title) {
  const tasks = await db.tasks.where('date').equals(date).toArray();
  const items = tasks.map((t) => ({ title: t.title, time: t.time ?? '', minutes: t.minutes ?? null, priority: !!t.priority, effort: t.effort ?? null, goalId: t.goalId ?? null }));
  const id = await db.dayTemplates.add({ title: title.trim() || 'قالب من', items });
  return () => db.dayTemplates.delete(id);
}
