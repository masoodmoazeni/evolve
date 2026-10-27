import { faNum } from './util.js';
import { estimateStats, estimateSuggestions } from './estimateLogic.js';
import { peakWindow, inWindow } from './energyLogic.js';
import { capacityMin, loadState, plannedMin } from './capacityLogic.js';

// قانون‌های برنامه‌ریزی؛ پیشنهاد kind:'task' = تغییر یک کار با قبل/بعد
const taskChange = (t, rule, patch, text) => ({
  ukey: `${rule}:${t.id}:${Object.values(patch).join('-')}`,
  kind: 'task', rule, taskId: t.id, title: t.title, patch, ...text,
});

const longerEstimate = {
  id: 'longer-estimate',
  run({ focusAll = [], tasksTomorrow = [] }) {
    const stats = estimateStats(focusAll);
    return estimateSuggestions(stats, tasksTomorrow).map(({ task, to }) => taskChange(task, 'estimate', { minutes: to }, {
      observed: `از ${faNum(stats.n)} جلسهٔ ثبت‌شده، کارها معمولاً ${faNum(Math.round(stats.ratio * 10) / 10)} برابر برآوردت طول کشیده‌اند.`,
      change: `مدت «${task.title}» از ${faNum(task.minutes)} به ${faNum(to)} دقیقه برود.`,
      why: 'برآورد نزدیک به واقعیت برنامهٔ روز را سبک‌تر و قابل‌اتکاتر می‌کند.',
      tradeoff: 'جای بیشتری از ظرفیت فردا را می‌گیرد.',
      before: [`${task.title}: ${faNum(task.minutes)} دقیقه`], after: [`${task.title}: ${faNum(to)} دقیقه`],
    }));
  },
};

const heavyInPeak = {
  id: 'heavy-in-peak',
  run({ focusAll = [], tasksTomorrow = [] }) {
    const w = peakWindow(focusAll);
    if (!w.enough) return [];
    return tasksTomorrow
      .filter((t) => !t.done && t.effort === 'heavy' && !inWindow(t.time, w))
      .map((t) => taskChange(t, 'peak', { time: w.start }, {
        observed: `بیشتر جلسه‌های موفقت بین ${faNum(w.from)} تا ${faNum(w.to)} بوده (${faNum(w.count)} جلسه). این همبستگی است، نه علت.`,
        change: `«${t.title}» ساعت ${faNum(w.start)} بگذارم.`,
        why: 'کار سنگین در ساعت‌های پرانرژی‌ات شاید راحت‌تر پیش برود.',
        tradeoff: 'ممکن است با برنامهٔ دیگرت تداخل پیدا کند.',
        before: [`${t.title}: ${t.time ? faNum(t.time) : 'بدون ساعت'}`], after: [`${t.title}: ${faNum(w.start)}`],
      }));
  },
};

export const PLAN_RULES = [longerEstimate, heavyInPeak];

// اگر فردا از ظرفیت بیشتر است، کم‌اولویت‌ترین کار (غیراولویت) برای انتقال پیشنهاد می‌شود
export function overloadSuggestion(tasksTomorrow, dayPlan, rest, tomorrow) {
  const cap = capacityMin(dayPlan, tomorrow, rest);
  const open = tasksTomorrow.filter((t) => !t.done);
  const { minutes } = plannedMin(open);
  if (loadState(minutes, cap) !== 'over') return [];
  const moving = open.filter((t) => !t.priority).sort((a, b) => (b.minutes || 0) - (a.minutes || 0)).slice(0, 1);
  return moving.length ? [{ ukey: `over:${tomorrow}:${moving[0].id}`, kind: 'lighten', keep: open.filter((t) => t !== moving[0]), moving, tomorrow, overload: true }] : [];
}
