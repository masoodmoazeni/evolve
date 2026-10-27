import { db } from './db.js';
import { buildGoal } from './goalUtils.js';
import { toHabitRecord } from './screens/habitLogic.js';

// نمونه‌های عمومی؛ با یک لمس اضافه می‌شوند و مثل هر مورد دیگر قابل ویرایش و حذف‌اند.
export const GOAL_EXAMPLES = [
  { key: 'read', title: 'خواندن یک کتاب', why: 'می‌خواهم هر روز کمی بیاموزم.', type: 'milestones', milestones: ['انتخاب کتاب', 'خواندن نیمهٔ اول', 'خواندن نیمهٔ دوم', 'نوشتن یک خلاصه'] },
  { key: 'weight', title: 'کاهش وزن', why: 'سبک‌تر و سرحال‌تر باشم.', type: 'weekly', target: 4 },
  { key: 'exercise', title: 'ورزش منظم', why: 'انرژی و سلامت بیشتر.', type: 'weekly', target: 3 },
  { key: 'water', title: 'نوشیدن آب کافی', why: 'بدنم به آب کافی نیاز دارد.', type: 'daily' },
];

export const HABIT_EXAMPLES = [
  { key: 'read', title: 'خواندن کتاب', amount: 15, minVersion: 'یک صفحه', timeOfDay: 'evening', cue: 'بعد از شام' },
  { key: 'water', title: 'نوشیدن آب', amount: null, minVersion: 'یک لیوان', timeOfDay: 'any', cue: 'کنار هر وعدهٔ غذایی' },
  { key: 'exercise', title: 'ورزش', amount: 30, minVersion: 'پنج دقیقه حرکت', days: [0, 2, 4], timeOfDay: 'morning', cue: 'بعد از بیدار شدن' },
  { key: 'walk', title: 'پیاده‌روی', amount: 20, minVersion: 'ده دقیقه', timeOfDay: 'any', cue: '' },
];

export async function addGoalExample(ex) {
  const form = {
    title: ex.title, why: ex.why, type: ex.type, target: ex.target ?? 3, priority: 2,
    milestones: (ex.milestones ?? []).map((t, i) => ({ id: `ex${Date.now()}${i}`, title: t, done: false, doneAt: null })),
  };
  return db.goals.add({ ...buildGoal(form), example: true });
}

export async function addHabitExample(ex) {
  const f = {
    title: ex.title, amount: ex.amount ?? '', minVersion: ex.minVersion ?? '', days: ex.days ?? [0, 1, 2, 3, 4, 5, 6],
    timeOfDay: ex.timeOfDay ?? 'any', reminder: '', goalId: '', cue: ex.cue ?? '', challengeMin: '', difficulty: '', prep: [], obstaclesNote: [],
  };
  const id = await db.habits.add({ ...toHabitRecord(f, null), example: true });
  return id;
}

// نمونه‌های «وقتی … آنگاه …» برای فرم عادت
export const IF_THEN_EXAMPLES = [
  { when: 'قهوه‌ام را ریختم', then: 'دو دقیقه مطالعه می‌کنم' },
  { when: 'نشستم سر میز کار', then: 'اول مهم‌ترین کار را باز می‌کنم' },
  { when: 'مسواک شب را زدم', then: 'یک صفحه می‌نویسم' },
];
