import { addDays, dateKey } from './util.js';
import { goalTimeStats, sessionGoalId } from './goalTime.js';
import { MOODS } from './logic.js';
import { buildReport, jDate } from './reportLogic.js';

export const DEFAULT_COACH_OPTS = { days: 30, names: false, notes: false, reviews: false, moods: true };

const HEADER = `# نقش تو / YOUR ROLE
تو یک مربی رشد شخصی، صبور و حمایت‌گر هستی. / You are a patient, supportive personal-growth coach.
در ادامه داده‌های واقعی ثبت‌شدهٔ من از اپ «اِوالو» آمده است. لطفاً بر پایهٔ همین داده‌ها مربی‌گری کن.
Below is my real self-tracked data from the app "Evolve". Please coach me based on it.

## قواعد / RULES
1. فقط بر پایهٔ داده بگو؛ اگر داده کافی نیست صادقانه بگو. / Stay grounded in the data; say so when it is insufficient.
2. «ثبت‌نشده» یعنی «داده نیست»، نه شکست. سرزنش نکن. / "Not logged" means "no data", not failure. No blame, no guilt.
3. همبستگی را علت نخوان. / Correlation is not causation.
4. لحن آرام و محترمانه؛ پاسخ را به فارسی بده مگر خلافش را بخواهم. / Calm, respectful tone; answer in Persian unless I ask otherwise.

## خروجی مطلوب / WHAT I WANT BACK
1. خلاصهٔ کوتاه از وضعیت من (۳ تا ۵ جمله). / A short summary of where I stand.
2. سه الگوی مهم در داده‌هایم، با شاهد. / Three notable patterns, with evidence.
3. زمان واقعی صرف‌شده برای هر هدف در برابر اولویتم؛ آیا هم‌راستاست؟ / Time actually spent per goal vs my priorities; is it aligned?
4. حداکثر سه قدم کوچک و مشخص برای هفتهٔ آینده. / At most three small, concrete steps for next week.
5. یک یا دو سؤال که به من کمک کند بهتر فکر کنم. / One or two questions to help me reflect.
اگر لازم است از من اطلاعات بیشتری بپرس. / Ask me for more info if needed.
`;

const STATUS = { done: 'انجام', partial: 'نیمه', skipped: 'ردشده' };
const line = (...p) => p.filter((x) => x !== '' && x != null).join(' | ');

/**
 * متن آمادهٔ تحویل به هر دستیار هوش مصنوعی: سرآیند دوزبانه + داده‌های ساخت‌یافته.
 * پیش‌فرض‌ها حریم‌دوست‌اند: بدون نام، بدون متن یادداشت و مرور.
 */
export function buildCoachExport(tables, opts = {}, now = new Date()) {
  const o = { ...DEFAULT_COACH_OPTS, ...opts };
  const t = (n) => tables[n] ?? [];
  const today = dateKey(now);
  const from = addDays(today, -(o.days - 1));
  const inRange = (r) => r.date && r.date >= from && r.date <= today;
  const focusRows = t('focus').filter(inRange);
  const allTasks = t('tasks');
  const tk = allTasks.filter(inRange);
  const report = buildReport({ ...tables, habitLogs: t('habitLogs').filter(inRange), focus: focusRows, moods: t('moods').filter(inRange), tasks: tk }, now);
  const profile = t('kv').find((k) => k.key === 'profile')?.value;
  const out = [HEADER, '# داده‌ها / DATA'];

  out.push(`بازه: ${jDate(from)} تا ${jDate(today)} (${o.days} روز؛ تاریخ‌ها شمسی، هفته از شنبه). فقط ثبت‌های خود کاربر؛ روز بدون ثبت یعنی داده نیست.`);
  if (o.names && profile?.name) out.push(`نام: ${profile.name}`);

  const goals = t('goals').filter((g) => g.status !== 'archived');
  out.push('\n## اهداف و زمان صرف‌شده / Goals & time');
  if (!goals.length) out.push('هدفی تعریف نشده.');
  goals.forEach((g, i) => {
    const s = goalTimeStats(g, focusRows, allTasks, today);
    const ms = g.milestones ?? [];
    out.push(line(`${i + 1}. ${g.title}`, `نوع: ${g.type}`, g.priority ? `اولویت: ${g.priority} از ۳ (۱=بالاترین)` : '', g.target ? `هدف هفتگی: ${g.target}` : '', g.targetDate || g.deadline ? `مهلت: ${jDate(g.targetDate || g.deadline)}` : '', `وضعیت: ${g.status}`));
    if (g.why) out.push(`   چرا مهم است: ${g.why}`);
    if (ms.length) out.push(`   نقطه‌عطف‌ها: ${ms.filter((m) => m.done).length} از ${ms.length}`);
    out.push(`   زمان تمرکز: ${s.totalMin} دقیقه در ${s.sessions} جلسه، ${s.activeDays} روز فعال`);
    if (s.perWeek.length) out.push(`   دقیقه در هر هفته: ${s.perWeek.slice(-6).map((w) => `${jDate(w.weekStart)}=${w.minutes}`).join('، ')}`);
    s.tasks.slice(0, 15).forEach((k) => out.push(`   - کار: ${k.title}${k.done === true ? ' (انجام‌شده)' : k.done === false ? ' (باز)' : ''} | ${k.minutes} دقیقه`));
    const logs = t('goalLogs').filter((l) => l.goalId === g.id && inRange(l));
    if (logs.length) out.push(`   ثبت روزانه: ${['done', 'partial', 'skipped'].map((k) => `${STATUS[k]} ${logs.filter((l) => l.status === k).length}`).join('، ')}`);
  });
  const taskById = new Map(allTasks.map((k) => [k.id, k]));
  const noGoalMin = focusRows.filter((f) => sessionGoalId(f, taskById) == null).reduce((a, f) => a + (f.actual || 0), 0);
  out.push(`زمان تمرکز بدون هدف: ${noGoalMin} دقیقه`);

  out.push('\n## عادت‌ها / Habits');
  if (!report.habits.length) out.push('عادتی تعریف نشده.');
  report.habits.forEach((h) => out.push(line(h.title, h.paused ? 'متوقف' : '', `انجام ${h.done}`, `نیمه ${h.partial}`, `ردشده ${h.skipped}`, `ثبت‌نشده ${h.rates.unrecorded}`, h.rates.rateOfRecorded != null ? `انجام از ثبت‌شده ${Math.round(h.rates.rateOfRecorded * 100)}٪` : 'داده کافی نیست')));
  if (report.obstacles.length) out.push(`موانع گزارش‌شده: ${report.obstacles.slice(0, 5).map((x) => `${x.label} (${x.count})`).join('، ')}`);

  out.push('\n## کارها / Tasks');
  out.push(`${tk.filter((x) => x.done).length} انجام‌شده از ${tk.length} کار ثبت‌شده؛ ${tk.filter((x) => x.goalId != null && x.goalId !== '').length} کار به هدف وصل است.`);

  out.push('\n## تمرکز / Focus');
  out.push(`${report.focus.sessions} جلسه، ${report.focus.actualMin} دقیقه واقعی از ${report.focus.plannedMin} دقیقه برنامه (انجام ${report.focus.done}، نیمه ${report.focus.partial}، کنار گذاشته ${report.focus.skip}).`);

  const dayRows = report.daily;
  if (dayRows.length) {
    out.push(`\n## روزها / Daily (تاریخ | عادت انجام | تمرکز دقیقه | کار انجام/کل${o.moods ? ' | حال | انرژی' : ''})`);
    dayRows.forEach((d) => out.push(line(d.jalali, d.habitsDone, d.focusMin, `${d.tasksDone}/${d.tasksTotal}`, ...(o.moods ? [MOODS[d.mood]?.label ?? '', d.energy] : []))));
  }

  // به‌جای رگهٔ تنبیهی: فقط شمار روزهای دارای ثبت، بدون قضاوت دربارهٔ روزهای خالی
  out.push(`\n## پایبندی / Consistency\n${dayRows.length} روز دارای ثبت از ${o.days} روز بازه. (رگهٔ پیاپی عمداً محاسبه نمی‌شود.)`);

  if (o.moods) {
    const m = t('moods').filter(inRange);
    out.push('\n## حال و انرژی / Mood');
    out.push(m.length < 3 ? 'داده کافی نیست.' : `${Object.entries(report.moods.byMood).map(([k, v]) => `${MOODS[k]?.label ?? k}: ${v}`).join('، ')}${report.moods.avgEnergy != null ? `؛ میانگین انرژی ${report.moods.avgEnergy} از ۱۰۰` : ''}`);
  }

  if (o.reviews) {
    const r = t('reviews').filter(inRange);
    out.push('\n## مرورها / Reflections (متن خود کاربر)');
    if (!r.length) out.push('مروری ثبت نشده.');
    r.forEach((x) => out.push(line(jDate(x.date), x.kind === 'week' ? 'هفتگی' : 'روزانه', x.good ? `خوب: ${x.good}` : '', x.hard ? `سخت: ${x.hard}` : '', x.tomorrow ? `قدم بعد: ${x.tomorrow}` : '')));
  }
  if (o.notes) {
    const n = t('notes').filter(inRange);
    out.push('\n## یادداشت‌ها / Notes (متن خود کاربر)');
    if (!n.length) out.push('یادداشتی نیست.');
    n.forEach((x) => out.push(`${jDate(x.date)}: ${x.text}`));
  }

  out.push('\n---\nاکنون بر پایهٔ همین داده‌ها شروع کن. / Now begin coaching based on this data.');
  return out.join('\n');
}
