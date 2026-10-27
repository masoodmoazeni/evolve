import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { OUTCOME_LABEL, dailyMinutes, summarize } from '../focusLogic.js';
import { Bars, Card, Empty, Page, Skeleton, Top } from '../ui.jsx';
import { WEEKDAYS_SHORT, addDays, dateKey, faNum, fmtDate, weekdayIdx } from '../util.js';
import { EstimateCard } from './InsightPlan.jsx';
import './Focus.css';

const NoSessions = () => (
  <Empty title="هنوز جلسه‌ای ثبت نشده" text="اولین جلسهٔ کوتاه را هر وقت خواستی شروع کن." action={<Link className="btn sm" to="/focus">شروع تمرکز</Link>} />
);

export function FocusHistory() {
  const rows = useLiveQuery(() => db.focus.orderBy('date').reverse().toArray(), []);
  if (!rows) return <Page tabs={false}><Top title="تاریخچهٔ تمرکز" back="/focus" /><Skeleton /></Page>;
  const days = [...new Set(rows.map((r) => r.date))];
  return (
    <Page tabs={false}>
      <Top title="تاریخچهٔ تمرکز" back="/focus" />
      {rows.length === 0 ? <NoSessions /> : days.map((d) => (
        <Card key={d}>
          <span className="lbl">{fmtDate(d, true)}</span>
          {rows.filter((r) => r.date === d).sort((a, b) => (b.start || '').localeCompare(a.start || '')).map((r) => (
            <div key={r.id} className="f-row">
              <div className="grow">
                <h3>{r.title}</h3>
                <span className="xs">{faNum(r.start)} · {faNum(r.actual)} از {faNum(r.planned)} دقیقه</span>
                {r.note && <p className="xs">{r.note}</p>}
              </div>
              <span className={`chip ${r.outcome === 'done' ? '' : 'sand'}`}>{OUTCOME_LABEL[r.outcome]}</span>
            </div>
          ))}
        </Card>
      ))}
    </Page>
  );
}

export function FocusStats() {
  const today = dateKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const rows = useLiveQuery(() => db.focus.where('date').between(days[0], today, true, true).toArray(), [today]);
  const all = useLiveQuery(() => db.focus.toArray(), []);
  if (!rows || !all) return <Page tabs={false}><Top title="آمار تمرکز" back="/focus" /><Skeleton /></Page>;
  const s = summarize(rows);
  const mins = dailyMinutes(rows, days);
  return (
    <Page tabs={false}>
      <Top title="آمار تمرکز" back="/focus" />
      {all.length === 0 ? <NoSessions /> : (
        <>
          <Card kind="teal">
            <span className="lbl">از داده‌های تو · ۷ روز اخیر</span>
            <Bars values={mins} label="دقیقه‌های تمرکز در هر روز" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {days.map((d) => <span key={d} className="xs">{WEEKDAYS_SHORT[weekdayIdx(d)]}</span>)}
            </div>
            <p className="xs">ستون نقطه‌چین یعنی در آن روز جلسه‌ای ثبت نشده؛ نه اینکه اتفاقی افتاده باشد.</p>
          </Card>
          <EstimateCard focus={all} />
          <div className="g2">
            <Card><span className="xs">جمع دقیقه</span><h2>{faNum(s.minutes)}</h2></Card>
            <Card><span className="xs">جلسه</span><h2>{faNum(s.count)}</h2></Card>
            <Card><span className="xs">میانگین هر جلسه</span><h2>{faNum(s.avg)} دقیقه</h2></Card>
            <Card><span className="xs">انجام‌شده</span><h2>{faNum(s.done)}</h2></Card>
          </div>
          {s.count < 3 && <p className="s">هنوز داده کافی نیست؛ با چند جلسهٔ دیگر تصویر روشن‌تر می‌شود.</p>}
        </>
      )}
    </Page>
  );
}
