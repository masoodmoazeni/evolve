import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { buildMonth, dayBlocks, shiftMonth } from '../calendarLogic.js';
import { Card, Empty, Fab, Icon, Page, Skeleton, Top } from '../ui.jsx';
import { JMONTHS, WEEKDAYS, WEEKDAYS_SHORT, addDays, dateKey, faNum, fmtDate, weekStart } from '../util.js';
import { TaskList, TaskSheet } from './TaskUI.jsx';
import './Plan.css';

export function Calendar() {
  const nav = useNavigate();
  const today = dateKey();
  const [ref, setRef] = useState(today);
  const g = buildMonth(ref);
  const tasks = useLiveQuery(() => db.tasks.where('date').between(g.start, g.end, true, true).toArray(), [g.start, g.end]);
  const byDay = {};
  (tasks ?? []).forEach((t) => { (byDay[t.date] ??= []).push(t); });
  return (
    <Page tabs={false}>
      <Top title="تقویم" back="/plan" right={<Link className="chip" to="/calendar/week">هفته</Link>} />
      <div className="cal-head">
        <button className="ib bg" aria-label="ماه بعد" onClick={() => setRef(shiftMonth(ref, 1))}><Icon name="chevl" /></button>
        <h2>{JMONTHS[g.m - 1]} {faNum(g.y)}</h2>
        <button className="ib bg" aria-label="ماه قبل" onClick={() => setRef(shiftMonth(ref, -1))}><Icon name="chev" /></button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`تقویم ${JMONTHS[g.m - 1]}`}>
        {WEEKDAYS_SHORT.map((w, i) => <span key={w} className="wd" title={WEEKDAYS[i]}>{w}</span>)}
        {g.weeks.flat().map((c, i) =>
          c ? (
            <button
              key={c.key}
              className={`cal-day${c.key === today ? ' t' : ''}${byDay[c.key]?.some((t) => !t.done) ? ' pl' : ''}`}
              aria-label={`${fmtDate(c.key, true)}${byDay[c.key] ? `، ${faNum(byDay[c.key].length)} کار` : ''}`}
              aria-current={c.key === today ? 'date' : undefined}
              onClick={() => nav(`/calendar/day/${c.key}`)}
            >
              {faNum(c.d)}
              {byDay[c.key] ? <b /> : <span style={{ height: 6 }} />}
            </button>
          ) : (
            <span key={`g${i}`} className="cal-day gap" />
          )
        )}
      </div>
      <p className="xs">نقطهٔ پر یعنی همهٔ کارهای آن روز انجام شده؛ نقطهٔ توخالی یعنی کار برنامه‌ریزی‌شده دارد.</p>
      <button className="btn s2" onClick={() => setRef(today)}>برگشت به امروز</button>
    </Page>
  );
}

export function CalendarDay() {
  const { d } = useParams();
  const [adding, setAdding] = useState(false);
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(d).toArray(), [d]);
  const sessions = useLiveQuery(() => db.focus.where('date').equals(d).toArray(), [d]);
  if (!tasks || !sessions) return <Page tabs={false}><Top title="روز" back="/calendar" /><Skeleton /></Page>;
  const { timed } = dayBlocks(tasks, sessions);
  return (
    <Page tabs={false}>
      <Top title={fmtDate(d, true)} back="/calendar" />
      {timed.length > 0 && (
        <Card>
          <span className="lbl">خط زمانی</span>
          {timed.map((b) => (
            <div key={b.id} className="tl">
              <time>{faNum(b.time)}</time>
              <div className={`bl ${b.kind}`}>
                {b.title}
                {b.minutes && <span className="xs"> · {faNum(b.minutes)} دقیقه</span>}
              </div>
            </div>
          ))}
          <p className="xs">خط‌چین یعنی برنامه، سبز یعنی انجام‌شده، فیروزه‌ای یعنی جلسهٔ تمرکز.</p>
        </Card>
      )}
      {tasks.length === 0 && sessions.length === 0 ? (
        <Empty title="این روز خالی است" text="خالی بودن یعنی چیزی ثبت نشده؛ نه کمبود." />
      ) : (
        <TaskList tasks={tasks} />
      )}
      <Fab label="افزودن کار" onClick={() => setAdding(true)} />
      {adding && <TaskSheet date={d} onClose={() => setAdding(false)} />}
    </Page>
  );
}

export function CalendarWeek() {
  const today = dateKey();
  const [off, setOff] = useState(0);
  const start = addDays(weekStart(today), off * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const tasks = useLiveQuery(() => db.tasks.where('date').between(days[0], days[6], true, true).toArray(), [start]);
  if (!tasks) return <Page tabs={false}><Top title="نمای هفته" back="/calendar" /><Skeleton /></Page>;
  return (
    <Page tabs={false}>
      <Top title="نمای هفته" back="/calendar" />
      <div className="cal-head">
        <button className="ib bg" aria-label="هفتهٔ بعد" onClick={() => setOff(off + 1)}><Icon name="chevl" /></button>
        <h3 style={{ flex: 1, textAlign: 'center' }}>{fmtDate(days[0])} تا {fmtDate(days[6])}</h3>
        <button className="ib bg" aria-label="هفتهٔ قبل" onClick={() => setOff(off - 1)}><Icon name="chev" /></button>
      </div>
      <Card>
        {days.map((day, i) => {
          const list = tasks.filter((t) => t.date === day).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
          return (
            <Link key={day} className="wk-row" to={`/calendar/day/${day}`} aria-current={day === today ? 'date' : undefined}>
              <span className="wk-day">{WEEKDAYS[i]}<br /><span className="xs">{fmtDate(day)}</span></span>
              <span className="s grow">{list.length ? list.map((t) => t.title).join('، ') : 'چیزی ثبت نشده'}</span>
              <Icon name="chev" />
            </Link>
          );
        })}
      </Card>
    </Page>
  );
}
