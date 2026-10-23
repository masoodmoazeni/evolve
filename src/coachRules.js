import { addDays, faNum } from './util.js';
import { OBSTACLES } from './logic.js';

// موتور قانون‌ها: هر قانون { id, run(ctx) } است و فهرست پیشنهادهای خام برمی‌گرداند.
// ctx = { habits, habitLogs, tasksTomorrow, today, history }
const isActive = (h) => !h.paused && h.status !== 'archived';
const logsOf = (logs, id) => logs.filter((l) => l.habitId === id).sort((a, b) => (a.date < b.date ? 1 : -1));
const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
const num = (v) => (v !== '' && v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
const obstacleCount = (logs, key) => logs.filter((l) => l.obstacle === key).length;
const recentlyAccepted = (history, prefix, today, days) =>
  history.some((s) => s.status === 'accepted' && s.ukey?.startsWith(prefix) && s.date >= addDays(today, -days));

export const TOD_ORDER = ['morning', 'noon', 'evening', 'night'];
export const TOD_LABEL = { morning: 'صبح', noon: 'ظهر', evening: 'عصر', night: 'شب', any: 'هر زمان' };
const REMINDER_BY_TOD = { morning: '08:00', noon: '13:00', evening: '18:30', night: '21:30', any: '18:00' };

// پیشنهاد بر پایهٔ تغییر فیلد عادت: patch = مقدار جدید، before/after برای نمایش
function habitChange(h, rule, patch, text) {
  return {
    ukey: `${rule}:${h.id}:${Object.values(patch).join('-')}`,
    kind: 'habit', rule, habitId: h.id, title: h.title, patch,
    ...text,
  };
}

const shorterDefault = {
  id: 'shorter-default',
  run({ habits, habitLogs }) {
    const out = [];
    habits.filter(isActive).forEach((h) => {
      const amount = num(h.amount);
      if (!amount || amount < 20) return;
      const recent = logsOf(habitLogs, h.id).slice(0, 5);
      const partials = recent.filter((l) => l.status === 'partial' && num(l.amount) != null && num(l.amount) < amount);
      if (recent.length < 4 || partials.length < 3) return;
      const typical = partials.map((l) => num(l.amount)).sort((a, b) => a - b)[Math.floor(partials.length / 2)];
      const to = Math.min(amount - 5, round5(typical));
      if (to >= amount) return;
      out.push(habitChange(h, 'shorter-default', { amount: to }, {
        observed: `در ${faNum(partials.length)} ثبت از ${faNum(recent.length)} ثبت اخیر «${h.title}» نیمه‌کاره مانده و معمولاً حدود ${faNum(typical)} دقیقه شده است.`,
        change: `مقدار پیش‌فرض از ${faNum(amount)} به ${faNum(to)} دقیقه برود.`,
        why: 'جلسه‌ای که با توان واقعی‌ات جور باشد راحت‌تر تکرار می‌شود؛ بعداً می‌توانی دوباره بالا ببری.',
        tradeoff: 'مقدار روزانه کمتر می‌شود، ولی احتمال کامل‌شدن بیشتر است.',
        before: [`${h.title}: ${faNum(amount)} دقیقه`], after: [`${h.title}: ${faNum(to)} دقیقه`],
      }));
    });
    return out;
  },
};

const betterTime = {
  id: 'better-time',
  run({ habits, habitLogs }) {
    const out = [];
    habits.filter(isActive).forEach((h) => {
      const recent = logsOf(habitLogs, h.id).slice(0, 6);
      if (recent.length < 4) return;
      const trouble = recent.filter((l) => l.status === 'skipped' && ['time', 'planning', 'energy', 'interruption'].includes(l.obstacle));
      if (trouble.length < 3) return;
      const cur = h.timeOfDay && h.timeOfDay !== 'any' ? h.timeOfDay : null;
      const next = TOD_ORDER[(TOD_ORDER.indexOf(cur ?? 'night') + (cur ? 1 : 1)) % TOD_ORDER.length];
      if (next === cur) return;
      out.push(habitChange(h, 'better-time', { timeOfDay: next }, {
        observed: `«${h.title}» در ${faNum(trouble.length)} ثبت اخیر به‌خاطر وقت، انرژی یا برنامه‌ریزی انجام نشده است.`,
        change: `زمان این عادت ${cur ? `از ${TOD_LABEL[cur]} ` : ''}به ${TOD_LABEL[next]} منتقل شود.`,
        why: 'شاید زمان فعلی با ریتم روزت جور نباشد؛ تغییر زمان گاهی بدون زور هم کار را راحت‌تر می‌کند.',
        tradeoff: 'ممکن است با برنامهٔ آن بخش از روزت تداخل پیدا کند؛ هر وقت خواستی برش می‌گردانی.',
        before: [`زمان: ${TOD_LABEL[cur ?? 'any']}`], after: [`زمان: ${TOD_LABEL[next]}`],
      }));
    });
    return out;
  },
};

const strongerCue = {
  id: 'stronger-cue',
  run({ habits, habitLogs }) {
    const out = [];
    habits.filter(isActive).forEach((h) => {
      if (h.reminder) return;
      const recent = logsOf(habitLogs, h.id).slice(0, 8);
      if (obstacleCount(recent, 'forgot') < 2) return;
      const at = REMINDER_BY_TOD[h.timeOfDay ?? 'any'] ?? REMINDER_BY_TOD.any;
      out.push(habitChange(h, 'stronger-cue', { reminder: at }, {
        observed: `در ${faNum(obstacleCount(recent, 'forgot'))} ثبت اخیر نوشته‌ای که «${h.title}» یادت رفته است.`,
        change: `یک یادآور ساعت ${faNum(at)} برای این عادت گذاشته شود.`,
        why: 'یک نشانهٔ مشخص به مغز کمک می‌کند کار را به یک لحظهٔ ثابت وصل کند.',
        tradeoff: 'یک اعلان اضافه می‌گیری (در نسخهٔ موبایل)؛ ساعتش را بعداً می‌توانی عوض کنی.',
        before: ['یادآور: ندارد'], after: [`یادآور: ${faNum(at)}`],
      }));
    });
    return out;
  },
};

const smallerMinimum = {
  id: 'smaller-minimum',
  run({ habits, habitLogs }) {
    const out = [];
    habits.filter(isActive).forEach((h) => {
      const recent = logsOf(habitLogs, h.id).slice(0, 8);
      if (obstacleCount(recent, 'time') < 2) return;
      const cur = num(h.minVersion);
      const to = cur != null ? Math.max(2, Math.round(cur / 2)) : null;
      const patch = to != null ? { minVersion: String(to) } : { minVersion: 'فقط ۵ دقیقه' };
      if (cur != null && to >= cur) return;
      if (cur == null && h.minVersion) return;
      out.push(habitChange(h, 'smaller-minimum', patch, {
        observed: `کمبود وقت در ${faNum(obstacleCount(recent, 'time'))} ثبت اخیر دلیل انجام‌ندادن «${h.title}» بوده است.`,
        change: to != null ? `نسخهٔ حداقل از ${faNum(cur)} به ${faNum(to)} دقیقه کم شود.` : 'یک نسخهٔ حداقل خیلی کوچک (۵ دقیقه) برای روزهای شلوغ تعریف شود.',
        why: 'در روزهای کم‌وقت، یک گام کوچک هنوز ادامهٔ مسیر است و رشته را نگه می‌دارد.',
        tradeoff: 'نسخهٔ حداقل جدا از نسخهٔ عادی ثبت می‌شود و جای انجام کامل را نمی‌گیرد.',
        before: [`نسخهٔ حداقل: ${h.minVersion ? h.minVersion : 'ندارد'}`], after: [`نسخهٔ حداقل: ${patch.minVersion}`],
      }));
    });
    return out;
  },
};

const gradualProgress = {
  id: 'gradual-progress',
  run({ habits, habitLogs, today, history }) {
    const out = [];
    habits.filter(isActive).forEach((h) => {
      const amount = num(h.amount);
      if (!amount || amount >= 60) return;
      if (recentlyAccepted(history, `progress:${h.id}`, today, 21)) return;
      const recent = habitLogs.filter((l) => l.habitId === h.id && l.date >= addDays(today, -21));
      if (recent.length < 8 || recent.some((l) => l.status !== 'done' || l.usedMin)) return;
      const to = amount + 5;
      out.push({
        ukey: `progress:${h.id}:${to}`, kind: 'habit', rule: 'gradual-progress', habitId: h.id, title: h.title, patch: { amount: to },
        observed: `در سه هفتهٔ اخیر «${h.title}» ${faNum(recent.length)} بار ثبت شده و همه کامل بوده است.`,
        change: `مقدار از ${faNum(amount)} به ${faNum(to)} دقیقه برود.`,
        why: 'وقتی کاری مدتی راحت پیش رفته، یک افزایش کوچک می‌تواند چالش مناسبی بدهد.',
        tradeoff: 'کمی زمان بیشتر لازم است؛ اگر سنگین شد، با «بازگردانی» برمی‌گردد.',
        before: [`${h.title}: ${faNum(amount)} دقیقه`], after: [`${h.title}: ${faNum(to)} دقیقه`],
      });
    });
    return out;
  },
};

export const HABIT_RULES = [strongerCue, betterTime, smallerMinimum, shorterDefault, gradualProgress];
export const OBSTACLE_LABEL = OBSTACLES;

// حالت «سختی»: عادت‌های برنامه‌ریزی‌شدهٔ ۳ روز گذشته که انجام/نیمه‌کاره ثبت نشده‌اند (ثبت‌نشده و ردشده هر دو «داده» هستند، نه شکست)
export function recoveryState({ habits, habitLogs, today }) {
  const days = [1, 2, 3].map((i) => addDays(today, -i));
  const wd = (key) => (new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12).getDay() + 1) % 7;
  const rows = [];
  habits.filter(isActive).forEach((h) => {
    const sched = days.filter((d) => (h.days ?? []).includes(wd(d)));
    if (sched.length < 2) return;
    const gaps = sched.filter((d) => !habitLogs.some((l) => l.habitId === h.id && l.date === d && (l.status === 'done' || l.status === 'partial')));
    if (gaps.length >= 2) rows.push({ habit: h, gaps: gaps.length, scheduled: sched.length });
  });
  rows.sort((a, b) => b.gaps - a.gaps);
  return rows[0] ?? null;
}
