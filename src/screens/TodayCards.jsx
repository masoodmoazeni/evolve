import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db, setKV } from '../db.js';
import { Card, Chip, Sheet, useToast } from '../ui.jsx';
import { OBSTACLES, completionRates } from '../logic.js';
import { setHabitLog } from '../data.js';
import { faNum } from '../util.js';
import { applySuggestion, rejectSuggestion } from '../coachApply.js';

const numOf = (v) => (v !== '' && v != null && !Number.isNaN(Number(v)) ? Number(v) : null);

// برآورد دقیقه‌های باقی‌ماندهٔ امروز: فقط عادت‌هایی که هنوز ثبت نشده‌اند و مقدار عددی دارند
export const remainingMinutes = (todays, logged) => todays.filter((h) => !logged.has(h.id)).reduce((a, h) => a + (numOf(h.amount) ?? 0), 0);

export function nextAction(todays, logged, tasks) {
  const habit = todays.find((h) => !logged.has(h.id));
  if (habit) return { kind: 'habit', habit };
  const task = tasks.find((t) => !t.done);
  return task ? { kind: 'task', task } : null;
}

export function NextAction({ next, remaining, onHabit }) {
  if (!next) return null;
  return (
    <Card kind="mint">
      <span className="lbl">قدم بعدی</span>
      {next.kind === 'habit' ? (
        <>
          <h3>{next.habit.title}</h3>
          {next.habit.cue && <p className="s">نشانه: {next.habit.cue}</p>}
          <button className="btn sm" onClick={() => onHabit(next.habit)}>ثبت همین حالا</button>
        </>
      ) : (
        <h3>{next.task.title}</h3>
      )}
      {remaining > 0 && <p className="xs">حدود {faNum(remaining)} دقیقه برای عادت‌های ثبت‌نشدهٔ امروز.</p>}
    </Card>
  );
}

// «ثبت‌نشده» جدا از «ردشده» نمایش داده می‌شود و هرگز شکست حساب نمی‌شود
export function DaySummary({ todays, todayLogs }) {
  if (!todays.length) return null;
  const r = completionRates(todays.length, todays.map((h) => todayLogs.get(h.id)).filter(Boolean));
  return (
    <Card>
      <span className="lbl">خلاصهٔ امروز</span>
      <p className="s">
        {faNum(r.done)} انجام‌شده · {faNum(r.partial)} نیمه‌کاره · {faNum(r.skipped)} عمداً ردشده · {faNum(r.unrecorded)} هنوز ثبت‌نشده
      </p>
      {r.minDone > 0 && <p className="xs">{faNum(r.minDone)} مورد با نسخهٔ حداقل انجام شد؛ این هم قدم واقعی است و جدا ثبت می‌شود.</p>}
    </Card>
  );
}

// روز سخت: نسخهٔ حداقل را جدا از انجام کامل ثبت می‌کند (partial + usedMin)
export function HardDay({ todays, logged, today }) {
  const toast = useToast();
  const cands = todays.filter((h) => h.minVersion && !logged.has(h.id));
  if (!cands.length) return null;
  const log = async (h) => {
    const m = numOf(h.minVersion);
    const undo = await setHabitLog(h.id, today, 'partial', { usedMin: true, amount: m });
    toast(`«${h.title}» با نسخهٔ حداقل ثبت شد.`, undo);
  };
  return (
    <Card kind="sand">
      <span className="lbl">روز سنگین‌تری است؟</span>
      <p className="s">می‌توانی فقط نسخهٔ حداقل را انجام بدهی؛ جدا از انجام کامل ثبت می‌شود و باز هم یک قدم واقعی است.</p>
      {cands.map((h) => (
        <button key={h.id} className="btn sm s2" onClick={() => log(h)}>
          {h.title}: {numOf(h.minVersion) != null ? `${faNum(h.minVersion)} دقیقه` : h.minVersion}
        </button>
      ))}
    </Card>
  );
}

export function MilestoneCard({ items, seen }) {
  if (!items.length) return null;
  const m = items[0];
  return (
    <Card kind="teal">
      <span className="lbl">{m.title}</span>
      <p className="s">{m.text}</p>
      <button className="lnk" onClick={() => setKV('milestonesSeen', [...seen, m.key])}>ممنون، دیدم</button>
    </Card>
  );
}

// کارت بازگشت: بپرس چه چیزی سخت کرد، یک تغییر کوچک یا نسخهٔ حداقل پیشنهاد بده؛ پذیرفتن/رد/ویرایش با کاربر
export function RecoveryCard({ state, suggestion, nextHabit, today, onMinimum, onResume }) {
  const toast = useToast();
  const [obstacle, setObstacle] = useState(null);
  const [sheet, setSheet] = useState(false);
  const h = state.habit;

  const pick = async (key) => {
    setObstacle(key);
    const last = await db.habitLogs.where('habitId').equals(h.id).filter((l) => l.status === 'skipped' && !l.obstacle).last();
    if (last) await db.habitLogs.update(last.id, { obstacle: key });
    else await setKV(`recovery:${h.id}:${today}`, key);
  };
  const dismiss = () => setKV(`recoveryDismiss:${today}`, true);
  const accept = async () => {
    const undo = await applySuggestion(suggestion, today);
    setSheet(false);
    toast('تغییر اعمال شد.', undo);
  };
  const reject = async () => {
    const undo = await rejectSuggestion(suggestion, today);
    setSheet(false);
    toast('باشه، این پیشنهاد دیگر نمی‌آید.', undo);
  };

  return (
    <Card kind="sand">
      <span className="lbl">برگردیم سر مسیر؛ بدون عجله</span>
      <p className="s">«{h.title}» در چند روز اخیر ثبت نشده. این فقط یک داده است، نه قضاوت. چه چیزی سخت‌ترش کرد؟</p>
      <div className="recov-chips" role="group" aria-label="دلیل سختی">
        {Object.entries(OBSTACLES).map(([k, label]) => (
          <Chip key={k} on={obstacle === k} onClick={() => pick(k)}>{label}</Chip>
        ))}
      </div>
      <div className="col">
        {h.minVersion && <button className="btn sm s2" onClick={() => onMinimum(h)}>امروز فقط نسخهٔ حداقل</button>}
        {nextHabit && <button className="btn sm s2" onClick={() => onResume(nextHabit)}>فقط قدم بعدی: {nextHabit.title}</button>}
        {suggestion && <button className="btn sm" onClick={() => setSheet(true)}>یک تغییر کوچک ببین</button>}
        <Link className="lnk" to={`/habits/${h.id}/edit`}>خودم ویرایشش می‌کنم</Link>
        <button className="lnk" onClick={dismiss}>الان نه</button>
      </div>
      {sheet && suggestion && (
        <Sheet title="تغییر پیشنهادی" onClose={() => setSheet(false)}>
          <Card kind="ai"><span className="ai-tag">پیشنهاد · اعمال نشده</span><p>{suggestion.text}</p><p className="s">{suggestion.why}</p><p className="xs">{suggestion.tradeoff}</p></Card>
          <button className="btn" onClick={accept}>تأیید و اعمال</button>
          <button className="btn s2" onClick={reject}>رد، دیگر نشان نده</button>
          <button className="btn t" onClick={() => setSheet(false)}>انصراف</button>
        </Sheet>
      )}
    </Card>
  );
}
