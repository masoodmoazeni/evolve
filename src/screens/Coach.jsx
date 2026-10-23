import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { Page, Top, Card, Empty, Sheet, Skeleton, Toggle, useToast } from '../ui.jsx';
import { addDays, dateKey, weekStart } from '../util.js';
import { buildCoach, DEFAULT_ACCESS } from '../coachLogic.js';
import './Today.css';
import { applySuggestion, rejectSuggestion } from '../coachApply.js';

const ACCESS_ROWS = [
  ['habits', 'عادت‌ها و برنامه'],
  ['focus', 'جلسه‌های تمرکز'],
  ['mood', 'حال و انرژی'],
  ['notes', 'یادداشت‌ها (فقط تعداد؛ متن خوانده نمی‌شود)'],
];

const EXPLAIN = [['observed', 'چه دیدم'], ['change', 'چه تغییری'], ['why', 'چرا ممکن است کمک کند'], ['tradeoff', 'هزینه‌اش چیست']];

function Explain({ s }) {
  return (
    <dl className="explain">
      {EXPLAIN.filter(([k]) => s[k]).map(([k, label]) => (
        <div key={k}>
          <dt className="xs">{label}</dt>
          <dd className="s">{s[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Coach() {
  const today = dateKey();
  const toast = useToast();
  const [access, setAccess] = useKV('coachAccess', DEFAULT_ACCESS);
  const [prefs] = useKV('prefs', {});
  const [open, setOpen] = useState(null);

  const data = useLiveQuery(async () => {
    const wk = weekStart(today);
    const [habits, habitLogs, tasksTomorrow, focus, moods, notesCount, suggestions] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.where('date').between(addDays(today, -30), today, true, true).toArray(),
      db.tasks.where('date').equals(addDays(today, 1)).toArray(),
      db.focus.where('date').between(wk, today, true, true).toArray(),
      db.moods.where('date').between(wk, today, true, true).toArray(),
      db.notes.count(),
      db.suggestions.toArray(),
    ]);
    return { habits, habitLogs, tasksTomorrow, focus, moods, notesCount, suggestions };
  }, [today]);

  if (!data || access === undefined) return <Page><Top title="مربی" back /><Skeleton /></Page>;

  const acc = { ...DEFAULT_ACCESS, ...access };
  const coach = buildCoach({ ...data, access: acc, tone: prefs?.tone ?? 'balanced', today });

  const accept = async (s) => {
    const undo = await applySuggestion(s, today);
    setOpen(null);
    toast('پیشنهاد اعمال شد.', undo);
  };
  const dismiss = async (s) => {
    const undo = await rejectSuggestion(s, today);
    setOpen(null);
    toast('باشه، دیگر این پیشنهاد را نشان نمی‌دهم.', undo);
  };

  return (
    <Page>
      <Top title="مربی" back />
      <p className="s">مربی با چند قانون ساده و فقط روی داده‌های همین گوشی کار می‌کند. هیچ چیزی بدون تأیید تو تغییر نمی‌کند.</p>

      <Card>
        <span className="lbl">دسترسی به داده‌ها</span>
        {ACCESS_ROWS.map(([k, label]) => (
          <div className="row" key={k}>
            <span className="grow s">{label}</span>
            <Toggle on={acc[k]} label={label} onChange={(v) => setAccess({ ...acc, [k]: v })} />
          </div>
        ))}
      </Card>

      {!coach.enough && <Empty title="هنوز داده کافی نیست" text="چند روز عادت، تمرکز یا حال ثبت کن؛ بعد مربی می‌تواند خلاصه و پیشنهادی بدهد." action={<Link className="btn sm" to="/habits">رفتن به عادت‌ها</Link>} />}

      {coach.facts.length > 0 && (
        <Card kind="teal">
          <span className="lbl">بر پایهٔ ثبت‌های تو</span>
          {coach.facts.map((f) => <p key={f}>{f}</p>)}
        </Card>
      )}

      {coach.interpretation.length > 0 && (
        <Card kind="ai">
          <span className="ai-tag">تفسیر مربی · قطعی نیست</span>
          {coach.interpretation.map((t) => <p key={t} className="s">{t}</p>)}
        </Card>
      )}

      {coach.suggestions.map((s) => (
        <Card key={s.ukey} kind="ai">
          <span className="ai-tag">پیشنهاد · اعمال نشده</span>
          <p>{s.text}</p>
          <Explain s={s} />
          <div className="row">
            <button className="btn sm" onClick={() => setOpen(s)}>دیدن قبل و بعد</button>
            <button className="btn sm t" onClick={() => dismiss(s)}>الان نه</button>
          </div>
        </Card>
      ))}

      {open && (
        <Sheet title="قبل و بعد" onClose={() => setOpen(null)}>
          <Card><span className="lbl">قبل</span>{open.before.map((t) => <p key={t} className="s">{t}</p>)}</Card>
          <Card kind="ai"><span className="ai-tag">بعد · اعمال نشده</span>{open.after.map((t) => <p key={t} className="s">{t}</p>)}</Card>
          <Explain s={open} />
          <p className="xs">بعد از اعمال، تا چند ثانیه می‌توانی «بازگردانی» را بزنی.</p>
          <button className="btn" onClick={() => accept(open)}>تأیید و اعمال</button>
          <button className="btn t" onClick={() => setOpen(null)}>انصراف</button>
        </Sheet>
      )}
    </Page>
  );
}
