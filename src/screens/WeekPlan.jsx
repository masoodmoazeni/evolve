import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { Card, Chip, Field, Page, Skeleton, Stepper, Top, useToast } from '../ui.jsx';
import { addDays, dateKey, faNum, fmtDate, WEEKDAYS_SHORT, weekStart } from '../util.js';
import { MAX_OUTCOMES, addOutcome, loadWeekPlan, moveTask, saveWeekPlan, suggestOutcomes, weekLoad } from '../weekPlanLogic.js';
import { fmtMinutes } from '../capacityLogic.js';

const STATE_TEXT = { free: 'جا داری', near: 'کمی پر است', over: 'پر است' };

// برنامهٔ هفتهٔ بعد: ۳ مرحلهٔ قابل‌رد (نتیجه‌ها، ظرفیت، گذاشتن کارها روی روز)
export default function WeekPlan() {
  const toast = useToast();
  const ws = addDays(weekStart(dateKey()), 7);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState(null);
  const [text, setText] = useState('');
  const [dayPlan] = useKV('dayPlan', null);
  const [rest] = useKV('rest', []);
  const goals = useLiveQuery(() => db.goals.where('status').equals('active').toArray(), [], []);
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.done && (t.date === 'someday' || (t.date >= dateKey() && t.date <= addDays(ws, 6)))).toArray(), [ws], undefined);
  useEffect(() => { loadWeekPlan(ws).then(setPlan); }, [ws]);
  if (!plan || !tasks || dayPlan === undefined || rest === undefined) return <Page tabs={false}><Top title="برنامهٔ هفتهٔ بعد" close="/today" /><Skeleton /></Page>;

  const persist = (p) => { setPlan(p); return saveWeekPlan(ws, p); };
  const add = (title, goalId = null) => { const p = addOutcome(plan, title, goalId); if (p !== plan) { persist(p); setText(''); } };
  const load = weekLoad(ws, tasks, dayPlan, rest);
  const max = Math.max(1, ...load.map((d) => Math.max(d.planned, d.capacity)));
  const pool = tasks.filter((t) => t.date === 'someday' || t.date < ws);
  const placed = tasks.filter((t) => t.date >= ws && t.date <= addDays(ws, 6)).length;
  const place = async (t, d) => toast('جابه‌جا شد.', await moveTask(t, d));
  const suggestions = suggestOutcomes(goals).filter((g) => !plan.outcomes.some((o) => o.goalId === g.id));
  const next = () => setStep(step + 1);

  return (
    <Page tabs={false}>
      <Top title="برنامهٔ هفتهٔ بعد" close="/today" right={<Stepper step={step} total={3} />} />
      <p className="s">هفتهٔ {fmtDate(ws)} تا {fmtDate(addDays(ws, 6))} · هر مرحله قابل‌رد است</p>
      {step === 1 && (
        <>
          <Card kind="mint">
            <span className="lbl">سه چیز مهم این هفته</span>
            {plan.outcomes.map((o, i) => (
              <div key={o.id} className="ob-row"><span className="chip on">{faNum(i + 1)}</span><span className="grow">{o.title}</span>
                <button className="ib bg" aria-label={`حذف ${o.title}`} onClick={() => persist({ ...plan, outcomes: plan.outcomes.filter((x) => x.id !== o.id) })}>×</button></div>
            ))}
            {plan.outcomes.length < MAX_OUTCOMES && (
              <Field label="یک نتیجه بنویس"><input className="in" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(text)} placeholder="مثلاً تمام‌کردن فصل دوم" /></Field>
            )}
            {text.trim() && <button className="btn sm" onClick={() => add(text)}>افزودن</button>}
          </Card>
          {suggestions.length > 0 && plan.outcomes.length < MAX_OUTCOMES && (
            <Card kind="ai"><span className="ai-tag">پیشنهاد از هدف‌های فعال · اعمال نشده</span>
              <div className="chips">{suggestions.map((g) => <Chip key={g.id} onClick={() => add(g.title, g.id)}>{g.title}</Chip>)}</div></Card>
          )}
        </>
      )}
      {step === 2 && (
        <Card>
          <span className="lbl">ظرفیت هفته</span>
          <div className="wk-cols" role="img" aria-label="ظرفیت و بار هر روز هفته">
            {load.map((d, i) => <div key={d.date}><b className={d.state} style={{ height: `${Math.max(2, (d.planned / max) * 100)}%` }} />{WEEKDAYS_SHORT[i]}</div>)}
          </div>
          {load.map((d, i) => <p key={d.date} className="xs">{WEEKDAYS_SHORT[i]}: {d.capacity ? `${fmtMinutes(d.planned)} از ${fmtMinutes(d.capacity)} · ${STATE_TEXT[d.state]}` : 'روز استراحت'}</p>)}
        </Card>
      )}
      {step === 3 && (
        <Card>
          <span className="lbl">کارها را روی روز بگذار</span>
          <p className="s">{faNum(placed)} کار روی هفته جا گرفته است.</p>
          {pool.length === 0 && <p className="s">کار بدون روز یا مانده‌ای نیست.</p>}
          {pool.map((t) => (
            <div key={t.id} className="col"><span>{t.title}</span>
              <div className="chips">{load.map((d, i) => <Chip key={d.date} aria-label={`گذاشتن روی ${d.date}`} onClick={() => place(t, d.date)} disabled={!d.capacity}>{WEEKDAYS_SHORT[i]}</Chip>)}</div></div>
          ))}
        </Card>
      )}
      <div className="g2">
        {step < 3 ? <><button className="btn s2" onClick={next}>رد کردن</button><button className="btn" onClick={next}>بعدی</button></> : <Link className="btn" to="/today">پایان</Link>}
      </div>
    </Page>
  );
}
