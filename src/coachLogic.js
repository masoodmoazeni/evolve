import { addDays, faNum } from './util.js';
import { weekDates } from './logic.js';
import { HABIT_RULES } from './coachRules.js';

export const TONES = ['gentle', 'balanced', 'direct'];
export const DEFAULT_ACCESS = { habits: true, focus: true, mood: true, notes: false };

const say = (tone, o) => o[tone] ?? o.balanced;

const lastLogs = (logs, habitId, n = 5) =>
  logs.filter((l) => l.habitId === habitId).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);

const roundDown5 = (n) => Math.max(5, Math.floor(n / 5) * 5);

// قانون ۱: کاهش مقدار عادت وقتی در ثبت‌های اخیر دست‌کم ۲ نیمه‌کاره/ردشده باشد
export function reduceHabitRule(habits, habitLogs) {
  const out = [];
  habits.filter((h) => !h.paused && h.status !== 'archived' && h.amount > 5).forEach((h) => {
    const recent = lastLogs(habitLogs, h.id);
    if (recent.length < 3) return;
    if (recent.filter((l) => l.status === 'partial' || l.status === 'skipped').length < 2) return;
    const next = roundDown5(Math.round(h.amount * 0.7));
    if (next >= h.amount) return;
    out.push({ ukey: `reduce:${h.id}:${next}`, kind: 'reduce', habitId: h.id, title: h.title, from: h.amount, to: next });
  });
  return out;
}

// قانون ۲: سبک‌کردن برنامهٔ فردا وقتی بیش از ۳ کار باز دارد
export function lightenRule(tasksTomorrow, tomorrow) {
  const open = tasksTomorrow.filter((t) => !t.done);
  if (open.length <= 3) return [];
  const ranked = [...open].sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || a.id - b.id);
  const moving = ranked.slice(3);
  return [{ ukey: `lighten:${tomorrow}`, kind: 'lighten', keep: ranked.slice(0, 3), moving, tomorrow }];
}

export function describeSuggestion(s, tone) {
  if (s.kind === 'reduce') {
    return {
      ...s,
      text: say(tone, {
        gentle: `شاید «${s.title}» را اگر سبک‌تر کنی، راحت‌تر جا بیفتد. چه‌طور است از ${faNum(s.from)} به ${faNum(s.to)} دقیقه؟`,
        balanced: `برای «${s.title}» می‌شود مقدار را از ${faNum(s.from)} به ${faNum(s.to)} دقیقه کم کرد.`,
        direct: `مقدار «${s.title}» را به ${faNum(s.to)} دقیقه برسان.`,
      }),
      observed: `در ثبت‌های اخیر «${s.title}» چند بار نیمه‌کاره یا عمداً ردشده بوده است.`,
      change: `مقدار از ${faNum(s.from)} به ${faNum(s.to)} دقیقه کم شود.`,
      why: 'شروع سبک‌تر معمولاً ادامه دادن را راحت‌تر می‌کند.',
      tradeoff: 'زمان روزانه کمتر می‌شود؛ هر وقت آماده بودی دوباره می‌توانی بالا ببری.',
      before: [`${s.title}: ${faNum(s.from)} دقیقه`],
      after: [`${s.title}: ${faNum(s.to)} دقیقه`],
    };
  }
  if (s.kind === 'habit') {
    const lead = say(tone, { gentle: 'شاید خوب باشد که ', balanced: 'پیشنهاد: ', direct: 'پیشنهاد: ' });
    return { ...s, text: `${lead}${s.change}` };
  }
  return {
    ...s,
    text: say(tone, {
      gentle: `فردا برنامهٔ شلوغی داری. اگر بخواهی، چند کار را به «کارهای دیگر» ببریم تا فشار کمتر شود.`,
      balanced: `فردا بیش از ۳ کار داری. می‌شود ${faNum(s.moving.length)} کار را به «بدون زمان» برد.`,
      direct: `فردا فقط ۳ اولویت نگه دار و ${faNum(s.moving.length)} کار را به «بدون زمان» ببر.`,
    }),
    observed: `فردا ${faNum(s.keep.length + s.moving.length)} کار باز داری و سقف اولویت ${faNum(3)} است.`,
    change: `${faNum(s.moving.length)} کار به «بدون زمان» برود.`,
    why: 'برنامهٔ سبک‌تر احتمال انجام اولویت‌ها را بیشتر می‌کند.',
    tradeoff: 'آن کارها فردا انجام نمی‌شوند، ولی حذف نمی‌شوند و در «بدون زمان» می‌مانند.',
    before: s.keep.concat(s.moving).map((t) => `${t.title} · فردا`),
    after: s.keep.map((t) => `${t.title} · فردا`).concat(s.moving.map((t) => `${t.title} · بدون زمان`)),
  };
}

export function weeklyFacts({ habitLogs, focus, moods, notesCount, access, today }) {
  const days = new Set(weekDates(today));
  const facts = [];
  if (access.habits) {
    const wl = habitLogs.filter((l) => days.has(l.date));
    if (wl.length) {
      const c = (s) => wl.filter((l) => l.status === s).length;
      facts.push(`این هفته ${faNum(c('done'))} ثبت انجام‌شده، ${faNum(c('partial'))} نیمه‌کاره و ${faNum(c('skipped'))} ردشدهٔ عمدی ثبت کرده‌ای.`);
    }
  }
  if (access.focus) {
    const wf = focus.filter((f) => days.has(f.date));
    if (wf.length) facts.push(`${faNum(wf.length)} جلسهٔ تمرکز با مجموع ${faNum(wf.reduce((a, f) => a + (f.actual || 0), 0))} دقیقه ثبت شده است.`);
  }
  if (access.mood) {
    const wm = moods.filter((m) => days.has(m.date));
    if (wm.length) facts.push(`${faNum(wm.length)} بار حال و انرژی‌ات را ثبت کرده‌ای.`);
  }
  if (access.notes && notesCount) facts.push(`${faNum(notesCount)} یادداشت داری (متن آن‌ها خوانده نمی‌شود).`);
  return facts;
}

export function buildCoach({ habits, habitLogs, tasksTomorrow, focus, moods, notesCount = 0, suggestions, access = DEFAULT_ACCESS, tone = 'balanced', today }) {
  const acc = { ...DEFAULT_ACCESS, ...access };
  const facts = weeklyFacts({ habitLogs, focus, moods, notesCount, access: acc, today });
  const seen = new Set(suggestions.filter((s) => s.status === 'rejected' || s.status === 'accepted').map((s) => s.ukey));
  const ctx = { habits, habitLogs, tasksTomorrow, today, history: suggestions };
  // قانون‌ها به‌ترتیب اولویت؛ برای هر عادت فقط یک پیشنهاد (اولین) نگه داشته می‌شود
  const raw = acc.habits ? [...HABIT_RULES.flatMap((r) => r.run(ctx)), ...reduceHabitRule(habits, habitLogs), ...lightenRule(tasksTomorrow, addDays(today, 1))] : [];
  const taken = new Set();
  const list = raw
    .filter((s) => !seen.has(s.ukey))
    .filter((s) => {
      if (s.habitId == null) return true;
      if (taken.has(s.habitId)) return false;
      taken.add(s.habitId);
      return true;
    })
    .map((s) => describeSuggestion(s, tone));
  const interpretation = [];
  if (list.some((s) => s.kind === 'reduce')) interpretation.push('در ثبت‌های اخیر، بعضی عادت‌ها نیمه‌کاره یا عمداً ردشده‌اند؛ شاید مقدارشان کمی سنگین باشد. این فقط یک برداشت است و قطعی نیست.');
  if (list.some((s) => s.kind === 'habit')) interpretation.push('در ثبت‌هایت الگویی دیده می‌شود که شاید با یک تغییر کوچک در برنامه سبک‌تر شود. فقط یک حدس از روی داده است و تصمیم با خودت.');
  if (list.some((s) => s.kind === 'lighten')) interpretation.push('برنامهٔ فردا فشرده به نظر می‌رسد. ممکن است سبک‌کردنش کمک کند؛ قطعی نیست.');
  if (facts.length && !interpretation.length) interpretation.push('الگوی خاصی که نیاز به تغییر باشد دیده نمی‌شود. ثبت‌هایت همین‌طور ادامه پیدا کند خوب است.');
  return { enough: facts.length > 0 || list.length > 0, facts, interpretation, suggestions: list };
}
